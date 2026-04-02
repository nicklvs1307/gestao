# Store Info Skill

Informações gerais da loja: horários, políticas, FAQ, endereço e dados gerais.

## Quando Usar

- Cliente pergunta horário de funcionamento
- Cliente pergunta "vocês estão abertos?"
- Cliente pergunta sobre políticas (cancelamento, devolução)
- Cliente pergunta onde ficam, endereço, telefone
- Cliente faz pergunta geral que não é sobre cardápio ou pedido
- Cliente pergunta FAQ, dúvidas frequentes

## Ferramentas Disponíveis

### get_store_info(query)

Busca informações na base de conhecimento (FAQ, políticas, regras).

**Input:**
```json
{
  "query": "cancelamento"
}
```

**Output:**
```json
[
  {
    "question": "Qual a política de cancelamento?",
    "answer": "Pedidos podem ser cancelados antes do preparo sem custo. Após o preparo, é necessário contato telefônico.",
    "category": "políticas"
  }
]
```

**Como usar:** Use para qualquer dúvida sobre políticas, regras, FAQ que não seja sobre cardápio ou pedidos.

---

### get_operating_hours()

Retorna horários de funcionamento por dia da semana.

**Input:**
```json
{}
```

**Output:**
```json
{
  "hours": [
    { "dayOfWeek": 0, "dayName": "Domingo", "isClosed": false, "openingTime": "18:00", "closingTime": "23:00" },
    { "dayOfWeek": 1, "dayName": "Segunda", "isClosed": true },
    { "dayOfWeek": 2, "dayName": "Terça", "isClosed": false, "openingTime": "18:00", "closingTime": "23:00" },
    { "dayOfWeek": 3, "dayName": "Quarta", "isClosed": false, "openingTime": "18:00", "closingTime": "23:00" },
    { "dayOfWeek": 4, "dayName": "Quinta", "isClosed": false, "openingTime": "18:00", "closingTime": "23:00" },
    { "dayOfWeek": 5, "dayName": "Sexta", "isClosed": false, "openingTime": "18:00", "closingTime": "23:00" },
    { "dayOfWeek": 6, "dayName": "Sábado", "isClosed": false, "openingTime": "18:00", "closingTime": "00:00" }
  ],
  "isOpenNow": false
}
```

**Como usar:** Use quando cliente perguntar horários ou se está aberto.

---

### get_restaurant_info()

Retorna informações básicas do restaurante.

**Input:**
```json
{}
```

**Output:**
```json
{
  "name": "Restaurante Exemplo",
  "address": "Rua das Flores, 123",
  "city": "Cidade",
  "state": "MG",
  "phone": "(31) 99999-9999"
}
```

**Como usar:** Use quando cliente perguntar onde ficam, endereço, telefone.

---

## Como Formatar Resposta ao Cliente

### Horários de Funcionamento
```
🕐 HORÁRIOS DE FUNCIONAMENTO

Domingo: 18:00 - 23:00
Segunda: Fechado
Terça: 18:00 - 23:00
Quarta: 18:00 - 23:00
Quinta: 18:00 - 23:00
Sexta: 18:00 - 00:00
Sábado: 18:00 - 00:00

❌ Estamos FECHADOS no momento.
```

### Informações do Restaurante
```
🏪 RESTAURANTE EXEMPLO

📛 Nome: Restaurante Exemplo
📍 Endereço: Rua das Flores, 123 - Cidade/MG
📞 Telefone: (31) 99999-9999
```

### FAQ/Políticas
```
📖 INFORMAÇÕES SOBRE CANCELAMENTO

1. Qual a política de cancelamento?
   Pedidos podem ser cancelados antes do preparo sem custo. Após o preparo, é necessário contato telefônico.

2. Como funciona o reembolso?
   O valor é estornado na mesma forma de pagamento em até 5 dias úteis.
```

### Informação Não Encontrada
```
Não encontrei informações específicas sobre "tema" na nossa base de conhecimento.

Esta é uma dúvida que posso verificar com a equipe. Enquanto isso, posso ajudar com cardápio ou pedidos!
```

---

## Regras Importantes

1. **Use para dúvidas gerais** - tudo que não é cardápio ou pedido
2. **Base de conhecimento** tem FAQ e políticas configuradas
3. **Se não encontrar**, seja honesto e diga que vai verificar
4. **Não invente políticas ou horários**
5. **Horário de funcionamento** varia por dia - mostre cada dia

---

## Fluxo de Conversa

1. Cliente pergunta horário → chame `get_operating_hours`
2. Cliente pergunta endereço/telefone → chame `get_restaurant_info`
3. Cliente pergunta política/pergunta geral → chame `get_store_info`
4. Se não encontrar → seja honesto e ofereça ajuda humana
