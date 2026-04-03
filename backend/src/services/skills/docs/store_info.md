# Store Info Skill

Informações gerais da loja: horários, políticas, FAQ, endereço e dados gerais via APIs REST.

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

**Endpoint:** `GET /api/whatsapp/knowledge?restaurantId={restaurantId}&q={query}`

**Input:**
```json
{
  "query": "cancelamento"
}
```

**Output esperado:**
```json
{
  "knowledge": [
    {
      "id": "uuid-kb",
      "question": "Qual a política de cancelamento?",
      "answer": "Pedidos podem ser cancelados antes do preparo sem custo. Após o preparo, é necessário contato telefônico.",
      "category": "políticas",
      "isActive": true
    }
  ]
}
```

**Como usar:** Use para qualquer dúvida sobre políticas, regras, FAQ que não seja sobre cardápio ou pedidos. Filtre resultados pelo campo `category` ou busque por similaridade no `question` e `answer`.

---

### get_operating_hours()

Retorna horários de funcionamento por dia da semana.

**Endpoint:** `GET /api/settings/{restaurantId}`

**Input:**
```json
{}
```

**Output esperado:**
```json
{
  "settings": {
    "operatingHours": [
      { "dayOfWeek": 0, "dayName": "Domingo", "isClosed": false, "openingTime": "18:00", "closingTime": "23:00" },
      { "dayOfWeek": 1, "dayName": "Segunda", "isClosed": true },
      { "dayOfWeek": 2, "dayName": "Terça", "isClosed": false, "openingTime": "18:00", "closingTime": "23:00" },
      { "dayOfWeek": 3, "dayName": "Quarta", "isClosed": false, "openingTime": "18:00", "closingTime": "23:00" },
      { "dayOfWeek": 4, "dayName": "Quinta", "isClosed": false, "openingTime": "18:00", "closingTime": "23:00" },
      { "dayOfWeek": 5, "dayName": "Sexta", "isClosed": false, "openingTime": "18:00", "closingTime": "00:00" },
      { "dayOfWeek": 6, "dayName": "Sábado", "isClosed": false, "openingTime": "18:00", "closingTime": "00:00" }
    ]
  },
  "restaurant": {
    "name": "Restaurante Exemplo",
    "isOpen": true
  }
}
```

**Como usar:** Use quando cliente perguntar horários ou se está aberto. Compare `dayOfWeek` com o dia atual (0=Domingo, 1=Segunda, ..., 6=Sábado). Verifique `isClosed` para saber se está fechado.

---

### get_restaurant_info()

Retorna informações básicas do restaurante.

**Endpoint:** `GET /api/settings/{restaurantId}`

**Input:**
```json
{}
```

**Output esperado:**
```json
{
  "restaurant": {
    "id": "uuid-restaurante",
    "name": "Restaurante Exemplo",
    "slug": "restaurante-exemplo",
    "address": "Rua das Flores, 123",
    "city": "Cidade",
    "state": "MG",
    "phone": "(31) 99999-9999",
    "logoUrl": "/uploads/logo.jpg",
    "coverUrl": "/uploads/cover.jpg"
  }
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
