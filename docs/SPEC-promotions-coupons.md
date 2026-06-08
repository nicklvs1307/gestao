# SPEC: Melhoria do Sistema de Promoções e Cupons

**Versão:** 1.0  
**Data:** 2026-06-07  
**Status:** Planejamento  

---

## 1. RESUMO EXECUTIVO

### 1.1 Problema Atual

O sistema KICARDAPIO utiliza um modelo unificado `Promotion` para representar tanto **promoções** (preço especial em itens) quanto **cupons** (código de desconto no pedido). Essa ambiguidade causa:

1. **Confusão no admin**: Usuários não conseguem distinguir entre promoções e cupons na listagem
2. **Sem controle de combinação**: Cupons sempre são aplicados sobre subtotal que já inclui promoções (desconto duplo)
3. **UX confusa**: Links quebrados, filtros inexistentes, naming inconsistente
4. **Falta de separação conceitual**: Promoção é "preço especial de item", Cupom é "código de desconto no pedido"

### 1.2 Objetivo

Separar claramente os conceitos de **Promoção** e **Cupom**, com regra de combinação configurável por cupom, melhorando a experiência tanto no admin quanto no client.

### 1.3 Definições

| Conceito | Definição | Exemplo |
|----------|-----------|---------|
| **Promoção** | Preço especial aplicado a um item específico (produto, adicional, categoria ou geral) | "Pizza Calabresa por R$25 ao invés de R$35" |
| **Cupom** | Código que o cliente digita para receber desconto no pedido inteiro | "Cupom BEMVINDO: 10% off em pedidos acima de R$50" |
| **Combinação** | Regra que define se cupom pode ser aplicado quando carrinho tem itens em promoção | "Este cupom NÃO pode ser usado com itens em promoção" |

---

## 2. MODELO DE DADOS ATUAL vs PROPOSTO

### 2.1 Model `Promotion` Atual (Prisma Schema)

```prisma
model Promotion {
  id                    String  @id @default(cuid())
  name                  String
  description           String?
  saiposIntegrationCode String?
  
  // Cupom
  code          String?
  minOrderValue Float?  @default(0)
  usageLimit    Int?
  usedCount     Int     @default(0)
  
  // Desconto
  discountType  String
  discountValue Float
  
  // Vigência
  startDate     DateTime
  endDate       DateTime
  isActive      Boolean @default(true)
  
  // Alvo
  restaurantId String
  productId    String?
  addonId      String?
  categoryId   String?
  
  orders Order[]
}
```

### 2.2 Model `Promotion` Proposto

```prisma
model Promotion {
  id                    String  @id @default(cuid())
  name                  String
  description           String?
  saiposIntegrationCode String?
  
  // === CAMPO NOVO: Regra de Combinação ===
  allowCouponOnPromotion Boolean @default(true)  // cupom pode ser aplicado sobre promoção?
  
  // Cupom (apenas quando code é preenchido)
  code          String?
  minOrderValue Float?  @default(0)
  usageLimit    Int?
  usedCount     Int     @default(0)
  
  // Desconto
  discountType  String
  discountValue Float
  
  // Vigência
  startDate     DateTime
  endDate       DateTime
  isActive      Boolean @default(true)
  
  // Alvo
  restaurantId String
  productId    String?
  addonId      String?
  categoryId   String?
  
  orders Order[]
}
```

### 2.3 Mudança no Schema

**Campo adicionado:** `allowCouponOnPromotion Boolean @default(true)`

**Justificativa:** 
- Default `true` mantém compatibilidade com cupons existentes (permitem combinação)
- Campo visível apenas quando `code` está preenchido (é cupom, não promoção simples)

---

## 3. FLUXOS DE NEGÓCIO

### 3.1 Fluxo de Promoção (sem código)

```
ADMIN:
1. Usuário cria promoção SEM preencher "Código do Cupom"
2. Sistema marca como "Promoção de Item" (badge laranja)
3. Promoção aparece nos cards do cardápio digital

CLIENT:
1. Cliente vê badge "Oferta" no card do produto
2. Preço é exibido com desconto aplicado
3. Não precisa digitar nada - desconto é automático
```

### 3.2 Fluxo de Cupom (com código)

```
ADMIN:
1. Usuário cria promoção PREENCHENDO "Código do Cupom"
2. Sistema marca como "Cupom de Desconto" (badge roxo)
3. Usuário configura toggle "Permitir combinar com promoções"
4. Se toggle DESATIVADO: aviso "Este cupom não será aceito quando carrinho tiver itens em promoção"

CLIENT:
1. Cliente adiciona itens ao carrinho
2. Digita código do cupom no campo "Cupom de desconto"
3. Sistema valida:
   a. Código válido? ✓
   b. Dentro da validade? ✓
   c. Limite de usos? ✓
   d. Valor mínimo? ✓
   E. Se cupom NÃO permite combinação:
      - Verificar se algum item do carrinho tem promoção ativa
      - Se SIM → BLOQUEAR com mensagem "Este cupom não pode ser usado com itens em promoção"
      - Se NÃO → Permitir aplicação
4. Desconto aplicado sobre subtotal (que inclui promoções, se permitido)
```

