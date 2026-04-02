# Menu Skill

Consulta cardápio, produtos, categorias e promoções do restaurante.

## Quando Usar

- Cliente pergunta preço de produto específico
- Cliente pede para ver o cardápio completo ou por categoria
- Cliente pergunta "tem X?" ou "vocês vendem X?"
- Cliente pergunta sobre promoções do dia
- Cliente quer saber categorias disponíveis

## Ferramentas Disponíveis

### search_products(query)

Busca produtos pelo nome ou descrição.

**Input:**
```json
{
  "query": "pizza"
}
```

**Output:**
```json
[
  {
    "id": "uuid-do-produto",
    "name": "Pizza Mussarela",
    "price": 45.90,
    "description": "Massa, molho, mussarela e orégano",
    "sizes": [
      { "name": "Pequena", "price": 35.90 },
      { "name": "Média", "price": 45.90 },
      { "name": "Grande", "price": 65.90 }
    ],
    "addonGroups": [
      {
        "name": "Borda",
        "addons": [
          { "name": "Catupiry", "price": 5.00 },
          { "name": "Cheddar", "price": 5.00 }
        ]
      }
    ]
  }
]
```

**Como usar:** Sempre chame esta tool quando o cliente mencionar um produto específico pelo nome.

---

### get_menu(category?)

Retorna o cardápio completo ou filtrado por categoria.

**Input:**
```json
{
  "category": "Pizzas"
}
// ou vazio para todo o cardápio
```

**Output:**
```json
[
  {
    "name": "Pizzas",
    "products": [
      {
        "id": "uuid",
        "name": "Pizza Mussarela",
        "price": 45.90,
        "sizes": [...],
        "addonGroups": [...]
      }
    ]
  }
]
```

**Como usar:** Use quando o cliente pedir para "ver o cardápio" ou "o que vocês têm?".

---

### get_categories()

Lista todas as categorias disponíveis no cardápio.

**Input:**
```json
{}
```

**Output:**
```json
["Pizzas", "Bebidas", "Sobremesas", "Lanches"]
```

**Como usar:** Use quando o cliente perguntar "quais categorias vocês têm?".

---

### get_promotions()

Retorna promoções ativas no momento.

**Input:**
```json
{}
```

**Output:**
```json
[
  {
    "name": "Pizza Grande + Refrigerante",
    "description": "Pizza grande + 1L refrigerante",
    "discountType": "percentage",
    "discountValue": 15,
    "code": "PROMO15",
    "minOrderValue": 50.00
  }
]
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
4. **Verifique disponibilidade** - produtos podem estar indisponíveis
5. **Busque por similar** se o produto exato não for encontrado

---

## Fluxo de Conversa

1. Cliente pergunta preço → chame `search_products`
2. Cliente pede cardápio → chame `get_menu`
3. Cliente pergunta categorias → chame `get_categories`
4. Cliente pergunta promoções → chame `get_promotions`
5. Interprete o resultado e formate resposta clara ao cliente
