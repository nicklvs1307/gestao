const axios = require('axios');
const prisma = require('../lib/prisma');

class UairangoService {
    /**
     * URL Base da API do UaiRango
     */
    baseUrl = 'https://www.uairango.com/api2';

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
            
            // 1. Busca as Categorias primeiro
            const categoriesRes = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}/categorias`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const categoriesUai = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
            let importedCount = 0;

            for (const catUai of categoriesUai) {
                console.log(`[UAIRANGO] Processando categoria: ${catUai.nome}`);
                
                // 2. Upsert da Categoria
                const category = await prisma.category.upsert({
                    where: { 
                        name_restaurantId: { 
                            name: catUai.nome, 
                            restaurantId 
                        } 
                    },
                    update: {
                        description: catUai.descricao || '',
                        saiposIntegrationCode: catUai.cod_externo || catUai.id_categoria.toString(),
                        cuisineType: catUai.nome.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral'
                    },
                    create: {
                        name: catUai.nome,
                        description: catUai.descricao || '',
                        restaurantId,
                        saiposIntegrationCode: catUai.cod_externo || catUai.id_categoria.toString(),
                        cuisineType: catUai.nome.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral'
                    }
                });

                // 3. Busca as Opções (Produtos) desta categoria
                const optionsRes = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}/opcoes/${catUai.id_categoria}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const optionsUai = Array.isArray(optionsRes.data) ? optionsRes.data : [];

                // Lógica Especial para Pizzas/Esfihas/Sabores
                const isFlavorCategory = catUai.nome.toLowerCase().includes('pizza') || 
                                       catUai.nome.toLowerCase().includes('esfiha') ||
                                       catUai.nome.toLowerCase().includes('sabor');

                if (isFlavorCategory) {
                    await this.processFlavorCategory(restaurantId, category, optionsUai);
                    importedCount += optionsUai.length;
                } else {
                    // Processamento Normal de Produtos
                    for (const prodUai of optionsUai) {
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
            console.error(`[UAIRANGO] Erro na importação (Restaurante ${restaurantId}):`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Processa categorias de sabores (Pizzas) transformando itens em Adicionais
     */
    async processFlavorCategory(restaurantId, category, optionsUai) {
        const productName = category.name; 
        
        const productBase = await prisma.product.upsert({
            where: { name_restaurantId: { name: productName, restaurantId } },
            update: { isFlavor: false, showInMenu: true },
            create: {
                name: productName,
                price: 0,
                restaurantId,
                isFlavor: false,
                showInMenu: true,
                categories: { connect: { id: category.id } }
            }
        });

        const flavorGroup = await prisma.addonGroup.upsert({
            where: { id: `flavor_group_${category.id}` },
            update: {
                name: `Sabores ${category.name}`,
                isFlavorGroup: true,
                priceRule: 'higher',
                minQuantity: 1,
                maxQuantity: 4,
                restaurantId // Garantir restaurantId no update também
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

        for (const optUai of optionsUai) {
            await prisma.addon.upsert({
                where: { id: `addon_uai_${optUai.id_opcao}` },
                update: {
                    name: optUai.nome,
                    description: optUai.descricao || '',
                    price: parseFloat(optUai.valor || 0),
                    imageUrl: optUai.foto || null,
                    saiposIntegrationCode: optUai.codigo || optUai.id_opcao.toString()
                },
                create: {
                    id: `addon_uai_${optUai.id_opcao}`,
                    name: optUai.nome,
                    description: optUai.descricao || '',
                    price: parseFloat(optUai.valor || 0),
                    imageUrl: optUai.foto || null,
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
                description: prodUai.descricao || '',
                price: parseFloat(prodUai.valor || 0),
                imageUrl: prodUai.foto || null,
                saiposIntegrationCode: prodUai.codigo || prodUai.id_opcao.toString(),
                categories: { connect: { id: categoryId } }
            },
            create: {
                name: prodUai.nome,
                description: prodUai.descricao || '',
                price: parseFloat(prodUai.valor || 0),
                imageUrl: prodUai.foto || null,
                restaurantId,
                saiposIntegrationCode: prodUai.codigo || prodUai.id_opcao.toString(),
                categories: { connect: { id: categoryId } }
            }
        });
    }
}

module.exports = new UairangoService();