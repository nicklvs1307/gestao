# Payment Skill

Formas de pagamento, cálculo de troco e informações sobre taxas.

## Quando Usar

- Cliente pergunta "quais formas de pagamento aceitam?"
- Cliente pergunta "aceitam PIX?"
- Cliente pergunta "quanto fica o troco?"
- Cliente paga em dinheiro e precisa de troco
- Cliente quer saber se tem taxa no cartão

## Ferramentas Disponíveis

### get_payment_methods(orderType?)

Retorna todas as formas de pagamento aceitas.

**Input:**
```json
{
  "orderType": "DELIVERY"
}
// ou "PICKUP" ou omitido para todos
```

**Output:**
```json
[
  {
    "name": "Dinheiro",
    "type": "CASH",
    "allowDelivery": true,
    "allowPos": true,
    "feePercentage": 0,
    "daysToReceive": 0
  },
  {
    "name": "PIX",
    "type": "PIX",
    "allowDelivery": true,
    "allowPos": true,
    "feePercentage": 0,
    "daysToReceive": 0
  },
  {
    "name": "Crédito",
    "type": "CREDIT_CARD",
    "allowDelivery": true,
    "allowPos": true,
    "feePercentage": 3.5,
    "daysToReceive": 30
  }
]
```

**Como usar:** Quando cliente perguntar sobre formas de pagamento disponíveis.

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

**Como usar:** Quando cliente pagar em dinheiro e informar quanto vai entregar.

---

## Como Formatar Resposta ao Cliente

### Formas de Pagamento
```
💳 FORMAS DE PAGAMENTO

💵 Dinheiro
📱 PIX
💳 Crédito (3,5% taxa, recebe em 30 dias)
💳 Débito

Escolha a melhor opção para você!
```

### Troco
```
💰 TROCO: R$ 29,10

Total: R$ 70,90
Pago: R$ 100,00
Troco: R$ 29,10

✅ Pagamento confirmado!
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
4. **PIX é mais rápido** - Incentive o uso
5. **Alguns métodos têm taxa** - Informe ao cliente
6. **Dias para recebimento** - Pode variar por método

---

## Fluxo de Conversa

1. Cliente pergunta opções → chame `get_payment_methods`
2. Cliente escolhe → confirme a forma
3. Se dinheiro → pergunte "precisa de troco?"
4. Se sim → chame `calculate_change` com valor
5. Inclua forma de pagamento no resumo do pedido
