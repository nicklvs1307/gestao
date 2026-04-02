# Loyalty Skill

Programa de fidelidade: pontos, cashback e benefícios.

## Quando Usar

- Cliente pergunta "o que é fidelidade?"
- Cliente pergunta "como funciona o programa de pontos?"
- Cliente pergunta "quantos pontos tenho?"
- Cliente pergunta "tenho cashback?"
- Cliente pergunta sobre benefícios do programa

## Ferramentas Disponíveis

### get_loyalty_info()

Retorna informações sobre o programa de fidelidade do restaurante.

**Input:**
```json
{}
```

**Output:**
```json
{
  "enabled": true,
  "pointsPerReal": 1,
  "cashbackPercentage": 5,
  "description": "A cada R$ 1,00 gasto você ganha 1 ponto",
  "benefits": [
    "Acumule pontos a cada pedido",
    "Troque pontos por descontos",
    "Cashback automático em cada compra"
  ]
}
```

**Como usar:** Use quando cliente perguntar sobre o programa de fidelidade, como funciona, vantagens.

---

### get_loyalty_balance(phone)

Consulta saldo de pontos e cashback de um cliente.

**Input:**
```json
{
  "phone": "5531999999999"
}
```

**Output:**
```json
{
  "name": "João Silva",
  "loyaltyPoints": 150,
  "cashbackBalance": 25.00,
  "nextMilestone": 200,
  "pointsToNextBenefit": 50
}
```

**Como usar:** Use quando cliente perguntar "quantos pontos tenho?" ou "meu saldo".

---

## Como Formatar Resposta ao Cliente

### Informações do Programa
```
💎 PROGRAMA DE FIDELIDADE

📊 Como funciona:
• A cada R$ 1,00 gasto, você ganha 1 ponto
• Cashback: 5% do valor do pedido volta como crédito

🎁 Benefícios:
• Acumule pontos a cada pedido
• Troque pontos por descontos e brindes
• Ganhe cashback automático em cada compra

Faça seu cadastro para começar a acumular!
```

### Saldo do Cliente
```
💎 SEU SALDO DE FIDELIDADE

⭐ João Silva
Pontos: 150
💰 Cashback: R$ 25,00

🎯 Faltam apenas 50 pontos para o próximo benefício!
```

### Programa Inativo
```
😔 O programa de fidelidade ainda não está ativo neste restaurante.

Em breve terá muitas vantagens para nossos clientes!
```

---

## Regras Importantes

1. **Informe sobre fidelidade** a clientes cadastrados
2. **Pontos acumulam** a cada pedido realizado
3. **Cashback** é crédito para próximos pedidos
4. **Cliente não cadastrado** - incentive o cadastro
5. **Mostre benefícios** para motivar fidelidade

---

## Fluxo de Conversa

1. Cliente pergunta sobre fidelidade → chame `get_loyalty_info`
2. Cliente pergunta saldo → chame `get_loyalty_balance`
3. Cliente não cadastrado → incentive cadastro
4. Mostre benefícios do programa para fidelizar
