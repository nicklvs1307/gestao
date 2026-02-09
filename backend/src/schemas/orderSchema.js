const { z } = require('zod');

// Schema para Itens do Pedido
const orderItemSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
  observations: z.string().optional().nullable(),
  
  // IDs para Cálculo (PricingService)
  sizeId: z.string().optional().nullable(),
  addonsIds: z.array(z.string()).optional().default([]),
  flavorIds: z.array(z.string()).optional().default([]),

  // Detalhes para exibição (Opcionais)
  size: z.object({
    name: z.string(),
    price: z.number()
  }).optional().nullable(),
  
  addons: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().optional()
  })).optional().default([]),
  
  flavors: z.array(z.object({
    id: z.string(),
    name: z.string()
  })).optional().nullable()
});

// Schema para Pedido Delivery
const CreateDeliveryOrderSchema = z.object({
  restaurantId: z.string().optional().nullable(), // Pode vir da rota ou token
  
  items: z.array(orderItemSchema).min(1, 'O pedido deve ter pelo menos 1 item'),
  
  orderType: z.enum(['DELIVERY', 'PICKUP']).default('DELIVERY'),
  
  deliveryInfo: z.object({
    name: z.string().min(1, 'Nome do cliente é obrigatório'),
    phone: z.string().min(8, 'Telefone inválido'),
    
    // Endereço (Opcional, pode ser string ou objeto)
    address: z.union([
      z.string(),
      z.object({
        street: z.string().optional().nullable(),
        number: z.string().optional().nullable(),
        neighborhood: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        zipCode: z.string().optional().nullable(),
        complement: z.string().optional().nullable()
      })
    ]).optional().nullable(),

    deliveryType: z.enum(['delivery', 'pickup']),
    paymentMethod: z.string().min(1, 'Forma de pagamento obrigatória'),
    changeFor: z.number().optional().nullable(),
  }),

  // Campos opcionais de compatibilidade
  paymentMethod: z.string().optional().nullable(), 
  tableNumber: z.number().optional().nullable(),
  userId: z.string().optional().nullable()
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
