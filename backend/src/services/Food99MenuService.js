const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99AuthService = require('./Food99AuthService');

const BASE_URL = process.env.FOOD99_BASE_URL || 'https://openapi.didi-food.com';

class Food99MenuService {

  async syncMenu(restaurantId) {
    try {
      const settings = await prisma.integrationSettings.findUnique({
        where: { restaurantId },
      });

      if (!settings || !settings.food99AppShopId) {
        throw new Error('Configuração 99Food não encontrada para este restaurante');
      }

      const authToken = await Food99AuthService.getValidToken(settings.food99AppShopId);
      if (!authToken) {
        throw new Error('Não foi possível obter token válido para 99Food');
      }

      const categories = await prisma.category.findMany({
        where: { restaurantId, isActive: true },
        orderBy: { order: 'asc' },
        include: {
          products: {
            where: { showInMenu: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      const products = await prisma.product.findMany({
        where: { restaurantId, showInMenu: true },
        orderBy: { order: 'asc' },
        include: {
          addonGroups: {
            include: {
              addons: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      const menus = this._buildMenus(categories);
      const categoriesPayload = this._buildCategories(categories, products);
      const itemsPayload = this._buildItems(products);
      const modifierGroupsPayload = this._buildModifierGroups(products);

      const payload = {
        auth_token: authToken,
        menus,
        categories: categoriesPayload,
        items: itemsPayload,
        modifier_groups: modifierGroupsPayload,
      };

      logger.info(`[FOOD99 MENU] Enviando cardápio para restaurante ${restaurantId}: ${menus.length} menus, ${categoriesPayload.length} categorias, ${itemsPayload.length} itens, ${modifierGroupsPayload.length} grupos`);

      const response = await axios.post(
        `${BASE_URL}/v3/item/item/upload`,
        payload,
        { timeout: 30000 },
      );

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao enviar cardápio');
      }

      const taskId = data?.taskID || data?.taskId;

      logger.info(`[FOOD99 MENU] Cardápio enviado com sucesso. Task ID: ${taskId}`);

      return { success: true, taskId, data };
    } catch (error) {
      logger.error('[FOOD99 MENU] Erro ao sincronizar cardápio:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao sincronizar cardápio');
    }
  }

  async getMenuStatus(authToken, taskId) {
    try {
      const response = await axios.get(`${BASE_URL}/v1/item/item/getMenuTaskInfo`, {
        params: { auth_token: authToken, task_id: taskId },
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao consultar status');
      }

      return {
        success: true,
        taskId: data?.taskID,
        status: data?.status,
        message: data?.message,
        createTime: data?.createTime,
        operationList: data?.operationList,
        appShopID: data?.appShopID,
      };
    } catch (error) {
      logger.error('[FOOD99 MENU] Erro ao consultar status:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao consultar status');
    }
  }

  async getCurrentMenu(restaurantId) {
    try {
      const settings = await prisma.integrationSettings.findUnique({
        where: { restaurantId },
      });

      if (!settings || !settings.food99AppShopId) {
        throw new Error('Configuração 99Food não encontrada para este restaurante');
      }

      const authToken = await Food99AuthService.getValidToken(settings.food99AppShopId);
      if (!authToken) {
        throw new Error('Não foi possível obter token válido para 99Food');
      }

      const response = await axios.get(`${BASE_URL}/v3/item/item/list`, {
        params: { auth_token: authToken },
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao buscar cardápio atual');
      }

      return {
        success: true,
        menus: data?.menus || [],
        categories: data?.categories || [],
        items: data?.items || [],
        modifierGroups: data?.modifier_groups || [],
      };
    } catch (error) {
      logger.error('[FOOD99 MENU] Erro ao buscar cardápio atual:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao buscar cardápio atual');
    }
  }

  async updateItemStatus(restaurantId, integrationCode, available) {
    try {
      const settings = await prisma.integrationSettings.findUnique({
        where: { restaurantId },
      });

      if (!settings || !settings.food99AppShopId) {
        throw new Error('Configuração 99Food não encontrada para este restaurante');
      }

      const authToken = await Food99AuthService.getValidToken(settings.food99AppShopId);
      if (!authToken) {
        throw new Error('Não foi possível obter token válido para 99Food');
      }

      const status = available ? 1 : 2;

      const response = await axios.post(
        `${BASE_URL}/v3/item/item/updateItemStatus`,
        {
          auth_token: authToken,
          app_item_ids: [integrationCode],
          status,
        },
        { timeout: 15000 },
      );

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao atualizar status do item');
      }

      logger.info(`[FOOD99 MENU] Status do item ${integrationCode} atualizado para ${status}`);

      return {
        success: true,
        integrationCode,
        status,
        successList: data?.success || [],
        failedList: data?.failed || [],
      };
    } catch (error) {
      logger.error('[FOOD99 MENU] Erro ao atualizar status:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao atualizar status do item');
    }
  }

  async uploadImage(restaurantId, imageUrl, ext) {
    try {
      const settings = await prisma.integrationSettings.findUnique({
        where: { restaurantId },
      });

      if (!settings || !settings.food99AppShopId) {
        throw new Error('Configuração 99Food não encontrada para este restaurante');
      }

      const authToken = await Food99AuthService.getValidToken(settings.food99AppShopId);
      if (!authToken) {
        throw new Error('Não foi possível obter token válido para 99Food');
      }

      const body = { auth_token: authToken, image_url: imageUrl };
      if (ext) {
        body.ext = ext;
      }

      const response = await axios.post(
        `${BASE_URL}/v3/image/image/uploadImage`,
        body,
        { timeout: 30000 },
      );

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao enviar imagem');
      }

      logger.info(`[FOOD99 MENU] Imagem enviada com sucesso: ${imageUrl}`);

      return { success: true, data };
    } catch (error) {
      logger.error('[FOOD99 MENU] Erro ao enviar imagem:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao enviar imagem');
    }
  }

  _buildMenus(categories) {
    const categoryIds = categories
      .filter(c => c.products.length > 0)
      .map(c => c.integrationCode || c.id);

    return [
      {
        app_menu_id: 'default',
        menu_name: 'Cardápio Principal',
        app_category_ids: categoryIds,
      },
    ];
  }

  _buildCategories(categories, products) {
    return categories
      .filter(c => c.products.length > 0)
      .map(category => {
        const itemIds = category.products
          .filter(p => p.showInMenu)
          .map(p => p.integrationCode || p.id);

        return {
          app_category_id: category.integrationCode || category.id,
          category_name: category.name,
          app_item_ids: itemIds,
        };
      });
  }

  _buildItems(products) {
    return products
      .filter(p => p.showInMenu)
      .map(product => {
        const item = {
          app_item_id: product.integrationCode || product.id,
          item_name: product.name,
          price: Math.round(product.price * 100),
          is_sold_separately: true,
        };

        if (product.description) {
          item.short_desc = product.description;
        }

        if (product.imageUrl) {
          item.head_img = product.imageUrl;
        }

        return item;
      });
  }

  _buildModifierGroups(products) {
    const seen = new Set();
    const groups = [];

    for (const product of products) {
      for (const group of product.addonGroups || []) {
        if (seen.has(group.id)) continue;
        seen.add(group.id);

        const modifierGroup = {
          app_modifier_group_id: group.integrationCode || group.id,
          modifier_group_name: group.name,
          is_required: group.isRequired ? 1 : 2,
          quantity_min_permitted: group.minQuantity ?? 0,
          quantity_max_permitted: group.maxQuantity ?? 1,
          buy_mode: group.type === 'single' ? 1 : 0,
          app_mg_items: (group.addons || []).map(addon => ({
            app_item_id: addon.integrationCode || addon.id,
            price: Math.round(addon.price * 100),
          })),
        };

        groups.push(modifierGroup);
      }
    }

    return groups;
  }
}

module.exports = new Food99MenuService();
