const axios = require('axios');
const prisma = require('../lib/prisma');

class UairangoService {
    /**
     * URL Base da API do UaiRango
     */
    baseUrl = 'https://www.uairango.com/developer/api';

    /**
     * Obtém o token Bearer usando o token de desenvolvedor do restaurante
     */
    async getAccessToken(restaurantId) {
        const settings = await prisma.integrationSettings.findUnique({
            where: { restaurantId }
        });

        if (!settings || !settings.uairangoToken) {
            throw new Error('Configurações do UaiRango não encontradas ou Token ausente.');
        }

        try {
            const response = await axios.post(`${this.baseUrl}/login`, {
                token: settings.uairangoToken
            });

            if (response.data && response.data.success) {
                return response.data.token;
            } else {
                throw new Error(response.data.message || 'Erro ao obter token do UaiRango.');
            }
        } catch (error) {
            console.error(`[UAIRANGO] Erro na autenticação (Restaurante ${restaurantId}):`, error.response?.data || error.message);
            throw new Error('Falha na autenticação com o UaiRango.');
        }
    }

    /**
     * Importa o cardápio completo do UaiRango
     */
    async importMenu(restaurantId) {
        const settings = await prisma.integrationSettings.findUnique({
            where: { restaurantId }
        });

        if (!settings || !settings.uairangoEstablishmentId) {
            throw new Error('ID do Estabelecimento UaiRango não configurado.');
        }

        const token = await this.getAccessToken(restaurantId);
        const establishmentId = settings.uairangoEstablishmentId;

        try {
            console.log(`[UAIRANGO] Iniciando importação para o restaurante ${restaurantId}...`);
            
            // 1. Busca o cardápio completo
            const response = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const categoriesUai = response.data; // Array de categorias com produtos dentro
            let importedCount = 0;

            for (const catUai of categoriesUai) {
                // 2. Processa a Categoria
                const category = await prisma.category.upsert({
                    where: { 
                        name_restaurantId: { 
                            name: catUai.nome, 
                            restaurantId 
                        } 
                    },
                    update: {
                        description: catUai.descricao,
                        saiposIntegrationCode: catUai.cod_externo || catUai.id_categoria.toString(),
                        cuisineType: catUai.nome.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral'
                    },
                    create: {
                        name: catUai.nome,
                        description: catUai.descricao,
                        restaurantId,
                        saiposIntegrationCode: catUai.cod_externo || catUai.id_categoria.toString(),
                        cuisineType: catUai.nome.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral'
                    }
                });

                // Lógica Especial para Pizzas/Esfihas/Sabores
                const isFlavorCategory = catUai.nome.toLowerCase().includes('pizza') || 
                                       catUai.nome.toLowerCase().includes('esfiha') ||
                                       catUai.nome.toLowerCase().includes('sabor');

                if (isFlavorCategory) {
                    await this.processFlavorCategory(restaurantId, category, catUai.opcoes);
                    importedCount += catUai.opcoes.length;
                } else {
                    // Processamento Normal de Produtos
                    for (const prodUai of catUai.opcoes) {
                        await this.processNormalProduct(restaurantId, category.id, prodUai);
                        importedCount++;
                    }
                }
            }

            // Atualiza data da última importação
            await prisma.integrationSettings.update({
                where: { restaurantId },
                data: { uairangoImportedAt: new Date() }
            });

            return { success: true, importedCount };
        } catch (error) {
            console.error(`[UAIRANGO] Erro na importação:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Processa categorias de sabores (Pizzas) transformando itens em Adicionais
     */
    async processFlavorCategory(restaurantId, category, optionsUai) {
        // 1. Garante que existe um Produto Base (Container) para essa categoria
        // Ex: "Pizza Grande" ou usa o nome da própria categoria
        const productName = category.name; 
        
        const productBase = await prisma.product.upsert({
            where: { name_restaurantId: { name: productName, restaurantId } },
            update: { isFlavor: false, showInMenu: true },
            create: {
                name: productName,
                price: 0, // Preço será definido pelos sabores (regra de maior valor)
                restaurantId,
                isFlavor: false,
                showInMenu: true,
                categories: { connect: { id: category.id } }
            }
        });

        // 2. Garante que existe um Grupo de Adicionais (Sabores) para este produto
        const flavorGroup = await prisma.addonGroup.upsert({
            where: { id: `flavor_group_${category.id}` }, // ID determinístico para evitar duplos
            update: {
                name: `Sabores ${category.name}`,
                isFlavorGroup: true,
                priceRule: 'higher',
                minQuantity: 1,
                maxQuantity: 4
            },
            create: {
                id: `flavor_group_${category.id}`,
                name: `Sabores ${category.name}`,
                restaurantId,
                isFlavorGroup: true,
                priceRule: 'higher',
                minQuantity: 1,
                maxQuantity: 4,
                products: { connect: { id: productBase.id } }
            }
        });

        // 3. Transforma cada "Opção" do UaiRango em um Adicional (Sabor)
        for (const optUai of optionsUai) {
            await prisma.addon.upsert({
                where: { id: `addon_uai_${optUai.id_opcao}` },
                update: {
                    name: optUai.nome,
                    description: optUai.descricao,
                    price: parseFloat(optUai.valor || 0),
                    imageUrl: optUai.foto,
                    saiposIntegrationCode: optUai.codigo || optUai.id_opcao.toString()
                },
                create: {
                    id: `addon_uai_${optUai.id_opcao}`,
                    name: optUai.nome,
                    description: optUai.descricao,
                    price: parseFloat(optUai.valor || 0),
                    imageUrl: optUai.foto,
                    addonGroupId: flavorGroup.id,
                    saiposIntegrationCode: optUai.codigo || optUai.id_opcao.toString()
                }
            });
        }
    }

    /**
     * Processa um produto normal (Burgers, Bebidas, etc.)
     */
    async processNormalProduct(restaurantId, categoryId, prodUai) {
        await prisma.product.upsert({
            where: { name_restaurantId: { name: prodUai.nome, restaurantId } },
            update: {
                description: prodUai.descricao,
                price: parseFloat(prodUai.valor || 0),
                imageUrl: prodUai.foto,
                saiposIntegrationCode: prodUai.codigo || prodUai.id_opcao.toString(),
                categories: { connect: { id: categoryId } }
            },
            create: {
                name: prodUai.nome,
                description: prodUai.descricao,
                price: parseFloat(prodUai.valor || 0),
                imageUrl: prodUai.foto,
                restaurantId,
                saiposIntegrationCode: prodUai.codigo || prodUai.id_opcao.toString(),
                categories: { connect: { id: categoryId } }
            }
        });
    }
}

module.exports = new UairangoService();