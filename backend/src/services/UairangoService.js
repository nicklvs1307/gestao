const axios = require('axios');
const prisma = require('../lib/prisma');

class UairangoService {
    baseUrl = 'https://www.uairango.com/api2';

    async getAccessToken(restaurantId) {
        const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
        if (!settings || !settings.uairangoToken) throw new Error('Token UaiRango ausente.');
        try {
            const response = await axios.post(`${this.baseUrl}/login`, { token: settings.uairangoToken });
            if (response.data && response.data.success) return response.data.token;
            throw new Error(response.data.message || 'Erro no login.');
        } catch (error) {
            throw new Error('Falha na autenticação com o UaiRango.');
        }
    }

    async importMenu(restaurantId) {
        const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
        const token = await this.getAccessToken(restaurantId);
        const establishmentId = settings.uairangoEstablishmentId;

        try {
            console.log(`[UAIRANGO] Iniciando importação para o restaurante ${restaurantId}...`);
            const menuRes = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const menuData = menuRes.data;
            let importedCount = 0;

            // UaiRango retorna um objeto onde cada chave é o Nome da Categoria
            for (const categoryName in menuData) {
                const catUai = menuData[categoryName];
                const catId = catUai.id_categoria;

                console.log(`[UAIRANGO] Importando Categoria: ${categoryName}`);

                // 1. Upsert da Categoria
                const category = await prisma.category.upsert({
                    where: { name_restaurantId: { name: categoryName, restaurantId } },
                    update: { saiposIntegrationCode: catId.toString(), cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' },
                    create: { name: categoryName, restaurantId, saiposIntegrationCode: catId.toString(), cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' }
                });

                // 2. Processar Itens 'Inteiros' (Produtos Normais ou Tamanhos de Pizza)
                if (Array.isArray(catUai.inteira)) {
                    for (const itemUai of catUai.inteira) {
                        const count = await this.processUaiItem(restaurantId, category, itemUai);
                        importedCount += count;
                    }
                }

                // 3. Processar Itens 'Meio a Meio' (Sabores de Pizza)
                const isFlavorCategory = categoryName.toLowerCase().includes('pizza') || 
                                       categoryName.toLowerCase().includes('esfiha') ||
                                       categoryName.toLowerCase().includes('sabor');

                if (isFlavorCategory && Array.isArray(catUai.meio_a_meio)) {
                    const flavorsCount = await this.processUaiFlavors(restaurantId, category, catUai.meio_a_meio);
                    importedCount += flavorsCount;
                }

                // 4. Importar Adicionais da Categoria (Grupos de Complementos)
                await this.importCategoryAddonGroups(restaurantId, establishmentId, catId, token);
            }

            await prisma.integrationSettings.update({
                where: { restaurantId },
                data: { uairangoImportedAt: new Date() }
            });

            return { success: true, importedCount };
        } catch (error) {
            console.error(`[UAIRANGO] Erro crítico na importação:`, error.message);
            throw error;
        }
    }

    /**
     * Processa um item do UaiRango (Pai) e suas opções (Filhos)
     */
    async processUaiItem(restaurantId, category, itemUai) {
        let count = 0;
        const itemName = itemUai.produto || itemUai.nome || 'Produto Sem Nome';
        const itemDescription = itemUai.descricao || '';
        const itemImage = itemUai.foto || null;

        // Se o item tem opções (tamanhos/variações)
        if (Array.isArray(itemUai.opcoes) && itemUai.opcoes.length > 0) {
            for (const opt of itemUai.opcoes) {
                // Nome composto: "Pizza Grande" ou "Coca-Cola 2L"
                const finalName = itemUai.opcoes.length > 1 ? `${itemName} ${opt.descricao || opt.nome}` : itemName;
                const price = parseFloat(opt.valor || opt.valorAtual || 0);
                const code = opt.id_opcao || opt.codigo || itemUai.id_produto;

                const product = await prisma.product.upsert({
                    where: { name_restaurantId: { name: finalName, restaurantId } },
                    update: {
                        description: itemDescription,
                        price: price,
                        imageUrl: itemImage,
                        saiposIntegrationCode: code.toString(),
                        categories: { connect: { id: category.id } },
                        isFlavor: false,
                        showInMenu: true
                    },
                    create: {
                        name: finalName,
                        description: itemDescription,
                        price: price,
                        imageUrl: itemImage,
                        restaurantId,
                        saiposIntegrationCode: code.toString(),
                        categories: { connect: { id: category.id } },
                        isFlavor: false,
                        showInMenu: true
                    }
                });

                // Se for categoria de pizza, vincula o grupo de sabores
                if (category.cuisineType === 'Pizza') {
                    await this.linkFlavorGroup(category, product.id);
                }
                count++;
            }
        } else {
            // Item sem opções
            const price = parseFloat(itemUai.valor || itemUai.valorAtual || 0);
            const code = itemUai.id_produto || itemUai.id_item;

            await prisma.product.upsert({
                where: { name_restaurantId: { name: itemName, restaurantId } },
                update: {
                    description: itemDescription,
                    price: price,
                    imageUrl: itemImage,
                    saiposIntegrationCode: code.toString(),
                    categories: { connect: { id: category.id } }
                },
                create: {
                    name: itemName,
                    description: itemDescription,
                    price: price,
                    imageUrl: itemImage,
                    restaurantId,
                    saiposIntegrationCode: code.toString(),
                    categories: { connect: { id: category.id } }
                }
            });
            count++;
        }
        return count;
    }

    /**
     * Transforma itens 'meio_a_meio' em Sabores (Addons)
     */
    async processUaiFlavors(restaurantId, category, flavorsUai) {
        // Cria/Garante o grupo de sabores
        const flavorGroup = await prisma.addonGroup.upsert({
            where: { id: `flavor_grp_${category.id}` },
            update: { name: `Sabores ${category.name}`, isFlavorGroup: true, priceRule: 'higher', minQuantity: 1, maxQuantity: 4 },
            create: { id: `flavor_grp_${category.id}`, name: `Sabores ${category.name}`, restaurantId, isFlavorGroup: true, priceRule: 'higher', minQuantity: 1, maxQuantity: 4 }
        });

        for (const flavor of flavorsUai) {
            const flavorName = flavor.produto || flavor.nome || 'Sabor';
            const flavorImage = flavor.foto || null;
            
            // Sabores também podem ter opções de preço no UaiRango
            const price = parseFloat(flavor.opcoes?.[0]?.valor || flavor.valor || 0);
            const code = flavor.opcoes?.[0]?.id_opcao || flavor.id_produto || flavor.id_item;

            await prisma.addon.upsert({
                where: { id: `uai_flavor_${code}` },
                update: {
                    name: flavorName,
                    price: price,
                    imageUrl: flavorImage,
                    saiposIntegrationCode: code.toString()
                },
                create: {
                    id: `uai_flavor_${code}`,
                    name: flavorName,
                    price: price,
                    imageUrl: flavorImage,
                    addonGroupId: flavorGroup.id,
                    saiposIntegrationCode: code.toString()
                }
            });
        }
        return flavorsUai.length;
    }

    async linkFlavorGroup(category, productId) {
        try {
            await prisma.addonGroup.update({
                where: { id: `flavor_grp_${category.id}` },
                data: { products: { connect: { id: productId } } }
            });
        } catch (e) {
            // Grupo pode não ter sido criado ainda se a categoria for mista
        }
    }

    async importCategoryAddonGroups(restaurantId, establishmentId, catId, token) {
        try {
            const addonRes = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}/adicionais/${catId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const groupsUai = Array.isArray(addonRes.data) ? addonRes.data : [];

            for (const grpUai of groupsUai) {
                const addonGroup = await prisma.addonGroup.upsert({
                    where: { id: `uai_grp_${grpUai.id_categoria}` },
                    update: {
                        name: grpUai.nome || 'Complementos',
                        minQuantity: parseInt(grpUai.minimo || 0),
                        maxQuantity: parseInt(grpUai.maximo || 1)
                    },
                    create: {
                        id: `uai_grp_${grpUai.id_categoria}`,
                        name: grpUai.nome || 'Complementos',
                        restaurantId,
                        minQuantity: parseInt(grpUai.minimo || 0),
                        maxQuantity: parseInt(grpUai.maximo || 1)
                    }
                });

                if (Array.isArray(grpUai.itens)) {
                    for (const subItem of grpUai.itens) {
                        await prisma.addon.upsert({
                            where: { id: `uai_addon_${subItem.id_opcao}` },
                            update: { name: subItem.nome, price: parseFloat(subItem.valor || 0), saiposIntegrationCode: subItem.id_opcao.toString() },
                            create: { id: `uai_addon_${subItem.id_opcao}`, name: subItem.nome, price: parseFloat(subItem.valor || 0), addonGroupId: addonGroup.id, saiposIntegrationCode: subItem.id_opcao.toString() }
                        });
                    }
                }

                // Vincula aos produtos da categoria
                const category = await prisma.category.findFirst({ where: { saiposIntegrationCode: catId.toString(), restaurantId } });
                if (category) {
                    const products = await prisma.product.findMany({ where: { categories: { some: { id: category.id } } } });
                    for (const p of products) {
                        await prisma.addonGroup.update({ where: { id: addonGroup.id }, data: { products: { connect: { id: p.id } } } });
                    }
                }
            }
        } catch (error) {
            // Silencioso se a categoria não tiver adicionais
        }
    }
}

module.exports = new UairangoService();