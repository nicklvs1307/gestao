const prisma = require('../lib/prisma');
const XLSX = require('xlsx');

class SaiposImportService {
    async importFromExcel(restaurantId, fileBuffer) {
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);

            let importedProducts = 0;
            let importedAddons = 0;
            let createdCategories = 0;

            const categoryMap = new Map();
            const productMap = new Map();

            // 1. Processar Categorias e Pratos
            for (const row of data) {
                const tipo = String(row['Tipo'] || '').toUpperCase();
                const categoriaName = String(row['Categoria'] || 'Geral').trim();
                const saiposCode = String(row['Código Saipos'] || '').trim();
                const productName = String(row['Descrição'] || 'Sem nome').trim();

                if (tipo === 'PRATO' && saiposCode) {
                    // Garantir Categoria
                    let categoryId;
                    if (categoryMap.has(categoriaName)) {
                        categoryId = categoryMap.get(categoriaName);
                    } else {
                        let category = await prisma.category.findUnique({
                            where: { name_restaurantId: { name: categoriaName, restaurantId } }
                        });

                        if (!category) {
                            category = await prisma.category.create({
                                data: { name: categoriaName, restaurantId }
                            });
                            createdCategories++;
                        }
                        categoryId = category.id;
                        categoryMap.set(categoriaName, categoryId);
                    }

                    // VERIFICAÇÃO DUPLA: Por Código Saipos OU por Nome (para evitar P2002)
                    const existingProduct = await prisma.product.findFirst({
                        where: {
                            restaurantId,
                            OR: [
                                { saiposIntegrationCode: saiposCode },
                                { name: productName }
                            ]
                        }
                    });

                    if (!existingProduct) {
                        const priceStr = String(row['Preço'] || '0').replace('R$', '').replace(',', '.').trim();
                        const price = parseFloat(priceStr) || 0;
                        const product = await prisma.product.create({
                            data: {
                                name: productName,
                                price: price,
                                saiposIntegrationCode: saiposCode,
                                restaurantId,
                                categories: { connect: { id: categoryId } }
                            }
                        });
                        productMap.set(saiposCode, product.id);
                        importedProducts++;
                    } else {
                        // Se o produto já existe por nome mas não tem o código, vamos vincular
                        if (!existingProduct.saiposIntegrationCode) {
                            await prisma.product.update({
                                where: { id: existingProduct.id },
                                data: { saiposIntegrationCode: saiposCode }
                            });
                        }
                        productMap.set(saiposCode, existingProduct.id);
                    }
                }
            }

            // 2. Processar Complementos
            for (const row of data) {
                const tipo = String(row['Tipo'] || '').toUpperCase();
                if (tipo === 'COMPLEMENTO') {
                    const saiposCode = String(row['Código Saipos'] || '').trim();
                    const parentCode = saiposCode.split('.')[0];
                    const productId = productMap.get(parentCode);

                    if (productId) {
                        const complementoField = String(row['Complemento'] || '').trim();
                        const parts = complementoField.split(' - ');
                        const groupName = parts[0];
                        const addonName = parts.slice(1).join(' - ') || 'Opção';

                        let addonGroup = await prisma.addonGroup.findFirst({
                            where: { 
                                name: groupName, 
                                restaurantId,
                                products: { some: { id: productId } }
                            }
                        });

                        if (!addonGroup) {
                            addonGroup = await prisma.addonGroup.create({
                                data: {
                                    name: groupName,
                                    restaurantId,
                                    products: { connect: { id: productId } }
                                }
                            });
                        }

                        // Verifica se o adicional já existe no grupo (pelo código ou nome)
                        const existingAddon = await prisma.addon.findFirst({
                            where: { 
                                addonGroupId: addonGroup.id,
                                OR: [
                                    { saiposIntegrationCode: saiposCode },
                                    { name: addonName }
                                ]
                            }
                        });

                        if (!existingAddon) {
                            const priceStr = String(row['Preço'] || '0').replace('R$', '').replace(',', '.').trim();
                            const price = parseFloat(priceStr) || 0;
                            await prisma.addon.create({
                                data: {
                                    name: addonName,
                                    price: price,
                                    saiposIntegrationCode: saiposCode,
                                    addonGroupId: addonGroup.id
                                }
                            });
                            importedAddons++;
                        } else if (!existingAddon.saiposIntegrationCode) {
                            await prisma.addon.update({
                                where: { id: existingAddon.id },
                                data: { saiposIntegrationCode: saiposCode }
                            });
                        }
                    }
                }
            }

            return {
                success: true,
                message: `Importação concluída: ${importedProducts} novos itens e ${importedAddons} complementos cadastrados.`,
                details: { importedProducts, importedAddons, createdCategories }
            };

        } catch (error) {
            console.error('Erro na importação:', error);
            throw new Error('Falha ao processar o arquivo de importação: ' + error.message);
        }
    }
}

module.exports = new SaiposImportService();
