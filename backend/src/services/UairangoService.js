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
     * Importa o cardápio completo do UaiRango com lógica inteligente para Pizzas e Sabores
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
            console.log(`[UAIRANGO] Iniciando importação profunda para o restaurante ${restaurantId}...`);
            
            // 1. Busca o cardápio via endpoint que retorna a estrutura completa de categorias
            const menuRes = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // A resposta do UaiRango para este endpoint é um objeto onde cada chave é uma categoria
            const menuData = menuRes.data;
            let importedCount = 0;

            for (const categoryName in menuData) {
                const catData = menuData[categoryName];
                const catId = catData.id_categoria;

                console.log(`[UAIRANGO] Processando categoria: ${categoryName} (ID: ${catId})`);

                // A. Upsert da Categoria
                const category = await prisma.category.upsert({
                    where: { 
                        name_restaurantId: { 
                            name: categoryName, 
                            restaurantId 
                        } 
                    },
                    update: {
                        saiposIntegrationCode: catId.toString(),
                        cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral'
                    },
                    create: {
                        name: categoryName,
                        restaurantId,
                        saiposIntegrationCode: catId.toString(),
                        cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral'
                    }
                });

                // B. Lógica de Pizzas/Esfihas (Sabores)
                // No UaiRango, sabores ficam no array 'meio_a_meio'
                const isFlavorCategory = categoryName.toLowerCase().includes('pizza') || 
                                       categoryName.toLowerCase().includes('esfiha') ||
                                       categoryName.toLowerCase().includes('sabor');

                if (isFlavorCategory && catData.meio_a_meio) {
                    // Sabores vira Addons
                    const flavorsCount = await this.processFlavorsAsAddons(restaurantId, category, catData.meio_a_meio);
                    importedCount += flavorsCount;

                    // Itens 'inteira' na categoria de pizza viram os 'Produtos Base/Tamanhos'
                    if (catData.inteira) {
                        for (const sizeItem of catData.inteira) {
                            await this.processPizzaBase(restaurantId, category, sizeItem);
                            importedCount++;
                        }
                    }
                } else {
                    // C. Processamento Normal (Itens Inteiros)
                    if (catData.inteira) {
                        for (const itemUai of catData.inteira) {
                            await this.processNormalItem(restaurantId, category.id, itemUai);
                            importedCount++;
                        }
                    }
                }

                // D. Importar Grupos de Adicionais (Complementos) da Categoria
                await this.importCategoryAddonGroups(restaurantId, establishmentId, catId, token);
            }

            // Atualiza data da última importação
            await prisma.integrationSettings.update({
                where: { restaurantId },
                data: { uairangoImportedAt: new Date() }
            });

            return { success: true, importedCount };
        } catch (error) {
            console.error(`[UAIRANGO] Erro na importação (Restaurante ${restaurantId}):`, error.message);
            throw error;
        }
    }

    /**
     * Transforma itens do array 'meio_a_meio' em Adicionais (Sabores)
     */
    async processFlavorsAsAddons(restaurantId, category, flavorsUai) {
        // Cria um grupo de adicionais global para os sabores desta categoria
        const flavorGroup = await prisma.addonGroup.upsert({
            where: { id: `flavor_grp_${category.id}` },
            update: {
                name: `Sabores ${category.name}`,
                isFlavorGroup: true,
                priceRule: 'higher',
                minQuantity: 1,
                maxQuantity: 4
            },
            create: {
                id: `flavor_grp_${category.id}`,
                name: `Sabores ${category.name}`,
                restaurantId,
                isFlavorGroup: true,
                priceRule: 'higher',
                minQuantity: 1,
                maxQuantity: 4
            }
        });

        for (const flavor of flavorsUai) {
            // No UaiRango, sabores podem ter variações (opcoes), pegamos a principal ou iteramos
            const flavorName = flavor.nome || (flavor.opcoes?.[0]?.nome) || 'Sabor Indefinido';
            const flavorPrice = flavor.opcoes?.[0]?.valor || flavor.valor || 0;
            const flavorId = flavor.opcoes?.[0]?.id_opcao || flavor.id_item || Math.random().toString(36).substr(2, 9);

            await prisma.addon.upsert({
                where: { id: `uai_flavor_${flavorId}` },
                update: {
                    name: flavorName,
                    price: parseFloat(flavorPrice),
                    imageUrl: flavor.foto || null,
                    saiposIntegrationCode: flavorId.toString()
                },
                create: {
                    id: `uai_flavor_${flavorId}`,
                    name: flavorName,
                    price: parseFloat(flavorPrice),
                    imageUrl: flavor.foto || null,
                    addonGroupId: flavorGroup.id,
                    saiposIntegrationCode: flavorId.toString()
                }
            });
        }
        return flavorsUai.length;
    }

    /**
     * Cria o Produto Base (Tamanho) para Pizzas
     */
    async processPizzaBase(restaurantId, category, sizeItem) {
        // Se o item tem opções (ex: Pizza Gigante -> Broto, Grande)
        if (sizeItem.opcoes && sizeItem.opcoes.length > 0) {
            for (const opt of sizeItem.opcoes) {
                const fullBaseName = `${sizeItem.nome} ${opt.nome}`;
                await prisma.product.upsert({
                    where: { name_restaurantId: { name: fullBaseName, restaurantId } },
                    update: { isFlavor: false, showInMenu: true, categories: { connect: { id: category.id } } },
                    create: {
                        name: fullBaseName,
                        price: 0, // Preço vem dos sabores
                        restaurantId,
                        isFlavor: false,
                        showInMenu: true,
                        categories: { connect: { id: category.id } }
                    }
                });

                // Vincula o grupo de sabores a este produto base
                await prisma.addonGroup.update({
                    where: { id: `flavor_grp_${category.id}` },
                    data: { products: { connect: { id: (await prisma.product.findFirst({ where: { name: fullBaseName, restaurantId } })).id } } }
                });
            }
        }
    }

    /**
     * Processa itens normais (Bebidas, Lanches, etc)
     */
    async processNormalItem(restaurantId, categoryId, itemUai) {
        if (itemUai.opcoes && itemUai.opcoes.length > 0) {
            for (const opt of itemUai.opcoes) {
                // Tenta pegar o nome mais completo possível
                let productName = itemUai.nome || opt.nome || 'Produto Sem Nome';
                
                // Se houver mais de uma opção, anexa o nome da opção ao nome do produto (ex: Coca-Cola 2L)
                if (itemUai.opcoes.length > 1 && opt.nome && itemUai.nome !== opt.nome) {
                    productName = `${itemUai.nome} ${opt.nome}`;
                }

                await prisma.product.upsert({
                    where: { name_restaurantId: { name: productName, restaurantId } },
                    update: {
                        description: itemUai.descricao || '',
                        price: parseFloat(opt.valor || 0),
                        imageUrl: itemUai.foto || null,
                        saiposIntegrationCode: opt.id_opcao.toString(),
                        categories: { connect: { id: categoryId } }
                    },
                    create: {
                        name: productName,
                        description: itemUai.descricao || '',
                        price: parseFloat(opt.valor || 0),
                        imageUrl: itemUai.foto || null,
                        restaurantId,
                        saiposIntegrationCode: opt.id_opcao.toString(),
                        categories: { connect: { id: categoryId } }
                    }
                });
            }
        }
    }

    /**
     * Busca e importa grupos de adicionais vinculados a uma categoria
     */
    async importCategoryAddonGroups(restaurantId, establishmentId, catId, token) {
        try {
            const addonRes = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}/adicionais/${catId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const groupsUai = Array.isArray(addonRes.data) ? addonRes.data : [];

            for (const grpUai of groupsUai) {
                const addonGroup = await prisma.addonGroup.upsert({
                    where: { id: `uai_grp_${grpUai.id_categoria}` }, // id_categoria aqui é o ID do grupo no UaiRango
                    update: {
                        name: grpUai.nome,
                        minQuantity: parseInt(grpUai.minimo || 0),
                        maxQuantity: parseInt(grpUai.maximo || 1),
                        isFlavorGroup: false
                    },
                    create: {
                        id: `uai_grp_${grpUai.id_categoria}`,
                        name: grpUai.nome,
                        restaurantId,
                        minQuantity: parseInt(grpUai.minimo || 0),
                        maxQuantity: parseInt(grpUai.maximo || 1),
                        isFlavorGroup: false
                    }
                });

                // Importa os itens deste grupo de adicionais
                if (grpUai.itens) {
                    for (const subItem of grpUai.itens) {
                        await prisma.addon.upsert({
                            where: { id: `uai_addon_${subItem.id_opcao}` },
                            update: {
                                name: subItem.nome,
                                price: parseFloat(subItem.valor || 0),
                                saiposIntegrationCode: subItem.id_opcao.toString()
                            },
                            create: {
                                id: `uai_addon_${subItem.id_opcao}`,
                                name: subItem.nome,
                                price: parseFloat(subItem.valor || 0),
                                addonGroupId: addonGroup.id,
                                saiposIntegrationCode: subItem.id_opcao.toString()
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`[UAIRANGO] Erro ao importar adicionais da categoria ${catId}:`, error.message);
        }
    }
}

module.exports = new UairangoService();