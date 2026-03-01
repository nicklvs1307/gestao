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
            console.log(`[UAIRANGO] Iniciando importação profunda para o restaurante ${restaurantId}...`);
            const menuRes = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const menuData = menuRes.data;
            let importedCount = 0;

            for (const categoryName in menuData) {
                const catUai = menuData[categoryName];
                const catId = catUai.id_categoria;

                console.log(`[UAIRANGO] Processando categoria: ${categoryName}`);

                // 1. Upsert da Categoria
                const category = await prisma.category.upsert({
                    where: { name_restaurantId: { name: categoryName, restaurantId } },
                    update: { saiposIntegrationCode: catId.toString(), cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' },
                    create: { name: categoryName, restaurantId, saiposIntegrationCode: catId.toString(), cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' }
                });

                const isFlavorCategory = categoryName.toLowerCase().includes('pizza') || 
                                       categoryName.toLowerCase().includes('esfiha') ||
                                       categoryName.toLowerCase().includes('sabor');

                // 2. Se for categoria de sabores (Pizza/Esfiha), cria os Sabores como ADDONS (Adicionais)
                let flavorGroupId = null;
                if (isFlavorCategory && Array.isArray(catUai.meio_a_meio)) {
                    const flavorGroup = await prisma.addonGroup.upsert({
                        where: { id: `flavor_grp_${category.id}` },
                        update: { name: `Sabores ${category.name}`, isFlavorGroup: true, priceRule: 'higher', minQuantity: 1, maxQuantity: 4 },
                        create: { id: `flavor_grp_${category.id}`, name: `Sabores ${category.name}`, restaurantId, isFlavorGroup: true, priceRule: 'higher', minQuantity: 1, maxQuantity: 4 }
                    });
                    flavorGroupId = flavorGroup.id;

                    for (const flavorUai of catUai.meio_a_meio) {
                        const flavorName = flavorUai.produto || flavorUai.nome || 'Sabor';
                        const flavorPrice = parseFloat(flavorUai.opcoes?.[0]?.valor || flavorUai.valor || 0);
                        const flavorCode = flavorUai.opcoes?.[0]?.id_opcao || flavorUai.id_produto || flavorUai.id_item;

                        if (flavorName) {
                            await prisma.addon.upsert({
                                where: { id: `uai_flavor_${flavorCode}` },
                                update: { name: flavorName, price: flavorPrice, imageUrl: flavorUai.foto || null, saiposIntegrationCode: flavorCode.toString() },
                                create: { id: `uai_flavor_${flavorCode}`, name: flavorName, price: flavorPrice, imageUrl: flavorUai.foto || null, addonGroupId: flavorGroupId, saiposIntegrationCode: flavorCode.toString() }
                            });
                            importedCount++;
                        }
                    }
                }

                // 3. Processar Itens 'Inteiros' (Produtos Base/Tamanhos ou Itens Normais)
                if (Array.isArray(catUai.inteira)) {
                    for (const itemUai of catUai.inteira) {
                        const itemName = itemUai.produto || itemUai.nome || 'Produto';
                        const itemDesc = itemUai.descricao || '';
                        const itemFoto = itemUai.foto || null;

                        if (Array.isArray(itemUai.opcoes)) {
                            for (const opt of itemUai.opcoes) {
                                // Nome do produto: "Pizza Grande" ou "Burger X"
                                const finalName = itemUai.opcoes.length > 1 ? `${itemName} ${opt.descricao || opt.nome}` : itemName;
                                
                                // Se for pizza, o preço base do produto é 0 (pois o preço vem dos sabores)
                                const price = isFlavorCategory ? 0 : parseFloat(opt.valor || opt.valorAtual || 0);
                                const code = opt.id_opcao || itemUai.id_produto;

                                if (finalName) {
                                    const product = await prisma.product.upsert({
                                        where: { name_restaurantId: { name: finalName, restaurantId } },
                                        update: { description: itemDesc, price, imageUrl: itemFoto, saiposIntegrationCode: code.toString(), categories: { connect: { id: category.id } }, isFlavor: false, showInMenu: true },
                                        create: { name: finalName, description: itemDesc, price, imageUrl: itemFoto, restaurantId, saiposIntegrationCode: code.toString(), categories: { connect: { id: category.id } }, isFlavor: false, showInMenu: true }
                                    });

                                    // Se for categoria de sabor, vincula o grupo de sabores (AddonGroup) ao produto
                                    if (isFlavorCategory && flavorGroupId) {
                                        await prisma.addonGroup.update({
                                            where: { id: flavorGroupId },
                                            data: { products: { connect: { id: product.id } } }
                                        });
                                    }
                                    importedCount++;
                                }
                            }
                        } else {
                            // Item sem array de opções
                            const price = isFlavorCategory ? 0 : parseFloat(itemUai.valor || 0);
                            const code = itemUai.id_produto || itemUai.id_item;
                            
                            if (itemName) {
                                const product = await prisma.product.upsert({
                                    where: { name_restaurantId: { name: itemName, restaurantId } },
                                    update: { description: itemDesc, price, imageUrl: itemFoto, saiposIntegrationCode: code.toString(), categories: { connect: { id: category.id } } },
                                    create: { name: itemName, description: itemDesc, price, imageUrl: itemFoto, restaurantId, saiposIntegrationCode: code.toString(), categories: { connect: { id: category.id } } }
                                });

                                if (isFlavorCategory && flavorGroupId) {
                                    await prisma.addonGroup.update({
                                        where: { id: flavorGroupId },
                                        data: { products: { connect: { id: product.id } } }
                                    });
                                }
                                importedCount++;
                            }
                        }
                    }
                }

                // 4. Importar Adicionais Extras (Complementos, Bordas, etc)
                await this.importCategoryAddonGroups(restaurantId, establishmentId, catId, token);
            }

            await prisma.integrationSettings.update({ where: { restaurantId }, data: { uairangoImportedAt: new Date() } });
            return { success: true, importedCount };
        } catch (error) {
            console.error(`[UAIRANGO] Erro:`, error.message);
            throw error;
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
                    update: { name: grpUai.nome || 'Complementos', minQuantity: parseInt(grpUai.minimo || 0), maxQuantity: parseInt(grpUai.maximo || 1) },
                    create: { id: `uai_grp_${grpUai.id_categoria}`, name: grpUai.nome || 'Complementos', restaurantId, minQuantity: parseInt(grpUai.minimo || 0), maxQuantity: parseInt(grpUai.maximo || 1) }
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
        } catch (error) {}
    }
}

module.exports = new UairangoService();