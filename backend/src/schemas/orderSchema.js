const { z } = require('zod');

// Schema para Itens do Pedido
const orderItemSchema = z.object({
  id: z.string().optional(), // Pode ser um produto existente ou item novo
  productId: z.string().min(1, 'Produto é obrigatório'),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
  observations: z.string().optional(),
  
  // Detalhes opcionais
  size: z.object({
    name: z.string(),
    price: z.number()
  }).optional().nullable(),
  
  addons: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    price: z.number()
  })).optional().default([]),
  
  flavors: z.array(z.object({
    id: z.string(), // ID do produto sabor
    name: z.string()
  })).optional()
});

// Schema para Pedido Delivery
const CreateDeliveryOrderSchema = z.object({
  restaurantId: z.string().optional(), // Pode vir da rota ou token
  
  items: z.array(orderItemSchema).min(1, 'O pedido deve ter pelo menos 1 item'),
  
  orderType: z.enum(['DELIVERY', 'PICKUP']).default('DELIVERY'),
  
  deliveryInfo: z.object({
    customerName: z.string().min(1, 'Nome do cliente é obrigatório'),
    customerPhone: z.string().min(8, 'Telefone inválido'),
    
    // Endereço (Obrigatório se for Delivery)
    address: z.object({
      street: z.string().optional(),
      number: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      zipCode: z.string().optional(),
      complement: z.string().optional()
    }).optional(),

    deliveryType: z.enum(['delivery', 'pickup']),
    paymentMethod: z.string().min(1, 'Forma de pagamento obrigatória'),
    changeFor: z.number().optional(),
  }),

  // Campos opcionais de compatibilidade
  paymentMethod: z.string().optional(), 
  tableNumber: z.number().optional(),
  userId: z.string().optional()
});

// Schema para Adicionar Itens (Mesa ou Delivery)
const AddItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  userId: z.string().optional()
});

// Schema para Atualizar Status
const UpdateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELED'])
});

module.exports = {
  CreateDeliveryOrderSchema,
  AddItemsSchema,
  UpdateStatusSchema,
  orderItemSchema
};