### 3.3 Fluxo de Combinação Cupom + Promoção

```
CENÁRIO 1: Cupom PERMITE combinação (allowCouponOnPromotion = true)
  - Produto: Pizza Calabresa R$35 → R$25 (promoção -28%)
  - Cupom: "10% OFF" 
  - Resultado: R$25 - 10% = R$22,50 ✓

CENÁRIO 2: Cupom NÃO PERMITE combinação (allowCouponOnPromotion = false)
  - Produto: Pizza Calabresa R$35 → R$25 (promoção -28%)
  - Cupom: "10% OFF" (não permite combinação)
  - Resultado: BLOQUEADO ✗
  - Mensagem: "Este cupom não pode ser usado com itens em promoção"
  - Opção do cliente: 
    a) Remover item em promoção para usar cupom
    b) Usar cupom em outro pedido sem promoções
    c) Manter item em promoção e não usar cupom
```

---

## 4. BACKEND - MUDANÇAS

### 4.1 Prisma Schema

**Arquivo:** `backend/prisma/schema.prisma`

**Mudança:** Adicionar campo `allowCouponOnPromotion` ao model `Promotion`

```prisma
model Promotion {
  // ... campos existentes ...
  allowCouponOnPromotion Boolean @default(true)  // NOVO
  // ... campos existentes ...
}
```

### 4.2 Migration SQL

**Arquivo:** `backend/prisma/migrations/20260607120000_add_allow_coupon_on_promotion/migration.sql`

```sql
-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN "allowCouponOnPromotion" BOOLEAN NOT NULL DEFAULT true;
```

### 4.3 PromotionController.js

**Arquivo:** `backend/src/controllers/PromotionController.js`

#### 4.3.1 `createPromotion` (linha 78-116)

**Mudança:** Aceitar novo campo `allowCouponOnPromotion` no body

```javascript
const createPromotion = async (req, res) => {
    const { 
        name, description, discountType, discountValue, startDate, endDate, 
        isActive, productId, addonId, categoryId, code, minOrderValue, usageLimit,
        allowCouponOnPromotion  // NOVO
    } = req.body;
    
    // ... lógica existente ...
    
    const data = { 
        name, 
        description,
        discountType, 
        discountValue: parseFloat(discountValue), 
        startDate: new Date(startDate), 
        endDate: end, 
        isActive, 
        code: code ? code.toUpperCase() : null,
        minOrderValue: parseFloat(minOrderValue || 0),
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        allowCouponOnPromotion: allowCouponOnPromotion !== false,  // NOVO - default true
        restaurant: { connect: { id: req.restaurantId } },
        addonId: addonId || null,
        categoryId: categoryId || null
    };
    
    // ... resto da lógica ...
};
```

#### 4.3.2 `updatePromotion` (linha 141-185)

**Mudança:** Aceitar e atualizar `allowCouponOnPromotion`

```javascript
const updatePromotion = async (req, res) => {
    const { 
        id 
    } = req.params;
    const { 
        name, description, discountType, discountValue, startDate, endDate, 
        isActive, productId, addonId, categoryId, code, minOrderValue, usageLimit,
        allowCouponOnPromotion  // NOVO
    } = req.body;
    
    // ... lógica existente ...
    
    const data = { 
        name, 
        description,
        discountType, 
        discountValue: parseFloat(discountValue), 
        startDate: new Date(startDate), 
        endDate: end, 
        isActive,
        code: code ? code.toUpperCase() : null,
        minOrderValue: parseFloat(minOrderValue || 0),
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        allowCouponOnPromotion: allowCouponOnPromotion !== false,  // NOVO
        addonId: addonId || null,
        categoryId: categoryId || null
    };
    
    // ... resto da lógica ...
};
```

#### 4.3.3 `validateCoupon` (linha 118-139)

**Mudança:** Retornar `allowCouponOnPromotion` no response para o frontend saber se deve verificar conflito

