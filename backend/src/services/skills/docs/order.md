# Order Skill

Criação, consulta, cancelamento e histórico de pedidos via APIs REST.

## Quando Usar

- Cliente quer fazer um pedido
- Cliente pergunta sobre status de pedido
- Cliente pergunta "meus pedidos" ou histórico
- Cliente quer cancelar um pedido
- Cliente quer repetir um pedido anterior

## Ferramentas Disponíveis

### search_customer(phone)

Busca cliente pelo telefone para identificação antes de criar pedido.

**Endpoint:** `GET /api/customers/search?q={phone}`

**Input:**
```json
{
  "phone": "5531999999999"
}
```

**Output esperado:**
```json
{
  "customers": [
    {
      "id": "uuid-cliente",
      "name": "João Silva",
      "phone": "5531999999999",
      "street": "Rua das Flores",
      "number": "123",
      "neighborhood": "Centro",
      "city": "Cidade",
      "state": "MG",
      "loyaltyPoints": 150,
      "cashbackBalance": 25.00
    }
  ]
}
```

**Se não encontrar:**
```json
{
  "customers": []
}
```

**Como usar:** SEMPRE chame esta ferramenta ANTES de criar um pedido para identificar o cliente. Se retornar array vazio, ofereça `create_customer`.

---

### create_customer(data)

Cria novo cadastro de cliente quando não existe.

**Endpoint:** `POST /api/customers`

**Input:**
```json
{
  "restaurantId": "uuid-restaurante",
  "name": "João Silva",
  "phone": "5531999999999",
  "street": "Rua das Flores",
  "number": "123",
  "neighborhood": "Centro",
  "city": "Cidade",
  "state": "MG"
}
```

**Output esperado:**
```json
{
  "id": "uuid-cliente",
  "name": "João Silva",
  "phone": "5531999999999"
}
```

**Como usar:** Use quando o cliente não estiver cadastrado e quiser fazer pedido.

---

### create_order(data)

**FINALIZA e REGISTRA um pedido no sistema.** Use APENAS após o cliente confirmar TODOS os itens.

**Endpoint:** `POST /api/delivery/restaurants/{restaurantId}/delivery-orders`

**Input esperado pela API (CreateDeliveryOrderSchema):**
```json
{
  "items": [
    {
      "productId": "uuid-produto",
      "quantity": 1,
      "observations": "sem cebola",
      "sizeId": "uuid-tamanho",
      "size": { "name": "Grande", "price": 65.90 },
      "addonsIds": ["uuid-addon-1"],
      "addons": [
        { "name": "Catupiry", "price": 5.00, "quantity": 1 }
      ]
    }
  ],
  "orderType": "DELIVERY",
  "deliveryInfo": {
    "name": "João Silva",
    "phone": "5531999999999",
    "address": "Rua das Flores, 123 - Centro",
    "deliveryType": "delivery",
    "paymentMethod": "PIX",
    "changeFor": 100.00,
    "deliveryFee": 5.00
  }
}
```

**Campos obrigatórios:**
- `items[]` - mínimo 1 item, cada item precisa de `productId` e `quantity`
- `orderType` - "DELIVERY", "PICKUP" ou "TABLE"
- `deliveryInfo.name` - nome do cliente
- `deliveryInfo.phone` - telefone do cliente

**Campos opcionais:**
- `deliveryInfo.address` - endereço (obrigatório para DELIVERY)
- `deliveryInfo.paymentMethod` - forma de pagamento
- `deliveryInfo.changeFor` - troco para (se dinheiro)
- `deliveryInfo.deliveryFee` - taxa de entrega
- `items[].observations` - observações do item
- `items[].size` - tamanho selecionado
- `items[].addons` - adicionais selecionados

**Output esperado (sucesso - 201):**
```json
{
  "id": "uuid-pedido",
  "status": "PENDING",
  "orderType": "DELIVERY",
  "total": 70.90,
  "items": [...],
  "deliveryOrder": {
    "name": "João Silva",
    "phone": "5531999999999",
    "address": "Rua das Flores, 123 - Centro",
    "deliveryType": "delivery",
    "paymentMethod": "PIX",
    "deliveryFee": 5.00
  },
  "createdAt": "2024-01-01T12:00:00Z"
}
```

**Output esperado (erro - 400):**
```json
{
  "message": "O pedido deve ter pelo menos 1 item",
  "errors": [...]
}
```

**Como usar:**
- APENAS após apresentar resumo completo E cliente confirmar
- `orderType` deve ser "DELIVERY" para entregas, "PICKUP" para retirada
- Se `paymentMethod` for "Dinheiro" e `changeFor` > 0, o sistema calcula troco
- A API calcula o total automaticamente baseado nos preços dos produtos

