# Payment Skill

Formas de pagamento, cálculo de troco e informações sobre taxas via APIs REST.

## Quando Usar

- Cliente pergunta "quais formas de pagamento aceitam?"
- Cliente pergunta "aceitam PIX?"
- Cliente pergunta "quanto fica o troco?"
- Cliente paga em dinheiro e precisa de troco
- Cliente quer saber se tem taxa no cartão

## Ferramentas Disponíveis

### get_payment_methods(orderType?)

Retorna todas as formas de pagamento aceitas.

**Endpoint:** `GET /api/payment-methods/public/{restaurantId}`

**Input:**
```json
{
  "orderType": "DELIVERY"
}
```

**Output esperado:**
```json
{
  "methods": [
    {
      "id": "uuid-1",
      "name": "Dinheiro",
      "type": "CASH",
      "isActive": true,
      "allowDelivery": true,
      "allowPos": true,
      "feePercentage": 0,
      "daysToReceive": 0
    },
    {
      "id": "uuid-2",
      "name": "PIX",
      "type": "PIX",
      "isActive": true,
      "allowDelivery": true,
      "allowPos": true,
      "feePercentage": 0,
      "daysToReceive": 0
    },
    {
      "id": "uuid-3",
      "name": "Crédito",
      "type": "CREDIT_CARD",
      "isActive": true,
      "allowDelivery": true,
      "allowPos": true,
      "feePercentage": 3.5,
      "daysToReceive": 30
    }
  ]
}
```

**Como usar:** Quando cliente perguntar sobre formas de pagamento disponíveis. Filtre por `isActive: true` e verifique se `allowDelivery` é true para pedidos de entrega.

---

### calculate_change(totalAmount, paymentAmount)

Calcula o troco para pagamento em dinheiro.

**Input:**
```json
{
  "totalAmount": 70.90,
  "paymentAmount": 100.00
}
```

**Output:**
```json
{
  "total": 70.90,
  "paid": 100.00,
  "change": 29.10
}
```

**Como usar:** Cálculo local. Use quando cliente pagar em dinheiro e informar quanto vai entregar. Se `paymentAmount < totalAmount`, retorne erro informando valor faltante.

---

## Como Formatar Resposta ao Cliente

### Formas de Pagamento
```
💳 FORMAS DE PAGAMENTO

💵 Dinheiro
📱 PIX
💳 Crédito
💳 Débito

Escolha a melhor opção para você!
```

### Troco
```
💰 TROCO: R$ 29,10

Total: R$ 70,90
Pago: R$ 100,00
Troco: R$ 29,10
```

### Valor Exato
```
✅ Valor exato! Sem troco.
```

### Valor Insuficiente
```
⚠️ O valor informado (R$ 50,00) é menor que o total (R$ 70,90).

Faltam: R$ 20,90
```

---

## Regras Importantes

1. **SEMPRE confirme forma de pagamento** antes de criar pedido
2. **Se pagamento em dinheiro**, pergunte se precisa de troco e para quanto
3. **Informe taxas de cartão** se aplicável
4. **PIX é mais rápido** - incentive o uso
5. **Alguns métodos têm taxa** - informe ao cliente

---

## Fluxo de Conversa

1. Cliente pergunta opções → chame `get_payment_methods`
2. Cliente escolhe → confirme a forma
3. Se dinheiro → pergunte "precisa de troco?"
4. Se sim → calcule com `calculate_change`
5. Inclua forma de pagamento no resumo do pedido
