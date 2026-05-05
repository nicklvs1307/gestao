const CASHIER_CONSTANTS = {
  TRANSACTION_PREFIXES: {
    SANGRIA: '[SANGRIA]',
    REFORCO: '[REFORÇO]',
    CLOSING_SAFE_EXPENSE: '[FECHAMENTO] Sangria automática para Cofre',
    CLOSING_SAFE_INCOME: (sessionId) => `[FECHAMENTO] Entrada do Caixa (Sessão ${sessionId.slice(-4)})`,
  },
  CATEGORIES: {
    REFORCO: 'Reforço de Caixa',
    SANGRIA: 'Sangria de Caixa',
  },
  ACCOUNTS: {
    SAFE: 'Cofre Loja',
  },
  STATUS: {
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
  },
  METHODS: {
    CASH: 'CASH',
  },
};

module.exports = CASHIER_CONSTANTS;