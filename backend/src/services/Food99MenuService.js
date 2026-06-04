const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99AuthService = require('./Food99AuthService');
const Food99ImageService = require('./Food99ImageService');
const { requestWithRetry, UPLOAD_TIMEOUT } = require('../lib/food99Client');
const food99Config = require('../config/food99');

class Food99MenuService {

  async _getAuthToken(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings?.food99AppShopId) {
      throw new Error('Configuração 99Food não encontrada para este restaurante');
    }

    const authToken = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!authToken) {
      throw new Error('Não foi possível obter token válido para 99Food');
    }

    return { authToken, settings };
  }

  async syncMenu(restaurantId) {
    const { authToken, settings } = await this._getAuthToken(restaurantId);

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
        categories: {
          select: {
            id: true,
            name: true,
            availableDays: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // Auto-upload de imagens (se habilitado)
    let imageMap = new Map();
    if (settings.food99AutoUploadImages !== false) {
      imageMap = await this._uploadProductImages(restaurantId, products);
    }

    const menus = this._buildMenus(categories);
    const categoriesPayload = this._buildCategories(categories, products);
    const itemsPayload = this._buildItems(products, imageMap);
    const modifierGroupsPayload = this._buildModifierGroups(products);

    const payload = {
      auth_token: authToken,
      menus,
      categories: categoriesPayload,
      items: itemsPayload,
      modifier_groups: modifierGroupsPayload,
    };

    logger.info(`[FOOD99 MENU] Enviando cardápio para restaurante ${restaurantId}: ${menus.length} menus, ${categoriesPayload.length} categorias, ${itemsPayload.length} itens, ${modifierGroupsPayload.length} grupos`);

    const env = settings.food99Env;
    const result = await requestWithRetry({
      method: 'post',
      url: '/v3/item/item/upload',
      env,
      data: payload,
      timeout: UPLOAD_TIMEOUT,
      logContext: 'Erro ao sincronizar cardápio',
      retries: 3,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao sincronizar cardápio');
    }

    const data = result.data || {};
    const taskId = data.taskID || data.taskId;

    if (!taskId) {
      logger.error(`[FOOD99 MENU] Upload não retornou taskId. Resposta: ${JSON.stringify(data).slice(0, 300)}`);
      throw new Error('Upload não retornou taskId (pode ter sido rate-limited ou rejeitado pela API)');
    }

    logger.info(`[FOOD99 MENU] Cardápio enviado com sucesso (taskId=${taskId})`);
    return { success: true, taskId, data, imagesUploaded: imageMap.size };
  }

  /**
   * Faz upload de todas as imagens de produtos (com cache para evitar re-upload).
   * Retorna Map<productId, giftUrl>.
   */
  async _uploadProductImages(restaurantId, products) {
    const imageMap = new Map();
    const productsWithImage = products.filter(p => p.imageUrl);

    if (productsWithImage.length === 0) return imageMap;

    logger.info(`[FOOD99 MENU] Auto-upload de ${productsWithImage.length} imagens...`);

    for (const product of productsWithImage) {
      try {
        const result = await Food99ImageService.uploadFromUrl(
          restaurantId,
          product.imageUrl,
          `product-${product.id}`
        );
        if (result.giftUrl) {
          imageMap.set(product.id, result.giftUrl);
        }
      } catch (err) {
        // Não bloqueia sync do cardápio se imagem falhar
        logger.warn(`[FOOD99 MENU] Falha upload imagem do produto ${product.id}: ${err.message}`);
      }
    }

    return imageMap;
  }

  async getMenuStatus(restaurantId, taskId) {
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    const result = await requestWithRetry({
      method: 'get',
      url: '/v1/item/item/getMenuTaskInfo',
      env,
      params: { auth_token: authToken, task_id: taskId },
      logContext: `Erro ao consultar status (task ${taskId})`,
    });

    if (!result.ok) {
      // errno 10001 = task not found (task finalizado ou inexistente)
      if (result.data?.errno === 10001 || result.error?.includes('not found')) {
        return {
          success: true,
          taskId,
          status: 'failed',
          rawStatus: 2,
          message: 'Task não encontrada (pode ter expirado)',
        };
      }
      throw new Error(result.error || 'Falha ao consultar status');
    }

    const data = result.data || {};
    return {
      success: true,
      taskId: data.taskID,
      status: food99Config.mapMenuTaskStatus(data.status),
      rawStatus: data.status,
      message: data.message,
      createTime: data.createTime,
      operationList: data.operationList,
      appShopID: data.appShopID,
    };
  }

  async getCurrentMenu(restaurantId) {
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    const result = await requestWithRetry({
      method: 'get',
      url: '/v3/item/item/list',
      env,
      params: { auth_token: authToken },
      logContext: 'Erro ao buscar cardápio atual',
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao buscar cardápio atual');
    }

    const data = result.data || {};
    return {
      success: true,
      menus: data.menus || [],
      categories: data.categories || [],
      items: data.items || [],
      modifierGroups: data.modifier_groups || [],
    };
  }

  async updateItemStatus(restaurantId, integrationCode, available) {
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;
    const status = available ? 1 : 2;

    // Endpoint documentado: v1 usa app_item_id (singular)
    // v3 updateItemStatus não está documentado no swagger
    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/item/item/updateItemStatus',
      env,
      data: { auth_token: authToken, app_item_id: String(integrationCode), status },
      logContext: `Erro ao atualizar status do item ${integrationCode}`,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao atualizar status do item');
    }

    return {
      success: true,
      integrationCode,
      status,
    };
  }

  /**
   * Atualiza múltiplos itens em lote (loop em v1, pois v1 aceita um por vez).
   * Retorna listas de sucesso/falha.
   */
  async updateItemStatusBatch(restaurantId, integrationCodes, available) {
    const success = [];
    const failed = [];
    const status = available ? 1 : 2;

    for (const code of integrationCodes) {
      try {
        await this.updateItemStatus(restaurantId, code, available);
        success.push(code);
      } catch (err) {
        logger.error(`[FOOD99 MENU] Falha ao atualizar status do item ${code}: ${err.message}`);
        failed.push({ code, error: err.message });
      }
    }

    return { success, failed, status };
  }

  async uploadImage(restaurantId, imageUrl, ext) {
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    const body = { auth_token: authToken, image_url: imageUrl };
    if (ext) body.ext = ext;

    const result = await requestWithRetry({
      method: 'post',
      url: '/v3/image/image/uploadImage',
      env,
      data: body,
      timeout: UPLOAD_TIMEOUT,
      logContext: `Erro ao enviar imagem ${imageUrl}`,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao enviar imagem');
    }

    return { success: true, data: result.data };
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

  _buildItems(products, imageMap = new Map()) {
    return products
      .filter(p => p.showInMenu)
      .map(product => {
        const item = {
          app_item_id: this._safeAppItemId(product.integrationCode || product.id),
          item_name: product.name,
          price: Math.round(product.price * 100),
          is_sold_separately: true,
        };

        if (product.description) item.short_desc = product.description;

        // Prioriza URL uploaded (99Food storage) sobre URL externa
        const uploadedImage = imageMap.get(product.id);
        if (uploadedImage) {
          item.head_img = uploadedImage;
        } else if (product.imageUrl) {
          item.head_img = product.imageUrl;
        }

        // Combo: se o produto tem tag 'combo' OU tem múltiplos addon groups,
        // marca como additional_type=1 (combo) — requer configuração manual de items
        const isCombo = (product.tags || []).some(t => /combo/i.test(t));
        if (isCombo) {
          item.additional_type = 1;
        }

        // tax_rate: swagger aceita por 10000 (ex: 5% = 500)
        if (product.taxPercentage && product.taxPercentage > 0) {
          item.tax_rate = Math.round(product.taxPercentage * 10000 / 100);
        }

        // sold_info_intl: horários de venda derivados de Category (categoria herda)
        const soldInfo = this._buildSoldInfoFromCategory(product);
        if (soldInfo) {
          item.sold_info_intl = soldInfo;
        }

        return item;
      });
  }

  /**
   * Sanitiza app_item_id para evitar caracteres problemáticos que a 99Food possa rejeitar.
   * Limita tamanho a 64 caracteres (segurança).
   */
  _safeAppItemId(id) {
    if (!id) return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const str = String(id).replace(/[^a-zA-Z0-9_\-]/g, '_');
    return str.length > 64 ? str.slice(0, 64) : str;
  }

  /**
   * Converte configuração de disponibilidade da categoria (Category)
   * para o formato sold_info_intl da 99Food.
   *
   * Schema local:
   *   - availableDays: "1,2,3,4,5,6,7" (0=Dom, 1=Seg ... 6=Sáb — convenção PT-BR)
   *   - startTime: "HH:mm"
   *   - endTime: "HH:mm"
   *
   * Schema 99Food sold_info_intl:
   *   [{ time: [{begin:"HH:mm", end:"HH:mm"}], day: [1-7], specialDay: ["YYYY-MM-DD"] }]
   */
  _buildSoldInfoFromCategory(product) {
    if (!product.categories || product.categories.length === 0) return null;
    const category = product.categories[0];

    if (!category.availableDays && !category.startTime && !category.endTime) return null;

    let days = [];
    if (category.availableDays) {
      days = String(category.availableDays)
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(n => !isNaN(n));
      // Converte 0-6 (Dom-Sáb) → 1-7 (Seg-Dom) usado pela 99Food
      days = days.map(d => d === 0 ? 7 : d);
    }

    if (days.length === 0 && !category.startTime) return null;

    const time = (category.startTime && category.endTime)
      ? [{ begin: category.startTime, end: category.endTime }]
      : [];

    return [{ time, day: days, specialDay: [] }];
  }

  _buildModifierGroups(products) {
    const seen = new Set();
    const groups = [];

    for (const product of products) {
      for (const group of product.addonGroups || []) {
        if (seen.has(group.id)) continue;
        seen.add(group.id);

        groups.push({
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
        });
      }
    }

    return groups;
  }
}

module.exports = new Food99MenuService();
