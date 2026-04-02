# Delivery Skill

Verifica áreas de entrega, calcula taxas e informa tempo estimado.

## Quando Usar

- Cliente pergunta "vocês entregam no bairro X?"
- Cliente pergunta "quanto custa a entrega?"
- Cliente pergunta "quanto tempo demora a entrega?"
- Cliente informa endereço para delivery
- Cliente pergunta se entregamos em determinada região

## Ferramentas Disponíveis

### check_delivery_area(address?, neighborhood?)

Verifica se um endereço está dentro da área de entrega do restaurante.

**Input:**
```json
{
  "address": "Rua das Flores, 123",
  "neighborhood": "Centro"
}
// ou apenas
{
  "neighborhood": "Centro"
}
```

**Output:**
```json
{
  "name": "Centro",
  "fee": 5.00,
  "type": "AREA"
}
```

**Como usar:** Quando cliente informar endereço ou bairro. Use para validar se fazemos entrega.

---

### get_delivery_fee(area?)

Retorna a taxa de entrega padrão e taxas por área.

**Input:**
```json
{
  "area": "Centro"
}
// ou vazio para todas as áreas
```

**Output:**
```json
{
  "defaultFee": 5.00,
  "areas": [
    { "name": "Centro", "fee": 5.00 },
    { "name": "Bairro Novo", "fee": 8.00 },
    { "name": "Zona Rural", "fee": 15.00 }
  ]
}
```

**Como usar:** Quando cliente perguntar "quanto custa a entrega?".

---

### get_delivery_time()

Retorna o tempo estimado de entrega.

**Input:**
```json
{}
```

**Output:**
```json
{
  "deliveryTime": "30-40 min"
}
```

**Como usar:** Quando cliente perguntar "quanto tempo demora?" ou "qual o prazo?".

---

## Como Formatar Resposta ao Cliente

### Entrega Disponível
```
✅ Entregamos na região do Centro!

Taxa de entrega: R$ 5,00
Tempo estimado: 30-40 minutos
```

### Entrega Não Disponível
```
😔 Não entregamos na região do Bairro X.

Áreas de entrega disponíveis:
• Centro - R$ 5,00
• Bairro Novo - R$ 8,00

Que tal retirar no local? É rápido e sem taxa! 📦
```

### Taxas de Entrega
```
📍 TAXAS DE ENTREGA

• Centro: R$ 5,00
• Bairro Novo: R$ 8,00
• Zona Rural: R$ 15,00

Taxa padrão: R$ 5,00
```

### Tempo de Entrega
```
⏱️ TEMPO ESTIMADO DE ENTREGA: 30-40 minutos

O tempo pode variar dependendo da demanda e distância.
Em horários de pico (19h-21h), pode levar um pouco mais.
```

---

## Regras Importantes

1. **SEMPRE verifique área de entrega** antes de confirmar pedido delivery
2. **Informe taxa de entrega** ao cliente antes de criar pedido
3. **Informe tempo estimado** para cliente saber quando chega
4. **Se área não coberta**, ofereça opção de retirada (PICKUP)
5. **Algumas áreas têm taxas diferentes** - verifique com `get_delivery_fee`
6. **Horário de pico** pode aumentar o tempo - avise o cliente

---

## Fluxo de Conversa

1. Cliente informa endereço → chame `check_delivery_area`
2. Se não covered → ofereça pickup
3. Cliente pergunta preço → chame `get_delivery_fee`
4. Cliente pergunta tempo → chame `get_delivery_time`
5. Inclua taxa no resumo do pedido antes de confirmar