```javascript
const validateCoupon = async (req, res) => {
    const { code, cartTotal, restaurantId } = req.body;
    try {
        const promotion = await prisma.promotion.findFirst({
            where: {
                restaurantId,
                code: code.toUpperCase(),
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            }
        });

        if (!promotion) return res.status(404).json({ error: 'Cupom inválido ou expirado.' });
        if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) 
            return res.status(400).json({ error: 'Limite de uso do cupom atingido.' });
        if (cartTotal < (promotion.minOrderValue || 0)) 
            return res.status(400).json({ error: `Valor mínimo para este cupom é R$ ${promotion.minOrderValue.toFixed(2)}` });

        // NOVO: Retornar flag de combinação
        res.json({
            ...promotion,
            allowCouponOnPromotion: promotion.allowCouponOnPromotion
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao validar cupom.' });
    }
};
```

### 4.4 PricingService.js

**Arquivo:** `backend/src/services/PricingService.js`

#### 4.4.1 `calculateItemPrice` (linha 90-157)

**Mudança:** Retornar flag `hasActivePromotion` para uso posterior

```javascript
async calculateItemPrice(productId, quantity, sizeId, addonsIds) {
    // ... lógica existente até linha 141 ...
    
    // 2. Aplicação de Promoção
    const activePromotion = product.promotions?.[0];
    if (activePromotion) {
        if (activePromotion.discountType === 'percentage') {
            unitPrice = unitPrice * (1 - activePromotion.discountValue / 100);
        } else if (activePromotion.discountType === 'fixed_amount') {
            unitPrice = Math.max(0, unitPrice - activePromotion.discountValue);
        }
    }

    // ... lógica de adicionais ...
    
    return {
        product,
        unitPrice: finalUnitPrice, 
        basePrice: unitPrice,      
        totalPrice: totalItemPrice,
        sizeObj,
        addonsObjects,
        hasActivePromotion: !!activePromotion  // NOVO
    };
}
```

### 4.5 OrderService.js

**Arquivo:** `backend/src/services/OrderService.js`

#### 4.5.1 `_processOrderItems` (linha 195-224)

**Mudança:** Retornar flag `hasActivePromotion` para cada item processado

```javascript
async _processOrderItems(items) {
    // ... lógica existente ...
    
    for (const item of items) {
        // ... processamento existente ...
        
        const calculation = await PricingService.calculateItemPrice(
            item.productId, 
            item.quantity, 
            item.sizeId, 
            allOptionsIds
        );
        
        subtotal = money.add(subtotal, calculation.totalPrice);

        const flavorsList = calculation.addonsObjects.filter(a => a.isFlavor);
        const addonsList = calculation.addonsObjects.filter(a => !a.isFlavor);

        processedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            priceAtTime: calculation.unitPrice,
            sizeJson: calculation.sizeObj ? JSON.stringify(calculation.sizeObj) : null,
            addonsJson: addonsList.length ? JSON.stringify(addonsList) : null,
            flavorsJson: flavorsList.length ? JSON.stringify(flavorsList) : null,
            observations: item.observations || '',
            hasActivePromotion: calculation.hasActivePromotion  // NOVO
        });
    }

    return { processedItems, subtotal };
}
```

#### 4.5.2 `createOrder` (linha 229-309)

**Mudança:** Adicionar verificação de combinação cupom + promoção

```javascript
async createOrder({ restaurantId, items, orderType, deliveryInfo, tableNumber, paymentMethod, userId, customerName, discount = 0, couponCode = null, extraCharge = 0 }) {
    // ... lógica existente até linha 296 ...
    
    // === VALIDAÇÃO SERVER-SIDE DE CUPOM ===
    let validatedDiscount = parseFloat(discount) || 0;
    let validatedCouponCode = null;
    let validatedPromotionId = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
        const code = couponCode.trim().toUpperCase();
        const promotion = await prisma.promotion.findFirst({
            where: {
                restaurantId: realRestaurantId,
                code,
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            }
        });

        if (!promotion) {
            throw new Error('Cupom inválido ou expirado.');
        }
        if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
            throw new Error('Limite de uso do cupom atingido.');
        }
        if (promotion.minOrderValue && orderTotal < promotion.minOrderValue) {
            throw new Error(`Valor mínimo para este cupom é R$ ${promotion.minOrderValue.toFixed(2)}.`);
        }

        // NOVO: Verificação de combinação cupom + promoção
        if (promotion.allowCouponOnPromotion === false) {
            const hasPromotionInCart = processedItems.some(item => item.hasActivePromotion);
            if (hasPromotionInCart) {
                throw new Error('Este cupom não pode ser usado com itens em promoção. Remova os itens promocionais ou use outro cupom.');
            }
        }

        // Calcular desconto baseado no cupom validado (NUNCA confiar no client)
        if (promotion.discountType === 'percentage') {
            validatedDiscount = (orderTotal * promotion.discountValue) / 100;
        } else {
            validatedDiscount = Math.min(promotion.discountValue, orderTotal);
        }
        validatedDiscount = parseFloat(validatedDiscount.toFixed(2));
        validatedCouponCode = code;
        validatedPromotionId = promotion.id;

        logger.info(`[ORDER] Cupom "${code}" validado. Desconto: R$ ${validatedDiscount}`);
    }
    
    // ... resto da lógica ...
}
```

