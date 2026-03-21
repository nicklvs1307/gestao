import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider, useModals } from './context/ModalContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'sonner';

// Componentes Estáticos (Leves)
import AdminLayout from './components/AdminLayout';
import GlobalModals from './components/GlobalModals';

// Lazy Loading das Páginas (Só carregam quando acessadas)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProductManagement = lazy(() => import('./components/ProductManagement'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const CategoryManagement = lazy(() => import('./components/CategoryManagement'));
const CategoryFormPage = lazy(() => import('./pages/CategoryFormPage'));
const PromotionManagement = lazy(() => import('./components/PromotionManagement'));
const PromotionFormPage = lazy(() => import('./pages/PromotionFormPage'));
const OrderManagement = lazy(() => import('./components/OrderManagement'));
const TableManagement = lazy(() => import('./components/TableManagement'));
const ReportManagement = lazy(() => import('./pages/ReportManagement'));
const SettingsManagement = lazy(() => import('./pages/SettingsManagement'));
const AddonManagement = lazy(() => import('./pages/AddonManagement'));
const AddonFormPage = lazy(() => import('./pages/AddonFormPage'));
const DeliveryAreaManagement = lazy(() => import('./components/DeliveryAreaManagement'));
const IntegrationManagement = lazy(() => import('./components/IntegrationManagement'));
const UserAndPermissions = lazy(() => import('./components/UserAndPermissions'));
const DriverManagement = lazy(() => import('./components/DriverManagement'));
const WaiterManagement = lazy(() => import('./pages/WaiterManagement'));
const WaiterPos = lazy(() => import('./pages/WaiterPos')); 
const PosPage = lazy(() => import('./pages/PosPage'));
const FinancialLayout = lazy(() => import('./pages/financial/FinancialLayout'));
const FinancialCategories = lazy(() => import('./pages/financial/FinancialCategories'));
const FinancialSuppliers = lazy(() => import('./pages/financial/FinancialSuppliers'));
const FinancialBankAccounts = lazy(() => import('./pages/financial/FinancialBankAccounts'));
const FinancialEntries = lazy(() => import('./pages/FinancialEntries'));
const FinancialManagement = lazy(() => import('./pages/FinancialManagement'));
const CashierManagement = lazy(() => import('./components/CashierManagement'));
const StockLayout = lazy(() => import('./pages/stock/StockLayout'));
const StockDashboard = lazy(() => import('./pages/stock/StockDashboard'));
const StockIngredients = lazy(() => import('./pages/stock/StockIngredients'));
const StockPurchases = lazy(() => import('./pages/stock/StockPurchases'));
const StockManagement = lazy(() => import('./pages/StockManagement'));
const FiscalManagement = lazy(() => import('./components/FiscalManagement'));
const CustomerManagement = lazy(() => import('./components/CustomerManagement'));
const PaymentMethodManagement = lazy(() => import('./components/PaymentMethodManagement'));
const KdsPage = lazy(() => import('./pages/KdsPage'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
const DriverSettlement = lazy(() => import('./pages/DriverSettlement'));
const WaiterSettlement = lazy(() => import('./pages/WaiterSettlement'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const CmvAnalysis = lazy(() => import('./pages/CmvAnalysis'));
const GlobalSizesPage = lazy(() => import('./pages/GlobalSizesPage'));
const ChecklistManagement = lazy(() => import('./pages/ChecklistManagement'));
const ChecklistFill = lazy(() => import('./pages/ChecklistFill'));
const TableCheckout = lazy(() => import('./pages/TableCheckout'));
const WhatsAppManagement = lazy(() => import('./pages/WhatsAppManagement'));
const WhatsAppChat = lazy(() => import('./pages/WhatsAppChat'));
const TechnicalSheetManagement = lazy(() => import('./pages/TechnicalSheetManagement'));

// Loading Fallback
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Carregando módulo...</p>
  </div>
);

function AdminRoutes() {
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const location = useLocation();
  const { openTableModal, openPaymentMethodModal, refetchPaymentMethods } = useModals();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/dashboard') setPageTitle('Dashboard');
    else if (path === '/products') setPageTitle('Gestão de Produtos');
    else if (path === '/addons') setPageTitle('Biblioteca de Complementos');
    else if (path === '/ingredients') setPageTitle('Estoque de Insumos');
    else if (path === '/categories') setPageTitle('Gestão de Categorias');
    else if (path === '/global-sizes') setPageTitle('Biblioteca de Tamanhos');
    else if (path === '/promotions') setPageTitle('Gestão de Promoções');
    else if (path === '/customers') setPageTitle('Cadastro de Clientes');
    else if (path === '/orders') setPageTitle('Gestão de Pedidos');
    else if (path === '/tables') setPageTitle('Gestão de Mesas');
    else if (path === '/reports') setPageTitle('Relatórios');
    else if (path === '/settings') setPageTitle('Configurações');
    else if (path === '/users') setPageTitle('Gerenciamento de Usuários');
    else if (path === '/drivers') setPageTitle('Equipe de Entregadores');
    else if (path === '/financial') setPageTitle('Fluxo de Caixa');
    else if (path === '/payment-methods') setPageTitle('Formas de Pagamento');
    else if (path === '/whatsapp') setPageTitle('WhatsApp & IA');
    else setPageTitle('Painel Administrativo');
  }, [location.pathname]);

  return (
    <AdminLayout title={pageTitle}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
          <Route path="/franchise/*" element={<SuperAdminDashboard />} />
          <Route path="/waiters/settlement" element={<WaiterSettlement />} />
          
          <Route path="/products" element={<ProtectedRoute permission="products:view"><ProductManagement /></ProtectedRoute>} />
          <Route path="/products/new" element={<ProtectedRoute permission="products:manage"><ProductFormPage /></ProtectedRoute>} />
          <Route path="/products/:id" element={<ProtectedRoute permission="products:manage"><ProductFormPage /></ProtectedRoute>} />
          
          <Route path="/addons/*" element={<ProtectedRoute permission="products:manage"><AddonManagement /></ProtectedRoute>} />
          <Route path="/addons/new" element={<ProtectedRoute permission="products:manage"><AddonFormPage /></ProtectedRoute>} />
          <Route path="/addons/:id" element={<ProtectedRoute permission="products:manage"><AddonFormPage /></ProtectedRoute>} />
          
          <Route path="/categories" element={<ProtectedRoute permission="categories:manage"><CategoryManagement /></ProtectedRoute>} />
          <Route path="/categories/new" element={<ProtectedRoute permission="categories:manage"><CategoryFormPage /></ProtectedRoute>} />
          <Route path="/categories/:id" element={<ProtectedRoute permission="categories:manage"><CategoryFormPage /></ProtectedRoute>} />
          
          <Route path="/global-sizes" element={<ProtectedRoute permission="products:manage"><GlobalSizesPage /></ProtectedRoute>} />
          
          <Route path="/promotions" element={
            <ProtectedRoute permission="products:manage">
              <PromotionManagement />
            </ProtectedRoute>
          } />
          <Route path="/promotions/new" element={<ProtectedRoute permission="products:manage"><PromotionFormPage /></ProtectedRoute>} />
          <Route path="/promotions/:id" element={<ProtectedRoute permission="products:manage"><PromotionFormPage /></ProtectedRoute>} />
          
          <Route path="/customers" element={<ProtectedRoute permission="orders:view"><CustomerManagement /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute permission="orders:view"><OrderManagement /></ProtectedRoute>} />
          
          <Route path="/tables" element={
            <ProtectedRoute permission="table:manage">
              <TableManagement onAddTableClick={() => openTableModal()} />
            </ProtectedRoute>
          } />
          
          <Route path="/pos/checkout/:orderId" element={<ProtectedRoute permission="table:manage"><TableCheckout /></ProtectedRoute>} />
          
          <Route path="/drivers/settlement" element={<ProtectedRoute permission="driver_settlement:manage"><DriverSettlement /></ProtectedRoute>} />
          <Route path="/drivers" element={<ProtectedRoute permission="driver_settlement:manage"><DriverManagement /></ProtectedRoute>} />
          <Route path="/drivers/*" element={<ProtectedRoute permission="driver_settlement:manage"><DriverManagement /></ProtectedRoute>} />
          
          <Route path="/auth/waiters" element={<ProtectedRoute permission="waiter_settlement:manage"><WaiterManagement /></ProtectedRoute>} />
          
          <Route path="/reports/*" element={<ProtectedRoute permission="reports:view"><ReportManagement /></ProtectedRoute>} />
          <Route path="/settings/*" element={<ProtectedRoute permission="settings:view"><SettingsManagement /></ProtectedRoute>} />
          <Route path="/integrations" element={<ProtectedRoute permission="integrations:manage"><IntegrationManagement /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute permission="users:manage"><UserAndPermissions /></ProtectedRoute>} />
          
          <Route path="/pos" element={<ProtectedRoute permission="pos:access"><PosPage /></ProtectedRoute>} />
          <Route path="/cashier" element={<ProtectedRoute permission="cashier:manage"><CashierManagement /></ProtectedRoute>} />
          <Route path="/kds" element={<ProtectedRoute permission="kds:view"><KdsPage /></ProtectedRoute>} />
          
          <Route path="/financial" element={<ProtectedRoute permission="financial:view"><FinancialLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="entries" replace />} />
            <Route path="entries" element={<FinancialEntries />} />
            <Route path="categories" element={<FinancialCategories />} />
            <Route path="suppliers" element={<FinancialSuppliers />} />
            <Route path="bank-accounts" element={<FinancialBankAccounts />} />
          </Route>
          
          <Route path="/payment-methods" element={
            <ProtectedRoute permission="financial:manage">
              <PaymentMethodManagement 
                onAddClick={() => openPaymentMethodModal()} 
                onEditClick={(method) => openPaymentMethodModal(method)}
                refetchTrigger={refetchPaymentMethods}
              />
            </ProtectedRoute>
          } />
          
          <Route path="/stock" element={<ProtectedRoute permission="stock:view"><StockLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StockDashboard />} />
            <Route path="ingredients" element={<StockIngredients />} />
            <Route path="purchases" element={<StockPurchases />} />
            {/* Outras rotas como produção serão migradas a seguir */}
          </Route>
          <Route path="/production/technical-sheets" element={<ProtectedRoute permission="products:manage"><TechnicalSheetManagement /></ProtectedRoute>} />
          <Route path="/fiscal" element={<ProtectedRoute permission="settings:manage"><FiscalManagement /></ProtectedRoute>} />
          <Route path="/checklists" element={<ProtectedRoute permission="orders:view"><ChecklistManagement /></ProtectedRoute>} />
          <Route path="/whatsapp/*" element={<ProtectedRoute permission="settings:manage"><WhatsAppManagement /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <GlobalModals />
    </AdminLayout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ModalProvider>
          <Toaster position="top-right" richColors closeButton />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/waiter" element={<ProtectedRoute permission="waiter:pos"><WaiterPos /></ProtectedRoute>} />
              <Route path="/checklist/fill/:id" element={<ChecklistFill />} />
              <Route path="/driver/dashboard" element={<ProtectedRoute permission="delivery:manage"><DriverDashboard /></ProtectedRoute>} />
              <Route path="/*" element={<ProtectedRoute><AdminRoutes /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </ModalProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
