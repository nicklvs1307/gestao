const { z } = require('zod');

// Schemas auxiliares para itens complexos (JSONs legados e novos)
const AddonSchema = z.object({
  id: z.string().optional(),
  quantity: z.number().default(1),
});

const FlavorSchema = z.object({
  id: z.string(),
});

const SizeSchema = z.object({
  id: z.string().optional(),
});

// Schema do Item do Pedido
const OrderItemSchema = z.object({
  productId: z.string({ required_error: "ID do produto é obrigatório" }),
  quantity: z.number().min(1, "Quantidade deve ser pelo menos 1"),
  observations: z.string().optional(),
  observation: z.string().optional(), // Compatibilidade legado
  
  // Campos de IDs diretos
  sizeId: z.string().nullable().optional(),
  addonsIds: z.array(z.string()).optional(),
  flavorIds: z.array(z.string()).optional(),

  // Campos JSON Legados (Frontend envia strings JSON ou objetos)
  sizeJson: z.union([z.string(), z.record(z.any())]).optional(),
  addonsJson: z.union([z.string(), z.array(z.any())]).optional(),
  flavorsJson: z.union([z.string(), z.array(z.any())]).optional(),
}).transform((item) => {
  // Lógica de transformação para normalizar dados (substituindo o _extractIdsFromItem)
  let sizeId = item.sizeId || null;
  let addonsIds = item.addonsIds || [];
  let flavorIds = item.flavorIds || [];

  // Extrair Size
  if (!sizeId && item.sizeJson) {
    try {
      const sizeObj = typeof item.sizeJson === 'string' ? JSON.parse(item.sizeJson) : item.sizeJson;
      if (sizeObj?.id) sizeId = sizeObj.id;
    } catch (e) {}
  }

  // Extrair Addons
  if (addonsIds.length === 0 && item.addonsJson) {
    try {
      const addonsArr = typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson;
      if (Array.isArray(addonsArr)) {
        addonsArr.forEach(a => {
          const qty = a.quantity || 1;
          for (let i = 0; i < qty; i++) {
            if (a.id) addonsIds.push(a.id);
          }
        });
      }
    } catch (e) {}
  }

  // Extrair Flavors
  if (flavorIds.length === 0 && item.flavorsJson) {
    try {
      const flavorsArr = typeof item.flavorsJson === 'string' ? JSON.parse(item.flavorsJson) : item.flavorsJson;
      if (Array.isArray(flavorsArr)) {
        flavorIds = flavorsArr.map(f => f.id).filter(Boolean);
      }
    } catch (e) {}
  }

  return {
    productId: item.productId,
    quantity: item.quantity,
    observations: item.observations || item.observation,
    sizeId,
    addonsIds,
    flavorIds,
    // Mantemos os originais caso o Service precise salvar no banco como JSON histórico
    sizeJson: item.sizeJson,
    addonsJson: item.addonsJson,
    flavorsJson: item.flavorsJson
  };
});

// Schema para Criação de Pedido Delivery
const CreateDeliveryOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, "Carrinho vazio"),
  deliveryInfo: z.object({
    paymentMethod: z.string().optional(),
    // Adicione outros campos de deliveryInfo se necessário validar
  }).passthrough().optional(),
  orderType: z.enum(['DELIVERY', 'TABLE', 'PICKUP']).default('DELIVERY'),
  tableNumber: z.number().optional(),
  userId: z.string().optional(),
  customerName: z.string().optional(),
  paymentMethod: z.string().optional(),
});

// Schema para Adicionar Itens (Mesa/Comanda)
const AddItemsSchema = z.object({
  items: z.array(OrderItemSchema).min(1, "Nenhum item para adicionar"),
  userId: z.string().optional(),
});

// Schema para Status Update
const UpdateStatusSchema = z.object({
  status: z.enum([
    'BUILDING', 'PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELED'
  ], { required_error: "Status inválido" })
});

module.exports = {
  CreateDeliveryOrderSchema,
  AddItemsSchema,
  UpdateStatusSchema
};