### 4.6 Retorno da API de Promoções Ativas

**Arquivo:** `backend/src/controllers/PromotionController.js`

#### 4.6.1 `getActivePromotions` (linha 5-59)

**Mudança:** Incluir `allowCouponOnPromotion` no response

```javascript
const getActivePromotions = async (req, res) => {
    // ... lógica existente ...
    
    const promotions = await prisma.promotion.findMany({
        where: {
            restaurantId: req.params.restaurantId,
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: startOfTodayUTC }
        },
        include: { 
            product: {
                include: {
                    sizes: { orderBy: { order: 'asc' } },
                    addonGroups: {
                        orderBy: { order: 'asc' },
                        include: {
                            addons: { orderBy: { order: 'asc' } }
                        }
                    },
                    categories: {
                        include: {
                            addonGroups: {
                                orderBy: { order: 'asc' },
                                include: {
                                    addons: { orderBy: { order: 'asc' } }
                                }
                            }
                        }
                    },
                    promotions: {
                        where: { isActive: true }
                    }
                }
            } 
        },
        orderBy: { createdAt: 'desc' }
    });

    // ... lógica existente ...
    
    res.json(sortedPromotions);
};
```

---

## 5. FRONTEND ADMIN - MUDANÇAS

### 5.1 Tipos

**Arquivo:** `frontend/admin/src/types/index.ts` (ou onde o tipo Promotion é definido)

**Mudança:** Adicionar campo `allowCouponOnPromotion`

```typescript
interface Promotion {
  id: string;
  name: string;
  description?: string;
  code?: string | null;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productId?: string;
  addonId?: string;
  categoryId?: string;
  minOrderValue?: number;
  usageLimit?: number;
  usedCount?: number;
  allowCouponOnPromotion?: boolean;  // NOVO
  // ... outros campos ...
}
```

### 5.2 PromotionFormPage.tsx

**Arquivo:** `frontend/admin/src/pages/PromotionFormPage.tsx`

#### 5.2.1 Estado do Formulário (linha 33-47)

**Mudança:** Adicionar `allowCouponOnPromotion` ao estado

```typescript
const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '' as number | string,
    startDate: '',
    endDate: '',
    isActive: true,
    productId: '',
    addonId: '',
    categoryId: '',
    code: '',
    minOrderValue: 0 as number | string,
    usageLimit: '' as number | string,
    allowCouponOnPromotion: true,  // NOVO
});
```

#### 5.2.2 Carregamento para Edição (linha 68-93)

**Mudança:** Carregar `allowCouponOnPromotion` ao editar

```typescript
if (isEditing) {
    const allPromos = await getPromotions();
    const promo = allPromos.find((p: any) => p.id === id);
    if (promo) {
        setFormData({
            // ... campos existentes ...
            allowCouponOnPromotion: promo.allowCouponOnPromotion !== false,  // NOVO
        });
        
        // ... lógica existente ...
    }
}
```

#### 5.2.3 Submit do Formulário (linha 103-133)

**Mudança:** Incluir `allowCouponOnPromotion` no payload

```typescript
const handleSubmit = async (e: React.FormEvent) => {
    // ... validação existente ...

    setIsSubmitting(true);
    try {
        const payload = {
            ...formData,
            discountValue: Number(formData.discountValue),
            minOrderValue: Number(formData.minOrderValue),
            usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
            productId: targetType === 'PRODUCT' ? formData.productId : null,
            addonId: targetType === 'ADDON' ? formData.addonId : null,
            categoryId: targetType === 'CATEGORY' ? formData.categoryId : null,
            code: formData.code || null,
            allowCouponOnPromotion: formData.allowCouponOnPromotion  // NOVO
        };

        // ... lógica existente ...
    }
    // ... catch/finally ...
};
```

#### 5.2.4 Card "Configurações de Cupom" (linha 220-244)

**Mudança:** Adicionar toggle de combinação (apenas quando `code` está preenchido)

