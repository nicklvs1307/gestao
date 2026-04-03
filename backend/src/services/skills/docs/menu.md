# Menu Skill

Consulta cardápio, produtos, categorias e promoções do restaurante via APIs REST.

## Quando Usar

- Cliente pergunta preço de produto específico
- Cliente pede para ver o cardápio completo ou por categoria
- Cliente pergunta "tem X?" ou "vocês vendem X?"
- Cliente pergunta sobre promoções do dia
- Cliente quer saber categorias disponíveis

## Ferramentas Disponíveis

### search_products(query)

Busca produtos pelo nome ou descrição.

**Endpoint:** `GET /api/products/client/{restaurantId}`

**Input:**
```json
{
  "query": "pizza"
}
```

**Como funciona:** A API retorna todos os produtos disponíveis do restaurante. Filtre localmente pelo `query` no nome ou descrição.

**Output esperado:**
```json
{
  "products": [
    {
      "id": "uuid-do-produto",
      "name": "Pizza Mussarela",
      "price": 45.90,
      "description": "Massa, molho, mussarela e orégano",
      "imageUrl": "/uploads/pizza.jpg",
      "isAvailable": true,
      "sizes": [
        { "id": "uuid-size", "name": "Pequena", "price": 35.90 },
        { "id": "uuid-size", "name": "Média", "price": 45.90 },
        { "id": "uuid-size", "name": "Grande", "price": 65.90 }
      ],
      "addonGroups": [
        {
          "id": "uuid-group",
          "name": "Borda",
          "minSelect": 0,
          "maxSelect": 1,
          "addons": [
            { "id": "uuid-addon", "name": "Catupiry", "price": 5.00 },
            { "id": "uuid-addon", "name": "Cheddar", "price": 5.00 }
          ]
        }
      ]
    }
  ]
}
```

**Como usar:** Sempre chame esta tool quando o cliente mencionar um produto específico pelo nome. Filtre os resultados pelo campo `name` ou `description`.

---

### get_menu(category?)

Retorna o cardápio completo ou filtrado por categoria.

**Endpoint:** `GET /api/products/client/{restaurantId}`

**Input:**
```json
{
  "category": "Pizzas"
}
```

**Como funciona:** A API retorna todos os produtos. Agrupe localmente por categoria usando o campo `categories` de cada produto. Se `category` for informado, filtre os produtos que pertencem àquela categoria.

**Output esperado:**
```json
{
  "categories": [
    {
      "name": "Pizzas",
      "products": [
        {
          "id": "uuid",
          "name": "Pizza Mussarela",
          "price": 45.90,
          "description": "Massa, molho, mussarela e orégano",
          "sizes": [...],
          "addonGroups": [...]
        }
      ]
    }
  ]
}
```

**Como usar:** Use quando o cliente pedir para "ver o cardápio" ou "o que vocês têm?".

---

### get_categories()

Lista todas as categorias disponíveis no cardápio.

**Endpoint:** `GET /api/client/categories/{restaurantId}`

**Input:**
```json
{}
```

**Output esperado:**
```json
{
  "categories": [
    { "id": "uuid-1", "name": "Pizzas", "order": 1 },
    { "id": "uuid-2", "name": "Bebidas", "order": 2 },
    { "id": "uuid-3", "name": "Sobremesas", "order": 3 },
    { "id": "uuid-4", "name": "Lanches", "order": 4 }
  ]
}
```

**Como usar:** Use quando o cliente perguntar "quais categorias vocês têm?" ou para apresentar o cardápio organizado.

---

### get_promotions()

Retorna promoções ativas no momento.

**Endpoint:** `GET /api/promotions/active/{restaurantId}`

**Input:**
```json
{}
```

**Output esperado:**
```json
{
  "promotions": [
    {
      "id": "uuid-promo",
      "name": "Pizza Grande + Refrigerante",
      "description": "Pizza grande + 1L refrigerante",
      "discountType": "percentage",
      "discountValue": 15,
      "code": "PROMO15",
      "minOrderValue": 50.00,
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z",
      "applicableProducts": ["Pizza Grande"],
      "applicableCategories": ["Pizzas"]
    }
  ]
}
```

**Como usar:** Use quando o cliente perguntar sobre promoções, ofertas ou "o que tem de especial hoje?".

---

## Como Formatar Resposta ao Cliente

### Apresentando produtos com preços
- Formato: "Produto - R$ XX,XX"
- Exemplo: "Pizza Mussarela - R$ 45,90"

### Produtos com tamanhos
- Liste TODOS os tamanhos disponíveis com preços
- Exemplo: "Pizza Mussarela (Pequena R$ 35,90 | Média R$ 45,90 | Grande R$ 65,90)"

### Produtos com adicionais
- Liste cada grupo de adicionais com preços
- Exemplo: "+ Borda: Catupiry (+R$ 5,00), Cheddar (+R$ 5,00)"

### Promoções
- Use emoji: 🔥 para promoções
- Inclua nome, descrição, desconto e código (se tiver)
- Informe pedido mínimo se aplicável

---

## Regras Importantes

1. **NUNCA invente preços** - sempre use a ferramenta para buscar
2. **Consulte sempre o cardápio** antes de informar qualquer preço
3. **Apresente todas as opções** de tamanho e adicionais
4. **Verifique disponibilidade** - produtos podem estar indisponíveis (campo `isAvailable`)
5. **Busque por similar** se o produto exato não for encontrado

---

## Fluxo de Conversa

1. Cliente pergunta preço → chame `search_products` e filtre pelo query
2. Cliente pede cardápio → chame `get_menu` e agrupe por categoria
3. Cliente pergunta categorias → chame `get_categories`
4. Cliente pergunta promoções → chame `get_promotions`
5. Interprete o resultado e formate resposta clara ao cliente