---

### check_order_status(phone?, orderId?)

Verifica status do pedido mais recente ou de um pedido específico.

**Endpoint (por orderId):** `GET /api/delivery/order/{orderId}`

**Endpoint (último pedido):** `GET /api/admin/orders?phone={phone}`

**Input:**
```json
{
  "phone": "5531999999999"
}
```

**Output esperado:**
```json
{
  "id": "uuid-pedido",
  "status": "PREPARING",
  "orderType": "DELIVERY",
  "total": 70.90,
  "items": [
    {
      "product": { "name": "Pizza Mussarela" },
      "quantity": 1,
      "priceAtTime": 65.90
    }
  ],
  "deliveryOrder": {
    "deliveryType": "delivery",
    "address": "Rua das Flores, 123"
  },
  "createdAt": "2024-01-01T12:00:00Z"
}
```

**Status possíveis:**
- `PENDING` - Aguardando restaurante
- `PREPARING` - Em preparo
- `READY` - Pronto
- `SHIPPED` - Saiu para entrega
- `DELIVERED` - Entregue
- `CANCELED` - Cancelado

**Como usar:** Quando cliente perguntar "meu pedido está pronto?" ou similar.

---

### get_order_history(phone)

Retorna histórico de pedidos recentes do cliente.

**Endpoint:** `GET /api/admin/orders?phone={phone}`

**Input:**
```json
{
  "phone": "5531999999999"
}
```

**Output esperado:**
```json
{
  "orders": [
    {
      "id": "uuid-pedido",
      "createdAt": "2024-01-01T12:00:00Z",
      "status": "DELIVERED",
      "total": 70.90,
      "items": [
        { "product": { "name": "Pizza Mussarela" }, "quantity": 1 }
      ]
    }
  ]
}
```

**Como usar:** Quando cliente perguntar "meus pedidos" ou quiser repetir um pedido.

---

### cancel_order(orderId, phone, reason?)

Solicita cancelamento de pedido. Apenas se ainda não estiver em preparo.

**Endpoint:** `PUT /api/admin/orders/{orderId}/status`

**Input:**
```json
{
  "orderId": "uuid-pedido",
  "status": "CANCELED",
  "reason": "Cliente pediu"
}
```

**Output esperado (sucesso):**
```json
{
  "id": "uuid-pedido",
  "status": "CANCELED"
}
```

**Output esperado (erro - já em preparo):**
```json
{
  "message": "Pedido já está em preparo e não pode ser cancelado"
}
```

**Como usar:** Quando cliente pedir para cancelar. Informe se já está em preparo e não pode cancelar. Apenas pedidos com status `PENDING` podem ser cancelados.

---

## Como Formatar Resposta ao Cliente

### Resumo de Pedido (antes de confirmar)
```
🍕 RESUMO DO PEDIDO

1x Pizza Mussarela (Grande) - R$ 65,90
  + Borda Catupiry - R$ 5,00

Taxa de entrega - R$ 5,00

━━━━━━━━━━━━━━━━━━━━━━
TOTAL: R$ 70,90

📍 Entrega: Rua das Flores, 123 - Centro
💳 Pagamento: PIX

Confirma o pedido?
```

### Pedido Confirmado
```
✅ PEDIDO CONFIRMADO!

#12345

Seu pedido foi enviado para a cozinha! 🍳

Tempo estimado: 30-40 minutos
```

---

## Fluxo Completo de Pedido (SIGA ESTA ORDEM)

1. **Identifique o cliente** - chame `search_customer` com telefone do contato
2. **Se não cadastrado** - ofereça `create_customer`
3. **Mostre o cardápio** - chame `get_menu` ou `search_products`
4. **Ajude a escolher** - tamanhos, adicionais
5. **Monte o resumo** com TODOS os itens e preços
6. **Calcule TOTAL** - inclua taxa de entrega se delivery
7. **Peça CONFIRMAÇÃO** - "Posso confirmar seu pedido?"
8. **APÓS confirmação** - chame `create_order` com o formato exato da API
9. **Informe número do pedido** e tempo estimado

---

## Regras Importantes

1. **NUNCA crie pedido sem resumo e confirmação explícita**
2. **NUNCA invente preços** - sempre consulte o cardápio
3. **Sempre identifique o cliente** antes de criar pedido
4. **Confirme endereço** antes de criar para delivery
5. **Confirme forma de pagamento** antes de criar
6. **Se pagamento em dinheiro**, pergunte sobre troco
7. **Verifique se produto está disponível** antes de adicionar ao pedido
8. **orderType** deve ser "DELIVERY" para entregas, "PICKUP" para retirada
9. **Cada item precisa de productId** - nunca envie apenas o nome do produto