```tsx
{/* CARD 3: CUPOM E LIMITES */}
<Card className="p-8 border-none shadow-sm bg-indigo-900 text-white space-y-6 relative overflow-hidden">
    <div className="absolute top-0 right-0 p-8 opacity-10"><Ticket size={120} /></div>
    <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-2 relative z-10">
        <div className="bg-white/20 text-white p-2 rounded-lg"><Ticket size={18} /></div>
        <h3 className="text-sm font-black uppercase italic">Configurações de Cupom</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="space-y-1.5">
            <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest ml-1">Código do Cupom</label>
            <input 
                className="w-full bg-white/10 border border-white/20 rounded-xl h-12 px-4 text-sm font-black uppercase placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-white/30" 
                placeholder="Ex: PIZZA10" 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
            />
        </div>
        <div className="space-y-1.5">
            <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest ml-1">Pedido Mínimo</label>
            <input 
                type="number" 
                className="w-full bg-white/10 border border-white/20 rounded-xl h-12 px-4 text-sm font-black placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-white/30" 
                value={formData.minOrderValue} 
                onChange={e => setFormData({...formData, minOrderValue: e.target.value})} 
            />
        </div>
        <div className="space-y-1.5">
            <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest ml-1">Limite de Uso Total</label>
            <input 
                type="number" 
                className="w-full bg-white/10 border border-white/20 rounded-xl h-12 px-4 text-sm font-black placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-white/30" 
                placeholder="Sem limite" 
                value={formData.usageLimit} 
                onChange={e => setFormData({...formData, usageLimit: e.target.value})} 
            />
        </div>
    </div>
    
    {/* NOVO: Toggle de Combinação - aparece apenas quando code está preenchido */}
    {formData.code && (
        <div className="relative z-10 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <label className="text-[10px] font-black text-white uppercase tracking-widest">
                        Permitir combinar com promoções
                    </label>
                    <p className="text-[9px] text-indigo-200 font-bold uppercase italic leading-tight mt-1">
                        Se desativado, este cupom não poderá ser usado quando o carrinho contiver itens em promoção
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setFormData({...formData, allowCouponOnPromotion: !formData.allowCouponOnPromotion})}
                    className={cn(
                        "w-12 h-6 rounded-full relative transition-all duration-300 ml-4",
                        formData.allowCouponOnPromotion ? "bg-emerald-500" : "bg-white/20"
                    )}
                >
                    <motion.div 
                        animate={{ x: formData.allowCouponOnPromotion ? 26 : 2 }} 
                        className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm" 
                    />
                </button>
            </div>
        </div>
    )}
    
    <p className="text-[9px] text-indigo-200 font-bold uppercase italic leading-tight flex items-center gap-2 relative z-10">
        <Info size={12}/> Se o código estiver preenchido, o cliente precisa digitar o cupom para ganhar o desconto.
    </p>
</Card>
```

### 5.3 PromotionManagement.tsx

**Arquivo:** `frontend/admin/src/components/PromotionManagement.tsx`

#### 5.3.1 Tipo (linha 12)

**Mudança:** Substituir `type Promotion = any` por tipo correto

```typescript
// ANTES:
type Promotion = any;

// DEPOIS:
type Promotion = {
  id: string;
  name: string;
  description?: string;
  code?: string | null;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productId?: string;
  addonId?: string;
  categoryId?: string;
  product?: { id: string; name: string; imageUrl?: string };
  addon?: { id: string; name: string };
  category?: { id: string; name: string };
  minOrderValue?: number;
  usageLimit?: number;
  usedCount?: number;
  allowCouponOnPromotion?: boolean;
};
```

#### 5.3.2 Coluna "Tipo" na Tabela (linha 94-168)

**Mudança:** Adicionar coluna "Tipo" mostrando se é Promoção ou Cupom

```tsx
<thead className="bg-slate-50/70 border-b border-slate-100">
    <tr>
        <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Campanha</th>
        <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Tipo</th>  {/* NOVO */}
        <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
        <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Desconto</th>
        <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Alvo</th>
        <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Vigência</th>
        <th className="px-6 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Ações</th>
    </tr>
</thead>
```

#### 5.3.3 Renderização da Coluna "Tipo" (após linha 136)

**Mudança:** Adicionar renderização da coluna tipo

```tsx
<td className="px-6 py-4">
    <div className="flex items-center gap-2">
        {promo.code ? (
            <>
                <Ticket size={14} className="text-purple-500" />
                <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Cupom</span>
            </>
        ) : (
            <>
                <Percent size={14} className="text-orange-500" />
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Promoção</span>
            </>
        )}
    </div>
</td>
```

#### 5.3.4 Filtros (adicionar após linha 90)

**Mudança:** Adicionar filtros por tipo (Promoção/Cupom) e status

