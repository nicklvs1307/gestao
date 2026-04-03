import { useAuth } from '../context/AuthContext';

const MODULE_LABELS: Record<string, string> = {
  orders: 'Pedidos & Vendas',
  pos: 'PDV',
  products: 'Cardápio',
  settings: 'Configurações',
  delivery: 'Delivery',
  financial: 'Financeiro',
  reports: 'Relatórios',
  customers: 'Clientes',
  coupons: 'Cupons',
  kds: 'KDS',
  checklists: 'Checklists',
  stock: 'Estoque',
  dashboards: 'Dashboards',
  whatsapp: 'WhatsApp & IA',
  fiscal: 'Fiscal',
  integrations: 'Integrações',
  franchise: 'Franquia'
};

export const useModules = () => {
  const { user } = useAuth();
  
  const enabledModules = user?.enabledModules || [];
  const plan = user?.plan || 'FREE';
  const isSuperAdmin = user?.isSuperAdmin || false;

  const hasModule = (module: string): boolean => {
    if (isSuperAdmin) return true;
    return enabledModules.includes(module);
  };

  const getModuleLabel = (module: string): string => {
    return MODULE_LABELS[module] || module;
  };

  return {
    enabledModules,
    plan,
    isSuperAdmin,
    hasModule,
    getModuleLabel
  };
};

export { MODULE_LABELS };
