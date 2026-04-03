const PLAN_MODULES = {
  FREE: ['orders', 'pos', 'products', 'settings'],
  SILVER: ['orders', 'pos', 'products', 'settings', 'delivery', 'financial', 'reports', 'customers', 'coupons'],
  GOLD: ['orders', 'pos', 'products', 'settings', 'delivery', 'financial', 'reports', 'customers', 'coupons', 'kds', 'checklists', 'stock', 'dashboards'],
  DIAMOND: ['orders', 'pos', 'products', 'settings', 'delivery', 'financial', 'reports', 'customers', 'coupons', 'kds', 'checklists', 'stock', 'dashboards', 'whatsapp', 'fiscal', 'integrations', 'franchise']
};

const MODULE_LABELS = {
  orders: 'Pedidos & Vendas',
  pos: 'PDV (Ponto de Venda)',
  products: 'Cardápio & Produtos',
  settings: 'Configurações da Loja',
  delivery: 'Delivery & Entregas',
  financial: 'Financeiro',
  reports: 'Relatórios',
  customers: 'Clientes',
  coupons: 'Cupons & Promoções',
  kds: 'KDS (Cozinha)',
  checklists: 'Checklists & Rotinas',
  stock: 'Estoque & CMV',
  dashboards: 'Dashboards',
  whatsapp: 'WhatsApp & IA',
  fiscal: 'Fiscal (NFC-e)',
  integrations: 'Integrações',
  franchise: 'Franquia'
};

const MODULE_DESCRIPTIONS = {
  orders: 'Gestão completa de pedidos, mesas e comandas',
  pos: 'Frente de caixa e PDV para atendimento presencial',
  products: 'Cardápio digital, produtos, categorias e complementos',
  settings: 'Configurações gerais, mesas, impressão e dados da loja',
  delivery: 'Gestão de entregas, áreas de entrega e motoristas',
  financial: 'Financeiro completo: caixa, lançamentos, contas bancárias',
  reports: 'Relatórios de vendas, desempenho e faturamento',
  customers: 'Cadastro e gestão de clientes',
  coupons: 'Cupons de desconto e promoções',
  kds: 'Kitchen Display System — monitor de cozinha',
  checklists: 'Checklists de abertura, fechamento e rotinas operacionais',
  stock: 'Controle de estoque, ficha técnica, CMV e ingredientes',
  dashboards: 'Painéis visuais de acompanhamento de vendas',
  whatsapp: 'Integração com WhatsApp e assistente de IA',
  fiscal: 'Emissão de NFC-e e configurações fiscais',
  integrations: 'Integrações com plataformas de delivery (iFood, Saipos, etc)',
  franchise: 'Gestão de franquias e múltiplas unidades'
};

function getModulesForPlan(plan) {
  return PLAN_MODULES[plan] || PLAN_MODULES.FREE;
}

function getAllModules() {
  return Object.keys(PLAN_MODULES.DIAMOND);
}

module.exports = {
  PLAN_MODULES,
  MODULE_LABELS,
  MODULE_DESCRIPTIONS,
  getModulesForPlan,
  getAllModules
};