```tsx
{/* Filtros */}
<div className="flex items-center gap-3 mb-6">
    <div className="flex p-1.5 bg-slate-50 border border-slate-100 rounded-2xl gap-1.5">
        <button 
            onClick={() => setFilterType('ALL')}
            className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                filterType === 'ALL' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-500 hover:bg-white/50"
            )}
        >
            Todos
        </button>
        <button 
            onClick={() => setFilterType('PROMOTION')}
            className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                filterType === 'PROMOTION' ? "bg-orange-100 text-orange-600 shadow-sm border border-orange-200" : "text-slate-500 hover:bg-white/50"
            )}
        >
            Promoções
        </button>
        <button 
            onClick={() => setFilterType('COUPON')}
            className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                filterType === 'COUPON' ? "bg-purple-100 text-purple-600 shadow-sm border border-purple-200" : "text-slate-500 hover:bg-white/50"
            )}
        >
            Cupons
        </button>
    </div>
</div>
```

#### 5.3.5 Lógica de Filtro (adicionar antes do return)

**Mudança:** Implementar filtro por tipo

```typescript
const [filterType, setFilterType] = useState<'ALL' | 'PROMOTION' | 'COUPON'>('ALL');

const filteredPromotions = promotions.filter(promo => {
    if (filterType === 'PROMOTION') return !promo.code;
    if (filterType === 'COUPON') return !!promo.code;
    return true;
});
```

#### 5.3.6 Renderização da Tabela (linha 122)

**Mudança:** Usar `filteredPromotions` ao invés de `promotions`

```tsx
{filteredPromotions.map(promo => {
    const status = getStatusInfo(promo);
    return (
        // ... renderização existente ...
    );
})}
```

### 5.4 Navigation.ts

**Arquivo:** `frontend/admin/src/config/navigation.ts`

**Mudança:** Corrigir link "Cupons de Desconto" para rota correta

```typescript
// ANTES:
{
    label: 'Cupons de Desconto',
    path: '/promotions?filter=coupons',  // QUEBRADO
    icon: Ticket,
    permission: 'products:manage'
}

// DEPOIS:
{
    label: 'Cupons de Desconto',
    path: '/promotions',  // CORRETO - componente vai filtrar por query param
    icon: Ticket,
    permission: 'products:manage'
}
```

---

## 6. FRONTEND CLIENT - MUDANÇAS

### 6.1 Tipos

**Arquivo:** `frontend/client/src/types.ts`

#### 6.1.1 Interface `Promotion` (linha 116-130)

**Mudança:** Adicionar `allowCouponOnPromotion`

```typescript
export interface Promotion {
  id: string;
  name: string;
  description?: string;
  code?: string | null;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productId?: string;
  product?: Product;
  saiposIntegrationCode?: string | null;
  minOrderValue?: number;
  allowCouponOnPromotion?: boolean;  // NOVO
}
```

#### 6.1.2 Interface `LocalCartItem` (linha 132-145)

**Mudança:** Adicionar `hasActivePromotion`

```typescript
export interface LocalCartItem {
  localId: number; 
  product: Product;
  productId: string;
  quantity: number;
  priceAtTime: number;
  sizeId?: string | null;
  addonsIds?: string[];
  flavorIds?: string[];
  sizeJson: string | null;
  addonsJson: string | null;
  flavorsJson: string | null;
  observations?: string | null;
  hasActivePromotion?: boolean;  // NOVO
}
```

### 6.2 useLocalCart.ts

**Arquivo:** `frontend/client/src/hooks/useLocalCart.ts`

#### 6.2.1 `handleAddToCart` (linha 7-102)

**Mudança:** Incluir `hasActivePromotion` no item do carrinho

```typescript
const handleAddToCart = (
    product: Product,
    quantity: number,
    selectedSize: SizeOption | null,
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[],
    observations?: string
) => {
    // ... lógica existente até linha 55 ...
    
    // Aplicar Promoção se houver
    const activePromotion = product.promotions?.find(p => p.isActive);
    let hasActivePromotion = false;  // NOVO
    if (activePromotion) {
        hasActivePromotion = true;  // NOVO
        if (activePromotion.discountType === 'percentage') {
            basePrice = basePrice * (1 - activePromotion.discountValue / 100);
        } else if (activePromotion.discountType === 'fixed_amount') {
            basePrice = Math.max(0, basePrice - activePromotion.discountValue);
        }
    }

    // ... lógica existente até linha 85 ...
    
    const newCartItem: LocalCartItem = {
        localId: Date.now() + Math.random(),
        product,
        productId: product.id,
        quantity,
        priceAtTime,
        sizeId: selectedSize ? selectedSize.id : null,
        addonsIds: currentAddonsIds,
        flavorIds: selectedFlavors?.map(f => f.id) || [],
        sizeJson: selectedSize ? JSON.stringify(selectedSize) : null,
        addonsJson: selectedAddons.length > 0 ? JSON.stringify(selectedAddons) : null,
        flavorsJson: selectedFlavors && selectedFlavors.length > 0 ? JSON.stringify(selectedFlavors) : null,
        observations: observations || null,
        hasActivePromotion,  // NOVO
    };

    // ... resto da lógica ...
};
```

