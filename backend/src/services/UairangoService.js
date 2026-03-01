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
            const menuRes = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const menuData = menuRes.data;
            let importedCount = 0;

            for (const categoryName in menuData) {
                const catData = menuData[categoryName];
                const catId = catData.id_categoria;

                const category = await prisma.category.upsert({
                    where: { name_restaurantId: { name: categoryName, restaurantId } },
                    update: { saiposIntegrationCode: catId.toString(), cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' },
                    create: { name: categoryName, restaurantId, saiposIntegrationCode: catId.toString(), cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' }
                });

                const isFlavorCategory = categoryName.toLowerCase().includes('pizza') || 
                                       categoryName.toLowerCase().includes('esfiha') ||
                                       categoryName.toLowerCase().includes('sabor');

                if (isFlavorCategory && catData.meio_a_meio) {
                    const flavorsCount = await this.processFlavorsAsAddons(restaurantId, category, catData.meio_a_meio);
                    importedCount += flavorsCount;

                    if (catData.inteira) {
                        for (const sizeItem of catData.inteira) {
                            await this.processPizzaBase(restaurantId, category, sizeItem);
                            importedCount++;
                        }
                    }
                } else {
                    if (catData.inteira) {
                        for (const itemUai of catData.inteira) {
                            await this.processNormalItem(restaurantId, category.id, itemUai);
                            importedCount++;
                        }
                    }
                }
                await this.importCategoryAddonGroups(restaurantId, establishmentId, catId, token);
            }

            await prisma.integrationSettings.update({
                where: { restaurantId },
                data: { uairangoImportedAt: new Date() }
            });

            return { success: true, importedCount };
        } catch (error) {
            console.error(`[UAIRANGO] Erro:`, error.message);
            throw error;
        }
    }

    async processFlavorsAsAddons(restaurantId, category, flavorsUai) {
        const flavorGroup = await prisma.addonGroup.upsert({
            where: { id: `flavor_grp_${category.id}` },
            update: { name: `Sabores ${category.name}`, isFlavorGroup: true, priceRule: 'higher', minQuantity: 1, maxQuantity: 4 },
            create: { id: `flavor_grp_${category.id}`, name: `Sabores ${category.name}`, restaurantId, isFlavorGroup: true, priceRule: 'higher', minQuantity: 1, maxQuantity: 4 }
        });

        for (const flavor of flavorsUai) {
            const flavorName = flavor.nome || (flavor.opcoes?.[0]?.nome) || 'Sabor Indefinido';
            const flavorPrice = flavor.opcoes?.[0]?.valor || flavor.valor || 0;
            const flavorId = flavor.opcoes?.[0]?.id_opcao || flavor.id_item || Math.random().toString(36).substr(2, 9);

            await prisma.addon.upsert({
                where: { id: `uai_flavor_${flavorId}` },
                update: { name: flavorName, price: parseFloat(flavorPrice), imageUrl: flavor.foto || null, saiposIntegrationCode: flavorId.toString() },
                create: { id: `uai_flavor_${flavorId}`, name: flavorName, price: parseFloat(flavorPrice), imageUrl: flavor.foto || null, addonGroupId: flavorGroup.id, saiposIntegrationCode: flavorId.toString() }
            });
        }
        return flavorsUai.length;
    }

    async processPizzaBase(restaurantId, category, sizeItem) {
        const process = async (name, code) => {
            if (!name) return;
            const product = await prisma.product.upsert({
                where: { name_restaurantId: { name, restaurantId } },
                update: { isFlavor: false, showInMenu: true, categories: { connect: { id: category.id } }, saiposIntegrationCode: code?.toString() || '' },
                create: { name, price: 0, restaurantId, isFlavor: false, showInMenu: true, categories: { connect: { id: category.id } }, saiposIntegrationCode: code?.toString() || '' }
            });
            await prisma.addonGroup.update({
                where: { id: `flavor_grp_${category.id}` },
                data: { products: { connect: { id: product.id } } }
            });
        };

        if (sizeItem.opcoes && sizeItem.opcoes.length > 0) {
            for (const opt of sizeItem.opcoes) {
                const name = (sizeItem.nome || opt.nome) ? `${sizeItem.nome || ''} ${opt.nome || ''}`.trim() : `Pizza ${opt.id_opcao}`;
                await process(name, opt.id_opcao);
            }
        } else {
            const name = sizeItem.nome || `Pizza ${sizeItem.id_item}`;
            await process(name, sizeItem.id_item);
        }
    }

    async processNormalItem(restaurantId, categoryId, itemUai) {
        const upsertProd = async (name, price, code) => {
            if (!name) return;
            await prisma.product.upsert({
                where: { name_restaurantId: { name, restaurantId } },
                update: { description: itemUai.descricao || '', price: parseFloat(price), imageUrl: itemUai.foto || null, saiposIntegrationCode: code?.toString() || '', categories: { connect: { id: categoryId } } },
                create: { name, description: itemUai.descricao || '', price: parseFloat(price), imageUrl: itemUai.foto || null, restaurantId, saiposIntegrationCode: code?.toString() || '', categories: { connect: { id: categoryId } } }
            });
        };

        if (itemUai.opcoes && itemUai.opcoes.length > 0) {
            for (const opt of itemUai.opcoes) {
                let name = itemUai.nome || opt.nome || 'Produto';
                if (itemUai.opcoes.length > 1 && opt.nome && itemUai.nome !== opt.nome) {
                    name = `${itemUai.nome || ''} ${opt.nome}`.trim();
                }
                await upsertProd(name, opt.valor || itemUai.valor || 0, opt.id_opcao);
            }
        } else {
            const name = itemUai.nome || `Item ${itemUai.id_item}`;
            await upsertProd(name, itemUai.valor || 0, itemUai.id_item);
        }
    }

    async importCategoryAddonGroups(restaurantId, establishmentId, catId, token) {
        try {
            const addonRes = await axios.get(`${this.baseUrl}/auth/cardapio/${establishmentId}/adicionais/${catId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const groupsUai = Array.isArray(addonRes.data) ? addonRes.data : [];
            for (const grpUai of groupsUai) {
                const addonGroup = await prisma.addonGroup.upsert({
                    where: { id: `uai_grp_${grpUai.id_categoria}` },
                    update: { name: grpUai.nome || 'Complementos', minQuantity: parseInt(grpUai.minimo || 0), maxQuantity: parseInt(grpUai.maximo || 1), isFlavorGroup: false },
                    create: { id: `uai_grp_${grpUai.id_categoria}`, name: grpUai.nome || 'Complementos', restaurantId, minQuantity: parseInt(grpUai.minimo || 0), maxQuantity: parseInt(grpUai.maximo || 1), isFlavorGroup: false }
                });
                if (grpUai.itens) {
                    for (const subItem of grpUai.itens) {
                        const name = subItem.nome || `Adicional ${subItem.id_opcao}`;
                        await prisma.addon.upsert({
                            where: { id: `uai_addon_${subItem.id_opcao}` },
                            update: { name, price: parseFloat(subItem.valor || 0), saiposIntegrationCode: subItem.id_opcao.toString() },
                            create: { id: `uai_addon_${subItem.id_opcao}`, name, price: parseFloat(subItem.valor || 0), addonGroupId: addonGroup.id, saiposIntegrationCode: subItem.id_opcao.toString() }
                        });
                    }
                }
                // Vincula grupo de adicionais aos produtos da categoria
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