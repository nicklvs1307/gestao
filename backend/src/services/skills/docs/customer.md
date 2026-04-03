# Customer Skill

Busca, criação e atualização de clientes via APIs REST.

## Quando Usar

- Cliente quer se identificar antes de fazer pedido
- Cliente novo precisa se cadastrar
- Cliente quer atualizar endereço ou dados
- Sistema precisa identificar cliente pelo telefone

## Ferramentas Disponíveis

### search_customer(phone)

Busca cliente pelo telefone para identificação.

**Endpoint:** `GET /api/customers/search?q={phone}`

**Input:**
```json
{
  "phone": "5531999999999"
}
```

**Output esperado (encontrado):**
```json
{
  "customers": [
    {
      "id": "uuid-cliente",
      "name": "João Silva",
      "phone": "5531999999999",
      "email": "joao@email.com",
      "street": "Rua das Flores",
      "number": "123",
      "neighborhood": "Centro",
      "city": "Cidade",
      "state": "MG",
      "zipCode": "30000-000",
      "complement": "Apto 101",
      "loyaltyPoints": 150,
      "cashbackBalance": 25.00
    }
  ]
}
```

**Output esperado (não encontrado):**
```json
{
  "customers": []
}
```

**Como usar:** SEMPRE chame antes de criar pedido. Use os últimos 8 dígitos do telefone para busca. Se retornar array vazio, ofereça `create_customer`.

---

### create_customer(data)

Cria novo cadastro de cliente.

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
  "state": "MG",
  "zipCode": "30000-000",
  "complement": "Apto 101"
}
```

**Campos obrigatórios:**
- `name` - nome do cliente
- `phone` - telefone normalizado
- `restaurantId` - ID do restaurante

**Campos opcionais:**
- `street`, `number`, `neighborhood`, `city`, `state`, `zipCode`, `complement` - endereço

**Output esperado (sucesso - 201):**
```json
{
  "id": "uuid-cliente",
  "name": "João Silva",
  "phone": "5531999999999"
}
```

**Output esperado (erro - já existe):**
```json
{
  "message": "Cliente já cadastrado"
}
```

**Como usar:** Use quando o cliente não estiver cadastrado. Peça nome e endereço mínimo (rua, número, bairro, cidade).

---

### update_customer(customerId, data)

Atualiza dados de um cliente existente.

**Endpoint:** `PUT /api/customers/{customerId}`

**Input:**
```json
{
  "customerId": "uuid-cliente",
  "data": {
    "name": "João Silva Santos",
    "street": "Rua Nova",
    "number": "456",
    "neighborhood": "Jardim",
    "city": "Cidade",
    "state": "MG"
  }
}
```

**Output esperado:**
```json
{
  "id": "uuid-cliente",
  "name": "João Silva Santos",
  "phone": "5531999999999",
  "street": "Rua Nova",
  "number": "456",
  "neighborhood": "Jardim",
  "city": "Cidade",
  "state": "MG"
}
```

**Como usar:** Use quando cliente quiser alterar endereço ou nome. Só envie os campos que estão sendo alterados.

---

## Como Formatar Resposta ao Cliente

### Cliente Identificado
```
👤 CLIENTE IDENTIFICADO

Nome: João Silva
Telefone: (31) 99999-9999

📍 Endereço: Rua das Flores, 123 - Centro
   Complemento: Apto 101

💎 Fidelidade: 150 pontos
💰 Cashback: R$ 25,00
```

### Cliente Não Encontrado
```
👋 Cliente não encontrado para (31) 99999-9999.

Para criar o cadastro, preciso de:
• Nome completo
• Endereço completo (rua, número, bairro, cidade)

Com o cadastro você ganha pontos de fidelidade a cada pedido! 🎁
```

### Cadastro Criado
```
✅ CADASTRO CRIADO COM SUCESSO!

Nome: João Silva
Telefone: (31) 99999-9999

Você já tem 0 pontos de fidelidade!
Ganhe mais pontos a cada pedido 💎
```

---

## Fluxo de Identificação

1. Recebe mensagem do cliente → extrai telefone
2. Chama `search_customer(phone)`
3. Se encontrar → confirma nome: "Olá João! É você mesmo?"
4. Se não encontrar → ofereça cadastro: "Não te encontrei. Quer se cadastrar?"
5. Para cadastro → peça nome e endereço completo
6. Chama `create_customer(data)`
7. Confirma cadastro: "Cadastro realizado! Agora posso fazer seu pedido."

---

## Regras Importantes

1. **SEMPRE identifique o cliente** antes de criar um pedido
2. **Busque pelo telefone** do contato que está conversando
3. **Se não encontrar**, ofereça criar cadastro
4. **Mantenha dados atualizados** - pergunte se endereço mudou
5. **Informe pontos de fidelidade** - clientes cadastrados ganham pontos
6. **Cashback** - alguns clientes têm saldo de cashback para usar
