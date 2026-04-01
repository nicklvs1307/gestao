import {
  ShieldCheck, Share2, Database, ShoppingCart, MessageSquare,
  Calculator, ChefHat, ClipboardList, Utensils, Pizza,
  Layers, Maximize2, ListOrdered, Tag, DollarSign, Truck,
  Users2, Building2, CreditCard, Receipt, Monitor, UserCog,
  Ticket, FileText, BarChart3, Clock, MapPin, Warehouse,
  MoveHorizontal, Package, History, LayoutDashboard, Settings,
  X, Star, Wallet
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  permission?: string;
}

export interface NavCategory {
  title: string;
  icon: any;
  items: NavItem[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    title: "Super Admin",
    icon: ShieldCheck,
    items: [
      { label: "Painel Global", path: "/super-admin", icon: LayoutDashboard },
      { label: "Gerenciar Franquias", path: "/super-admin/franchises", icon: Share2 },
      { label: "Gerenciar Lojas", path: "/super-admin/restaurants", icon: Database },
      { label: "Permissões Globais", path: "/super-admin/permissions", icon: ShieldCheck },
    ]
  },
  {
    title: "Gestão de Franquia",
    icon: Share2,
    items: [
      { label: "Minhas Lojas", path: "/franchise/my-restaurants", icon: Database, permission: 'reports:view_all' },
      { label: "Relatórios da Rede", path: "/franchise/reports", icon: BarChart3, permission: 'reports:view_all' },
    ]
  },
  {
    title: "Vendas & Operacional",
    icon: ShoppingCart,
    items: [
      { label: "Monitor de Pedidos", path: "/orders", icon: ListOrdered, permission: 'orders:view' },
      { label: "Central de Atendimento", path: "/whatsapp/chat", icon: MessageSquare, permission: 'orders:view' },
      { label: "PDV - Frente de Caixa", path: "/pos", icon: Calculator, permission: 'pos:access' },
      { label: "KDS - Monitor de Cozinha", path: "/kds", icon: ChefHat, permission: 'kds:view' },
      { label: "Checklists & Rotinas", path: "/checklists", icon: ClipboardList, permission: 'orders:view' },
      { label: "Terminal do Garçom", path: "/waiter", icon: Utensils, permission: 'waiter:pos' },
    ]
  },
  {
    title: "Cardápio",
    icon: Utensils,
    items: [
      { label: "Cardápio", path: "/products", icon: Pizza, permission: 'products:view' },
      { label: "Categorias", path: "/categories", icon: Layers, permission: 'categories:manage' },
      { label: "Tamanhos Globais", path: "/global-sizes", icon: Maximize2, permission: 'products:manage' },
      { label: "Complementos", path: "/addons", icon: ListOrdered, permission: 'products:manage' },
      { label: "Promoções", path: "/promotions", icon: Tag, permission: 'products:manage' },
    ]
  },
  {
    title: "Financeiro",
    icon: DollarSign,
    items: [
      { label: "Acerto de Entregadores", path: "/drivers/settlement", icon: Truck, permission: 'driver_settlement:manage' },
      { label: "Acerto de Garçons", path: "/waiters/settlement", icon: Users2, permission: 'waiter_settlement:manage' },
      { label: "Categorias Financeiras", path: "/financial/categories", icon: ListOrdered, permission: 'financial_categories:manage' },
      { label: "Contas Bancárias", path: "/financial/bank-accounts", icon: Building2, permission: 'bank_accounts:manage' },
      { label: "Fluxo de Caixa", path: "/financial", icon: Wallet, permission: 'financial:view' },
      { label: "Formas de Pagamento", path: "/payment-methods", icon: CreditCard, permission: 'financial:manage' },
      { label: "Fornecedores", path: "/financial/suppliers", icon: Users2, permission: 'suppliers:manage' },
      { label: "Frentes de Caixa", path: "/cashier", icon: Calculator, permission: 'cashier:manage' },
      { label: "Lançamentos Financeiros", path: "/financial/entries", icon: Receipt, permission: 'financial:manage' },
      { label: "Fiscal (NFC-e)", path: "/fiscal", icon: Monitor, permission: 'settings:manage' },
    ]
  },
  {
    title: "Relacionamento com cliente",
    icon: Users2,
    items: [
      { label: "Cadastro de Clientes", path: "/customers", icon: UserCog, permission: 'orders:view' },
      { label: "Cupons de Desconto", path: "/coupons", icon: Ticket, permission: 'products:manage' },
    ]
  },
  {
    title: "Relatórios",
    icon: FileText,
    items: [
      { label: "Cupons Gerados", path: "/reports/coupons", icon: Ticket, permission: 'reports:view' },
      { label: "Desempenho por Atendente", path: "/reports/staff", icon: Users2, permission: 'reports:performance' },
      { label: "Desempenho por Garçom", path: "/reports/waiters", icon: Users2, permission: 'reports:performance' },
      { label: "DRE Gerencial", path: "/reports/dre", icon: Calculator, permission: 'reports:financial' },
      { label: "Faturamento por Dia", path: "/reports/billing", icon: BarChart3, permission: 'reports:view' },
      { label: "Itens Consumidos", path: "/reports/consumed-items", icon: ClipboardList, permission: 'reports:view' },
      { label: "Itens Vendidos", path: "/reports/items", icon: ClipboardList, permission: 'reports:view' },
      { label: "Tempo de Produção", path: "/reports/production", icon: Clock, permission: 'reports:view' },
      { label: "Tempo por Status", path: "/reports/status-time", icon: Clock, permission: 'reports:view' },
      { label: "Vendas por Área de Entrega", path: "/reports/delivery-areas", icon: MapPin, permission: 'reports:view' },
      { label: "Vendas por Forma de Pagamento", path: "/reports/payments", icon: CreditCard, permission: 'reports:view' },
      { label: "Vendas por Período", path: "/reports/period", icon: BarChart3, permission: 'reports:view' },
      { label: "Mapa Geográfico de Vendas", path: "/reports/sales-map", icon: MapPin, permission: 'reports:view' },
    ]
  },
  {
    title: "Estoque",
    icon: Warehouse,
    items: [
      { label: "Análise e Simulação de CMV", path: "/stock/cmv", icon: Calculator, permission: 'reports:abc' },
      { label: "Ficha Técnica (Mestra)", path: "/production/technical-sheets", icon: ChefHat, permission: 'products:manage' },
      { label: "Grupos de Ingrediente", path: "/ingredients/groups", icon: Layers, permission: 'stock:manage' },
      { label: "Histórico de Posição de Estoque", path: "/stock/history", icon: History, permission: 'stock:view' },
      { label: "Ingredientes e Insumos", path: "/ingredients", icon: Package, permission: 'stock:manage' },
      { label: "Lista de Compras", path: "/stock/shopping-list", icon: ShoppingCart, permission: 'stock:manage' },
      { label: "Movimentações de Estoque", path: "/stock/moves", icon: MoveHorizontal, permission: 'stock:manage' },
      { label: "Notas de Entrada", path: "/stock/invoices", icon: Receipt, permission: 'stock:manage' },
      { label: "Ordem de Compra", path: "/stock/purchase-orders", icon: ClipboardList, permission: 'stock:manage' },
    ]
  },
  {
    title: "Dashboards",
    icon: LayoutDashboard,
    items: [
      { label: "Acompanhamento de Vendas", path: "/dashboard", icon: BarChart3, permission: 'reports:view' },
      { label: "Canais", path: "/dashboard/channels", icon: Share2, permission: 'reports:view' },
      { label: "Faturamento", path: "/dashboard/billing", icon: DollarSign, permission: 'reports:view' },
      { label: "Vendas por Data / Hora", path: "/dashboard/hourly", icon: Clock, permission: 'reports:view' },
      { label: "Mapa Geográfico", path: "/reports/sales-map", icon: MapPin, permission: 'reports:view' },
    ]
  },
  {
    title: "Opções da Loja",
    icon: Settings,
    items: [
      { label: "Áreas de Entrega", path: "/settings/delivery-zones", icon: MapPin, permission: 'settings:manage' },
      { label: "Canais de Venda e Integrações", path: "/integrations", icon: Share2, permission: 'integrations:manage' },
      { label: "Comandas", path: "/tables", icon: LayoutDashboard, permission: 'table:manage' },
      { label: "Configurações", path: "/settings/general", icon: Settings, permission: 'settings:manage' },
      { label: "Dados da Loja", path: "/settings", icon: Database, permission: 'settings:view' },
      { label: "Dados Fiscais", path: "/fiscal", icon: ShieldCheck, permission: 'settings:manage' },
      { label: "Entregadores", path: "/drivers", icon: Truck, permission: 'driver_settlement:manage' },
      { label: "Garçons", path: "/auth/waiters", icon: Users2, permission: 'waiter_settlement:manage' },
      { label: "Mesas", path: "/tables", icon: LayoutDashboard, permission: 'table:manage' },
      { label: "Modelos de Impressão", path: "/settings/printing", icon: FileText, permission: 'integrations:manage' },
      { label: "Motivos de Cancelamento", path: "/settings/cancellation-reasons", icon: X, permission: 'settings:manage' },
      { label: "Status da Venda", path: "/settings/sale-status", icon: Star, permission: 'settings:manage' },
      { label: "Turnos", path: "/settings/shifts", icon: Clock, permission: 'settings:manage' },
      { label: "Usuários e Permissões", path: "/users", icon: ShieldCheck, permission: 'users:manage' },
      { label: "WhatsApp & IA", path: "/whatsapp", icon: MessageSquare, permission: 'settings:manage' },
    ]
  }
];
