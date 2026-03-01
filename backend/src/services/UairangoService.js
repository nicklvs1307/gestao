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
                const catUai = menuData[categoryName];
                const catId = catUai.id_categoria;

                const category = await prisma.category.upsert({
                    where: { name_restaurantId: { name: categoryName, restaurantId } },
                    update: { saiposIntegrationCode: catId.toString(), cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' },
                    create: { name: categoryName, restaurantId, saiposIntegrationCode: catId.toString(), cuisineType: categoryName.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' }
                });

                const isFlavorCategory = categoryName.toLowerCase().includes('pizza') || 
                                       categoryName.toLowerCase().includes('esfiha') ||
                                       categoryName.toLowerCase().includes('sabor');

                // 1. Processar TAMANHOS (Produtos Base) primeiro
                if (Array.isArray(catUai.inteira)) {
                    for (const sizeItemUai of catUai.inteira) {
                        const itemName = sizeItemUai.produto || sizeItemUai.nome || 'Pizza';
                        const itemDesc = sizeItemUai.descricao || '';
                        const itemFoto = sizeItemUai.foto || null;

                        if (Array.isArray(sizeItemUai.opcoes)) {
                            for (const sizeOpt of sizeItemUai.opcoes) {
                                // Nome: "Pizza Gigante" + "12 Fatias"
                                const fullProductName = sizeItemUai.opcoes.length > 1 ? `${itemName} ${sizeOpt.descricao || sizeOpt.nome}` : itemName;
                                const basePrice = isFlavorCategory ? 0 : parseFloat(sizeOpt.valor || 0);
                                const sizeId = sizeOpt.id_opcao;

                                const product = await prisma.product.upsert({
                                    where: { name_restaurantId: { name: fullProductName, restaurantId } },
                                    update: { description: itemDesc, price: basePrice, imageUrl: itemFoto, saiposIntegrationCode: sizeId.toString(), categories: { connect: { id: category.id } }, isFlavor: false, showInMenu: true },
                                    create: { name: fullProductName, description: itemDesc, price: basePrice, imageUrl: itemFoto, restaurantId, saiposIntegrationCode: sizeId.toString(), categories: { connect: { id: category.id } }, isFlavor: false, showInMenu: true }
                                });

                                // 2. Se for categoria de sabor, criamos um Grupo de Adicionais específico para ESTE TAMANHO
                                if (isFlavorCategory && Array.isArray(catUai.meio_a_meio)) {
                                    const groupName = `SABORES: ${fullProductName}`;
                                    const flavorGroup = await prisma.addonGroup.upsert({
                                        where: { id: `grp_sz_${sizeId}` },
                                        update: { name: groupName, isFlavorGroup: true, priceRule: 'higher', minQuantity: 1, maxQuantity: 4, products: { connect: { id: product.id } } },
                                        create: { id: `grp_sz_${sizeId}`, name: groupName, restaurantId, isFlavorGroup: true, priceRule: 'higher', minQuantity: 1, maxQuantity: 4, products: { connect: { id: product.id } } }
                                    });

                                    // 3. Agora importamos os Sabores do UaiRango que correspondem a este tamanho
                                    for (const flavorUai of catUai.meio_a_meio) {
                                        const flavorName = flavorUai.produto || flavorUai.nome || 'Sabor';
                                        
                                        // Procuramos o preço deste sabor para o tamanho atual (sizeOpt)
                                        // No UaiRango, as opções de sabores costumam seguir a mesma ordem ou descrição dos tamanhos
                                        const matchingOption = flavorUai.opcoes?.find(o => o.descricao === sizeOpt.descricao) || flavorUai.opcoes?.[0];
                                        
                                        if (matchingOption) {
                                            const flavorPrice = parseFloat(matchingOption.valor || matchingOption.valorAtual || 0);
                                            const flavorId = matchingOption.id_opcao;
                                            const flavorImage = matchingOption.foto || flavorUai.foto || itemFoto;

                                            await prisma.addon.upsert({
                                                where: { id: `uai_flavor_${sizeId}_${flavorId}` },
                                                update: { name: flavorName, price: flavorPrice, imageUrl: flavorImage, saiposIntegrationCode: flavorId.toString() },
                                                create: { id: `uai_flavor_${sizeId}_${flavorId}`, name: flavorName, price: flavorPrice, imageUrl: flavorImage, addonGroupId: flavorGroup.id, saiposIntegrationCode: flavorId.toString() }
                                            });
                                            importedCount++;
                                        }
                                    }
                                }
                                importedCount++;
                            }
                        }
                    }
                } else if (!isFlavorCategory) {
                    // Itens que não são pizzas e não têm o array 'inteira' (casos raros)
                    // ... lógica de fallback se necessário ...
                }

                // 4. Importar Adicionais Extras da Categoria (Bordas, Bebidas etc)
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