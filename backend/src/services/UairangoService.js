const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const api = require('./UairangoApiClient');

class UairangoService {
  async importMenu(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
    const merchantId = settings.uairangoEstablishmentId;

    if (!merchantId) throw new Error('Merchant ID não configurado');

    let importedCount = 0;

    try {
      const catalogs = await this._getCatalogs(restaurantId, merchantId);
      if (!catalogs.length) throw new Error('Nenhum catálogo encontrado');

      const defaultCatalog = catalogs[0];
      const categories = await this._getCategoriesWithItems(restaurantId, merchantId, defaultCatalog.catalogId);

      for (const cat of categories) {
        const category = await prisma.category.upsert({
          where: { name_restaurantId: { name: cat.name, restaurantId } },
          update: { cuisineType: cat.template === 'PIZZA' || cat.name.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' },
          create: { name: cat.name, restaurantId, cuisineType: cat.template === 'PIZZA' || cat.name.toLowerCase().includes('pizza') ? 'Pizza' : 'Geral' }
        });

        for (const item of (cat.items || [])) {
          const product = await prisma.product.upsert({
            where: { name_restaurantId: { name: item.name, restaurantId } },
            update: {
              description: item.description || '',
              price: parseFloat(item.price?.value || 0),
              imageUrl: null,
              isFlavor: false,
              showInMenu: true,
              categories: { connect: { id: category.id } },
            },
            create: {
              name: item.name,
              description: item.description || '',
              price: parseFloat(item.price?.value || 0),
              restaurantId,
              isFlavor: false,
              showInMenu: true,
              categories: { connect: { id: category.id } },
            }
          });
          importedCount++;

          for (const grp of (item.optionGroups || [])) {
            const addonGroup = await prisma.addonGroup.upsert({
              where: { id: `uai_grp_${grp.id}` },
              update: {
                name: grp.name || 'Complementos',
                minQuantity: grp.min ?? 0,
                maxQuantity: grp.max ?? 1,
                products: { connect: { id: product.id } },
              },
              create: {
                id: `uai_grp_${grp.id}`,
                name: grp.name || 'Complementos',
                restaurantId,
                minQuantity: grp.min ?? 0,
                maxQuantity: grp.max ?? 1,
                products: { connect: { id: product.id } },
              }
            });

            for (const opt of (grp.options || [])) {
              await prisma.addon.upsert({
                where: { id: `uai_addon_${opt.id}` },
                update: {
                  name: opt.name || 'Opção',
                  price: parseFloat(opt.price?.value || 0),
                },
                create: {
                  id: `uai_addon_${opt.id}`,
                  name: opt.name || 'Opção',
                  price: parseFloat(opt.price?.value || 0),
                  addonGroupId: addonGroup.id,
                }
              });
            }
          }
        }
      }

      await prisma.integrationSettings.update({
        where: { restaurantId },
        data: { uairangoImportedAt: new Date() }
      });

      return { success: true, importedCount };
    } catch (error) {
      logger.error(`[UAIRANGO] Erro na importação:`, error.message);
      throw error;
    }
  }

  async _getCatalogs(restaurantId, merchantId) {
    const response = await api.get(restaurantId, `/catalog/v2.0/merchants/${merchantId}/catalogs`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async _getCategoriesWithItems(restaurantId, merchantId, catalogId) {
    const response = await api.get(restaurantId, `/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`, {
      params: { includeItems: true }
    });
    return Array.isArray(response.data) ? response.data : [];
  }
}

module.exports = new UairangoService();