### 6.3 api.ts (Cliente)

**Arquivo:** `frontend/client/src/services/api.ts`

#### 6.3.1 Interface `CouponValidation` (linha 76-83)

**Mudança:** Adicionar `allowCouponOnPromotion`

```typescript
export interface CouponValidation {
  id: string;
  name: string;
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  minOrderValue?: number;
  allowCouponOnPromotion?: boolean;  // NOVO
}
```

### 6.4 Cart.tsx

**Arquivo:** `frontend/client/src/components/Cart.tsx`

#### 6.4.1 `handleApplyCoupon` (linha 46-68)

**Mudança:** Adicionar verificação de combinação cupom + promoção

```typescript
const handleApplyCoupon = useCallback(async () => {
    const code = couponCode.trim();
    if (!code) return;
    if (!restaurantSettings?.restaurantId && !restaurantSettings?.restaurant?.id) {
        toast.error('Erro interno: ID do restaurante não encontrado.');
        return;
    }
    setIsCouponLoading(true);
    setCouponError('');
    try {
        const restaurantId = restaurantSettings?.restaurantId || restaurantSettings?.restaurant?.id || '';
        const result = await validateCoupon(code, total, restaurantId);
        
        // NOVO: Verificar se cupom permite combinação com promoções
        if (result.allowCouponOnPromotion === false) {
            const hasPromotionItem = items.some(item => item.hasActivePromotion);
            if (hasPromotionItem) {
                setCouponError('Este cupom não pode ser usado com itens em promoção. Remova os itens promocionais ou use outro cupom.');
                setAppliedCoupon(null);
                setIsCouponLoading(false);
                return;
            }
        }
        
        setAppliedCoupon(result);
        setCouponError('');
        toast.success(`Cupom "${result.name}" aplicado com sucesso!`);
    } catch (err: any) {
        const msg = err?.response?.data?.error || 'Cupom inválido ou expirado.';
        setCouponError(msg);
        setAppliedCoupon(null);
    } finally {
        setIsCouponLoading(false);
    }
}, [couponCode, total, restaurantSettings, items]);  // NOVO: adicionado items na dependência
```

#### 6.4.2 Mensagem de Erro Melhorada (após linha 242)

**Mudança:** Mostrar mensagem mais informativa quando cupom não permite combinação

```tsx
{couponError && (
    <div className="mt-1.5 px-1">
        <p className="text-[10px] font-bold text-destructive">{couponError}</p>
        {couponError.includes('não pode ser usado com itens em promoção') && (
            <p className="text-[9px] text-muted-foreground mt-1">
                Dica: Remova os itens em promoção do carrinho para usar este cupom.
            </p>
        )}
    </div>
)}
```

---

## 7. MELHORIAS DE UX

### 7.1 Admin - Listagem de Promoções/Cupons

**Problema atual:** Link "Cupons de Desconto" quebrado, sem filtros, naming inconsistente

**Solução:**
1. Adicionar filtros por tipo (Todos / Promoções / Cupons)
2. Adicionar coluna "Tipo" na tabela com badges visuais
3. Corrigir link de navegação
4. Padronizar naming: "Promoções & Cupons" no header

### 7.2 Admin - Formulário de Criação/Edição

**Problema atual:** Toggle de combinação inexistente

**Solução:**
1. Adicionar toggle "Permitir combinar com promoções" no Card de Cupom
2. Toggle visível APENAS quando código está preenchido
3. Texto explicativo claro sobre o comportamento

### 7.3 Client - Carrinho

**Problema atual:** Sem validação de combinação cupom + promoção

**Solução:**
1. Validar combinação antes de aplicar cupom
2. Mensagem de erro clara quando cupom não permite combinação
3. Dica sobre como resolver (remover itens em promoção)

### 7.4 Client - Exibição de Promoções

**Problema atual:** PromotionSlider e HighImpactPromo desativados

**Solução (futura):**
1. Reativar PromotionSlider com dados atualizados
2. Melhorar badges de promoção nos cards
3. Adicionar seção "Ofertas do Dia" na página inicial

---

## 8. ARQUIVOS A MODIFICAR (RESUMO)

### Backend
| Arquivo | Mudança |
|---------|---------|
| `backend/prisma/schema.prisma` | Adicionar campo `allowCouponOnPromotion` |
| `backend/src/controllers/PromotionController.js` | Aceitar e retornar `allowCouponOnPromotion` |
| `backend/src/services/PricingService.js` | Retornar `hasActivePromotion` |
| `backend/src/services/OrderService.js` | Validar combinação cupom + promoção |

