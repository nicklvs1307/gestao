# Order Skill

Criação, consulta, cancelamento e histórico de pedidos.

## Quando Usar

- Cliente quer fazer um pedido
- Cliente pergunta sobre status de pedido
- Cliente pergunta "meus pedidos" ou histórico
- Cliente quer cancelar um pedido
- Cliente quer repetir um pedido anterior

## Ferramentas Disponíveis

### search_customer(phone)

Busca cliente pelo telefone para identificação antes de criar pedido.

**Input:**
```json
{
  "phone": "5531999999999"
}
```

**Output:**
```json
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
```

**Como usar:** SEMPRE chame esta ferramenta ANTES de criar um pedido para identificar o cliente.

---

### create_customer(data)

Cria novo cadastro de cliente quando não existe.

**Input:**
```json
{
  "name": "João Silva",
  "phone": "5531999999999",
  "street": "Rua das Flores",
  "number": "123",
  "neighborhood": "Centro",
  "city": "Cidade",
  "state": "MG"
}
```

**Output:**
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

**Input:**
```json
{
  "items": [
    {
      "productId": "uuid-produto",
      "name": "Pizza Mussarela",
      "size": "Grande",
      "quantity": 1,
      "observations": "sem cebola",
      "addons": ["Catupiry"]
    }
  ],
  "customerName": "João Silva",
  "customerPhone": "5531999999999",
  "deliveryAddress": "Rua das Flores, 123 - Centro",
  "paymentMethod": "PIX",
  "orderType": "DELIVERY",
  "changeFor": 100.00,
  "notes": "tocar campainha"
}
```

**Output:**
```json
{
  "id": "uuid-pedido",
  "status": "PENDING",
  "total": 70.90,
  "items": [...],
  "createdAt": "2024-01-01T12:00:00Z"
}
```

**Como usar:** 
- APENAS após apresentar resumo completo E cliente confirmar
- Inclua TODOS os itens com preços
- Inclua endereço completo se delivery
- Inclua forma de pagamento

---

### check_order_status(phone?, orderId?)

Verifica status do pedido mais recente ou de um pedido específico.

**Input:**
```json
{
  "phone": "5531999999999"
}
// ou
{
  "orderId": "uuid-pedido"
}
```

**Output:**
```json
{
  "id": "uuid-pedido",
  "status": "PREPARING",
  "createdAt": "2024-01-01T12:00:00Z",
  "items": [
    {
      "product": { "name": "Pizza Mussarela" },
      "quantity": 1
    }
  ],
  "total": 70.90,
  "deliveryOrder": {
    "deliveryType": "delivery",
    "address": "Rua das Flores, 123"
  }
}
```

**Status possíveis:**
- `BUILDING` - Montando
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

**Input:**
```json
{
  "phone": "5531999999999"
}
```

**Output:**
```json
[
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
```

**Como usar:** Quando cliente perguntar "meus pedidos" ou quiser repetir um pedido.

---

### cancel_order(orderId, phone, reason?)

Solicita cancelamento de pedido. Apenas se ainda não estiver em preparo.

**Input:**
```json
{
  "orderId": "uuid-pedido",
  "phone": "5531999999999",
  "reason": "Cliente pediu"
}
```

**Output:**
```json
{
  "id": "uuid-pedido",
  "status": "CANCELED"
}
```

**Como usar:** Quando cliente pedir para cancelar. Informe se já está em preparo e não pode cancelar.

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
8. **APÓS confirmação** - chame `create_order`
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
