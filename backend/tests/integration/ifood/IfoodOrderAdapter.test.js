const ifoodOrderAdapter = require('../../../src/services/IfoodOrderAdapter');

describe('IfoodOrderAdapter.parseOrder', () => {
  let adapter;

  beforeEach(() => {
    adapter = ifoodOrderAdapter; // Usa a instância exportada diretamente
  });

  // ─── 1. CÁLCULO DE SUBTOTAL (CORREÇÃO DO DUPLO CONTADOR) ────────────────────────
  describe('Subtotal Calculation', () => {
    test('should not double-count when item has totalPrice', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [
          {
            id: 'item_1',
            name: 'X-Burger',
            quantity: 2,
            unitPrice: 10.00,
            totalPrice: 20.00, // Já é unitPrice * quantity
          },
        ],
        total: { subTotal: 20.00, deliveryFee: 5.00, orderAmount: 25.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      expect(result.totals.subtotal).toBe(20.00);
    });

    test('should calculate correctly when item has only unitPrice', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [
          {
            id: 'item_1',
            name: 'X-Burger',
            quantity: 3,
            unitPrice: 10.00,
            // totalPrice ausente
          },
        ],
        total: { subTotal: 30.00, deliveryFee: 5.00, orderAmount: 35.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      expect(result.totals.subtotal).toBe(30.00);
    });

    test('should use API subTotal when available', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [
          { id: 'item_1', name: 'X-Burger', quantity: 1, unitPrice: 10.00, totalPrice: 10.00 },
          { id: 'item_2', name: 'Fries', quantity: 1, unitPrice: 5.00, totalPrice: 5.00 },
        ],
        total: { subTotal: 15.00, deliveryFee: 5.00, orderAmount: 20.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      expect(result.totals.subtotal).toBe(15.00);
    });
  });

  // ─── 2. FORMAS DE PAGAMENTO (CORREÇÃO ONLINE_PAID) ──────────────────────────────
  describe('Payment Method Detection', () => {
    test('should set rawMethod to ONLINE_PAID for 100% prepaid orders', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [{ id: 'item_1', name: 'X-Burger', quantity: 1, unitPrice: 20.00, totalPrice: 20.00 }],
        payments: {
          prepaid: 25.00, // Total pago online
          pending: 0,
          methods: [
            { type: 'ONLINE', method: 'PIX', value: 25.00 }
          ]
        },
        total: { subTotal: 20.00, deliveryFee: 5.00, orderAmount: 25.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      expect(result.payment.rawMethod).toBe('ONLINE_PAID');
      expect(result.payment.isPrepaid).toBe(true);
      expect(result.payment.prepaidAmount).toBe(25.00);
      expect(result.payment.pendingAmount).toBe(0);
    });

    test('should set rawMethod to CASH for offline cash orders', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [{ id: 'item_1', name: 'X-Burger', quantity: 1, unitPrice: 20.00, totalPrice: 20.00 }],
        payments: {
          prepaid: 0,
          pending: 25.00,
          methods: [
            { type: 'OFFLINE', method: 'CASH', value: 25.00, cash: { changeFor: 5.00 } }
          ]
        },
        total: { subTotal: 20.00, deliveryFee: 5.00, orderAmount: 25.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      expect(result.payment.rawMethod).toBe('CASH');
      expect(result.payment.isPrepaid).toBe(false);
      expect(result.payment.pendingAmount).toBe(25.00);
      expect(result.payment.changeFor).toBe(5.00);
    });

    test('should handle mixed payments (online + offline)', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [{ id: 'item_1', name: 'X-Burger', quantity: 1, unitPrice: 20.00, totalPrice: 20.00 }],
        payments: {
          prepaid: 10.00,
          pending: 15.00,
          methods: [
            { type: 'ONLINE', method: 'CREDIT_CARD', value: 10.00 },
            { type: 'OFFLINE', method: 'CASH', value: 15.00, changeFor: 5.00 }
          ]
        },
        total: { subTotal: 20.00, deliveryFee: 5.00, orderAmount: 25.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      expect(result.payment.isPrepaid).toBe(true);
      expect(result.payment.prepaidAmount).toBe(10.00);
      expect(result.payment.pendingAmount).toBe(15.00);
      expect(result.payment.rawMethod).toBe('CASH'); // Offline method
      expect(result.payment.changeFor).toBe(5.00);
    });
  });

  // ─── 3. TOTAIS DO PEDIDO (CONSISTÊNCIA) ────────────────────────────────────────
  describe('Order Totals Consistency', () => {
    test('should match orderAmount with subtotal + deliveryFee - discount', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [
          { id: 'item_1', name: 'X-Burger', quantity: 1, unitPrice: 20.00, totalPrice: 20.00 },
          { id: 'item_2', name: 'Soda', quantity: 2, unitPrice: 5.00, totalPrice: 10.00 },
        ],
        payments: { prepaid: 0, pending: 35.00, methods: [{ type: 'OFFLINE', method: 'CASH', value: 35.00 }] },
        total: { subTotal: 30.00, deliveryFee: 5.00, discount: 0, orderAmount: 35.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      const calculatedTotal = result.totals.subtotal + result.totals.deliveryFee - result.totals.discount;
      expect(result.totals.total).toBe(calculatedTotal);
      expect(result.totals.total).toBe(35.00);
    });

    test('should handle discount correctly', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [{ id: 'item_1', name: 'X-Burger', quantity: 1, unitPrice: 20.00, totalPrice: 20.00 }],
        payments: { prepaid: 0, pending: 23.00, methods: [{ type: 'OFFLINE', method: 'CASH', value: 23.00 }] },
        total: { subTotal: 20.00, deliveryFee: 5.00, benefits: 2.00, orderAmount: 23.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      expect(result.totals.discount).toBe(2.00);
      expect(result.totals.total).toBe(23.00);
    });
  });

  // ─── 4. EXTRAÇÃO DE CHANGE FOR ──────────────────────────────────────────────────
  describe('ChangeFor Extraction', () => {
    test('should extract changeFor from offline cash method', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [{ id: 'item_1', name: 'X-Burger', quantity: 1, unitPrice: 20.00, totalPrice: 20.00 }],
        payments: {
          prepaid: 0,
          pending: 50.00,
          methods: [
            { 
              type: 'OFFLINE', 
              method: 'CASH', 
              value: 50.00, 
              cash: { changeFor: 20.00 } // Correção do commit b8503b9
            }
          ]
        },
        total: { subTotal: 20.00, deliveryFee: 5.00, orderAmount: 25.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      expect(result.payment.changeFor).toBe(20.00);
    });

    test('should return null when no changeFor is provided', () => {
      const rawData = {
        orderType: 'DELIVERY',
        items: [{ id: 'item_1', name: 'X-Burger', quantity: 1, unitPrice: 20.00, totalPrice: 20.00 }],
        payments: {
          prepaid: 0,
          pending: 25.00,
          methods: [{ type: 'OFFLINE', method: 'CREDIT_CARD', value: 25.00 }]
        },
        total: { subTotal: 20.00, deliveryFee: 5.00, orderAmount: 25.00 },
      };

      const result = adapter.parseOrder(rawData, 'rest_123');
      expect(result.payment.changeFor).toBeNull();
    });
  });

  // ─── 5. MOCK DE PEDIDO COMPLETO (SANDBOX IFOD) ────────────────────────────────
  describe('Full Order Mock (iFood Sandbox)', () => {
    test('should parse a complete prepaid order from iFood sandbox', () => {
      const sandboxOrder = {
        id: 'ord_sandbox_123',
        orderType: 'DELIVERY',
        customer: { name: 'Cliente Teste', phone: { number: '11999999999' } },
        items: [
          {
            id: 'item_1',
            name: 'Pizza Grande',
            quantity: 1,
            unitPrice: 45.00,
            totalPrice: 45.00,
            observations: 'Sem cebola',
            options: [
              { name: 'Borda Recheada', unitPrice: 5.00, totalPrice: 5.00, quantity: 1 }
            ]
          }
        ],
        payments: {
          prepaid: 55.00,
          pending: 0,
          methods: [
            { type: 'ONLINE', method: 'PIX', value: 55.00 }
          ]
        },
        total: { subTotal: 50.00, deliveryFee: 5.00, benefits: 0, orderAmount: 55.00 },
        delivery: {
          deliveryAddress: {
            formattedAddress: 'Rua Teste, 123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            postalCode: '01000-000',
            coordinates: { latitude: -23.5505, longitude: -46.6333 }
          }
        }
      };

      const result = adapter.parseOrder(sandboxOrder, 'rest_123');
      
      // Verifica estrutura
      expect(result.orderType).toBe('DELIVERY');
      expect(result.customer.name).toBe('Cliente Teste');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].addons).toHaveLength(1);
      
      // Verifica pagamento
      expect(result.payment.rawMethod).toBe('ONLINE_PAID');
      expect(result.payment.isPrepaid).toBe(true);
      expect(result.payment.prepaidAmount).toBe(55.00);
      
      // Verifica totais
      expect(result.totals.subtotal).toBe(50.00);
      expect(result.totals.total).toBe(55.00);
      
      // Verifica endereço
      expect(result.deliveryData.address).toBe('Rua Teste, 123');
    });
  });
});