### Frontend Admin
| Arquivo | Mudança |
|---------|---------|
| `frontend/admin/src/types/index.ts` | Adicionar `allowCouponOnPromotion` ao tipo |
| `frontend/admin/src/pages/PromotionFormPage.tsx` | Toggle de combinação |
| `frontend/admin/src/components/PromotionManagement.tsx` | Tipo correto, filtros, coluna tipo |
| `frontend/admin/src/config/navigation.ts` | Corrigir link quebrado |

### Frontend Client
| Arquivo | Mudança |
|---------|---------|
| `frontend/client/src/types.ts` | Adicionar `allowCouponOnPromotion` e `hasActivePromotion` |
| `frontend/client/src/hooks/useLocalCart.ts` | Incluir `hasActivePromotion` no CartItem |
| `frontend/client/src/services/api.ts` | Adicionar `allowCouponOnPromotion` ao CouponValidation |
| `frontend/client/src/components/Cart.tsx` | Validar combinação antes de aplicar cupom |

### Migração
| Arquivo | Mudança |
|---------|---------|
| `backend/prisma/migrations/20260607120000_add_allow_coupon_on_promotion/migration.sql` | Criar migration SQL |

---

## 9. ORDEM DE IMPLEMENTAÇÃO

1. **Migração Prisma** (schema + migration SQL)
2. **Backend: PricingService** (retornar flag `hasActivePromotion`)
3. **Backend: OrderService** (validação server-side de combinação)
4. **Backend: PromotionController** (aceitar e retornar `allowCouponOnPromotion`)
5. **Frontend Admin: Tipos** (atualizar interface)
6. **Frontend Admin: PromotionFormPage** (toggle de combinação)
7. **Frontend Admin: PromotionManagement** (tipo correto, filtros, coluna tipo)
8. **Frontend Admin: Navigation** (corrigir link quebrado)
9. **Frontend Client: Tipos** (adicionar campos)
10. **Frontend Client: useLocalCart** (flag `hasActivePromotion`)
11. **Frontend Client: api.ts** (atualizar CouponValidation)
12. **Frontend Client: Cart** (validação de combinação)

---

## 10. TESTES

### 10.1 Testes de Backend

1. **Teste de Migração:** Verificar que o campo `allowCouponOnPromotion` é adicionado corretamente
2. **Teste de Criação:** Criar cupom com `allowCouponOnPromotion = false`
3. **Teste de Validação:** Validar cupom retorna flag corretamente
4. **Teste de Combinação:** Criar pedido com item em promoção + cupom que não permite combinação → deve bloquear
5. **Teste de Combinação:** Criar pedido com item em promoção + cupom que permite combinação → deve aplicar

### 10.2 Testes de Frontend Admin

1. **Teste de Formulário:** Toggle aparece quando código é preenchido
2. **Teste de Formulário:** Toggle não aparece quando código está vazio
3. **Teste de Listagem:** Filtro por tipo funciona corretamente
4. **Teste de Listagem:** Coluna "Tipo" mostra badge correto

### 10.3 Testes de Frontend Client

1. **Teste de Carrinho:** Cupom que não permite combinação é bloqueado quando há itens em promoção
2. **Teste de Carrinho:** Cupom que permite combinação é aplicado normalmente
3. **Teste de Carrinho:** Mensagem de erro é exibida corretamente

---

## 11. COMPATIBILIDADE

### 11.1 Dados Existentes

- Migration usa `DEFAULT true` para `allowCouponOnPromotion`
- Cupons existentes continuarão funcionando (permitem combinação = comportamento atual)
- Nenhuma alteração necessária em dados existentes

### 11.2 APIs

- Nova flag é opcional (default `true`)
- APIs existentes continuam funcionando
- Frontend antigo continua funcionando (ignora flag)

### 11.3 Integrações

- iFood, UaiRango, Food99 não são afetados
- Pedidos via integração não usam cupons (validação própria)

---

## 12. RISCOS E MITIGAÇÕES

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Migração falha em produção | Alto | Testar em homologação primeiro; migration é simples (1 coluna) |
| Frontend antigo não envia flag | Baixo | Default `true` mantém comportamento atual |
| Admin confuso com novo toggle | Médio | Texto explicativo claro; toggle só aparece quando relevante |
| Client bloqueado incorretamente | Alto | Validação server-side; mensagem de erro clara com dica |

---

## 13. MÉTRAS DE SUCESSO

1. **Admin:** Usuários conseguem criar cupons com regra de combinação
2. **Admin:** Listagem mostra claramente Promoções vs Cupons
3. **Client:** Cupons que não permitem combinação são bloqueados corretamente
4. **Client:** Mensagens de erro são claras e orientam o usuário
5. **Backend:** Validação server-side previne descontos indevidos

---

**FIM DA SPEC**
