# Customer Skill

Busca, cria, atualiza dados e consulta histórico de clientes.

## Quando Usar

- Cliente quer fazer pedido e não está identificado
- Cliente pergunta sobre seus dados cadastrais
- Cliente quer atualizar endereço ou telefone
- Cliente pergunta sobre pontos de fidelidade
- Cliente quer saber seu histórico de pedidos

## Ferramentas Disponíveis

### search_customer(phone)

Busca cliente pelo telefone para ver dados cadastrais, endereço e histórico.

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
  "email": "joao@email.com",
  "street": "Rua das Flores",
  "number": "123",
  "neighborhood": "Centro",
  "city": "Cidade",
  "state": "MG",
  "zipCode": "38000-000",
  "complement": "Apto 401",
  "reference": "Próximo ao mercado",
  "loyaltyPoints": 150,
  "cashbackBalance": 25.00,
  "createdAt": "2023-01-01T00:00:00Z",
  "orders": [
    {
      "id": "uuid-pedido",
      "total": 70.90,
      "status": "DELIVERED",
      "createdAt": "2024-01-01T12:00:00Z",
      "items": [
        { "product": { "name": "Pizza Mussarela" }, "quantity": 1 }
      ]
    }
  ]
}
```

**Como usar:** SEMPRE use antes de criar um pedido para identificar o cliente.

---

### create_customer(data)

Cria novo cadastro de cliente.

**Input:**
```json
{
  "name": "João Silva",
  "phone": "5531999999999",
  "street": "Rua das Flores",
  "number": "123",
  "neighborhood": "Centro",
  "city": "Cidade",
  "state": "MG",
  "zipCode": "38000-000",
  "complement": "Apto 401",
  "reference": "Próximo ao mercado"
}
```

**Campos obrigatórios:** `name`, `phone`

**Output:**
```json
{
  "id": "uuid-cliente",
  "name": "João Silva",
  "phone": "5531999999999"
}
```

**Como usar:** Use quando o cliente não estiver cadastrado e quiser fazer o primeiro pedido ou se cadastrar.

---

### update_customer(phone, data)

Atualiza dados de cliente existente.

**Input:**
```json
{
  "phone": "5531999999999",
  "name": "João Silva Santos",
  "street": "Nova Rua",
  "number": "456",
  "neighborhood": "Bairro Novo"
}
```

**Output:**
```json
{
  "id": "uuid-cliente",
  "name": "João Silva Santos",
  "street": "Nova Rua",
  "number": "456",
  "neighborhood": "Bairro Novo"
}
```

**Como usar:** Use quando o cliente pedir para alterar dados como endereço, nome, telefone.

---

## Como Formatar Resposta ao Cliente

### Cliente Identificado
```
👤 CLIENTE IDENTIFICADO

Nome: João Silva
Telefone: (31) 99999-9999

📍 Endereço: Rua das Flores, 123 - Centro
   Complemento: Apto 401
   Referência: Próximo ao mercado

💎 Fidelidade: 150 pontos
💰 Cashback: R$ 25,00

📊 Histórico: 5 pedidos
   Total gasto: R$ 350,00

Último pedido (#12345):
  1x Pizza Mussarela - R$ 45,90 - Entregue
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

## Regras Importantes

1. **SEMPRE identifique o cliente** antes de criar um pedido
2. **Busque pelo telefone** do contato que está conversando
3. **Se não encontrar**, ofereça criar cadastro
4. **Mantenha dados atualizados** -pergunte se endereço mudou
5. **Informe pontos de fidelidade** - clientes cadastrados ganham pontos
6. **Cashback** - alguns clientes têm saldo de cashback para usar
