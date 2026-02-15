import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Importar as páginas de Login e Registro
import LoginPage from './pages/LoginPage';

// Importar Layout e Componentes
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import ProductManagement from './components/ProductManagement';
import ProductFormPage from './pages/ProductFormPage';
import CategoryManagement from './components/CategoryManagement';
import CategoryFormModal from './components/CategoryFormModal';
import PromotionManagement from './components/PromotionManagement';
import PromotionFormModal from './components/PromotionFormModal';
import OrderManagement from './components/OrderManagement';
import OrderDetailModal from './components/OrderDetailModal';
import TableManagement from './components/TableManagement';
import TableFormModal from './components/TableFormModal';
import ReportManagement from './pages/ReportManagement';
import SettingsManagement from './pages/SettingsManagement';
import AddonManagement from './pages/AddonManagement';
import DeliveryAreaManagement from './components/DeliveryAreaManagement';
import IntegrationManagement from './components/IntegrationManagement';
import UserAndPermissions from './components/UserAndPermissions';
import DriverManagement from './components/DriverManagement';
import WaiterManagement from './pages/WaiterManagement';
import WaiterPos from './pages/WaiterPos'; 
import PosPage from './pages/PosPage';
import FinancialManagement from './pages/FinancialManagement';
import CashierManagement from './components/CashierManagement';
import StockManagement from './pages/StockManagement';
import FiscalManagement from './components/FiscalManagement';
import CustomerManagement from './components/CustomerManagement';
import PaymentMethodManagement from './components/PaymentMethodManagement';
import PaymentMethodFormModal from './components/PaymentMethodFormModal';
import KdsPage from './pages/KdsPage';
import DriverDashboard from './pages/DriverDashboard';
import DriverSettlement from './pages/DriverSettlement';
import WaiterSettlement from './pages/WaiterSettlement';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import IngredientManagement from './components/IngredientManagement';
import CmvAnalysis from './pages/CmvAnalysis';
import DreManagement from './components/DreManagement';
import StaffPerformance from './components/StaffPerformance';
import GlobalSizesPage from './pages/GlobalSizesPage';
import ChecklistManagement from './pages/ChecklistManagement';
import ChecklistFill from './pages/ChecklistFill';
import { Toaster } from 'sonner';

import GlobalModals from './components/GlobalModals';

// Componente Wrapper para injetar o layout
function AdminRoutes() {
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const location = useLocation();

  // State for Table Modal
  const [isTableModalOpen, setTableModalOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<any | null>(null);
  const [refetchTables, setRefetchTables] = useState(0);

  // State for Category Modal
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);
  const [refetchCategories, setRefetchCategories] = useState(0);

  // State for Promotion Modal
  const [isPromotionModalOpen, setPromotionModalOpen] = useState(false);
  const [promotionToEdit, setPromotionToEdit] = useState<any | null>(null);
  const [refetchPromotions, setRefetchPromotions] = useState(0);

  // State for Order Detail Modal
  const [isOrderDetailModalOpen, setOrderDetailModalOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<any | null>(null);

  // State for Payment Method Modal
  const [isPaymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false);
  const [paymentMethodToEdit, setPaymentMethodToEdit] = useState<any | null>(null);
  const [refetchPaymentMethods, setRefetchPaymentMethods] = useState(0);

  // Handlers for Payment Method Modal
  const handleEditPaymentMethodClick = (method: any) => {
    setPaymentMethodToEdit(method);
    setPaymentMethodModalOpen(true);
  };
  const handlePaymentMethodModalClose = () => {
    setPaymentMethodModalOpen(false);
    setPaymentMethodToEdit(null);
  };
  const handlePaymentMethodSave = () => {
    handlePaymentMethodModalClose();
    setRefetchPaymentMethods(p => p + 1);
  };

  // Handlers for Table Modal
  const handleEditTableClick = (table: any) => {
    setTableToEdit(table);
    setTableModalOpen(true);
  };
  const handleTableModalClose = () => {
    setTableModalOpen(false);
    setTableToEdit(null);
  };
  const handleTableSave = () => {
    handleTableModalClose();
    setRefetchTables(t => t + 1);
  };

  // Handlers for Category Modal
  const handleEditCategoryClick = (category: any) => {
    setCategoryToEdit(category);
    setCategoryModalOpen(true);
  };
  const handleCategoryModalClose = () => {
    setCategoryModalOpen(false);
    setCategoryToEdit(null);
  };
  const handleCategorySave = () => {
    handleCategoryModalClose();
    setRefetchCategories(t => t + 1);
  };

  // Handlers for Promotion Modal
  const handleEditPromotionClick = (promotion: any) => {
    setPromotionToEdit(promotion);
    setPromotionModalOpen(true);
  };
  const handlePromotionModalClose = () => {
    setPromotionModalOpen(false);
    setPromotionToEdit(null);
  };
  const handlePromotionSave = () => {
    handlePromotionModalClose();
    setRefetchPromotions(p => p + 1);
  };

  // Handlers for Order Detail Modal
  const handleViewOrderDetails = (order: any) => {
    setOrderToView(order);
    setOrderDetailModalOpen(true);
  };
  const handleOrderDetailModalClose = () => {
    setOrderDetailModalOpen(false);
    setOrderToView(null);
  };

  useEffect(() => {
    switch (location.pathname) {
      case '/dashboard':
        setPageTitle('Dashboard');
        break;
      case '/products':
        setPageTitle('Gestão de Produtos');
        break;
      case '/addons':
        setPageTitle('Biblioteca de Complementos');
        break;
      case '/ingredients':
        setPageTitle('Estoque de Insumos');
        break;
      case '/products/new':
        setPageTitle('Novo Produto');
        break;
      case '/categories':
        setPageTitle('Gestão de Categorias');
        break;
      case '/global-sizes':
        setPageTitle('Biblioteca de Tamanhos');
        break;
      case '/promotions':
        setPageTitle('Gestão de Promoções');
        break;
      case '/customers':
        setPageTitle('Cadastro de Clientes');
        break;
      case '/orders':
        setPageTitle('Gestão de Pedidos');
        break;
      case '/tables':
        setPageTitle('Gestão de Mesas');
        break;
      case '/reports':
        setPageTitle('Relatórios');
        break;
      case '/reports/dre':
        setPageTitle('DRE Gerencial');
        break;
      case '/reports/sales-map':
        setPageTitle('Mapa Geográfico de Vendas');
        break;
      case '/reports/staff':
        setPageTitle('Desempenho da Equipe');
        break;
      case '/settings':
        setPageTitle('Configurações');
        break;
      case '/users':
        setPageTitle('Gerenciamento de Usuários');
        break;
      case '/drivers':
        setPageTitle('Equipe de Entregadores');
        break;
      case '/drivers/settlement':
        setPageTitle('Acerto de Motoboys');
        break;
      case '/waiters/settlement':
        setPageTitle('Comissão de Garçons');
        break;
      case '/stock/cmv':
        setPageTitle('Análise de CMV');
        break;
      case '/pos':
        setPageTitle('PDV - Ponto de Venda');
        break;
      case '/cashier':
        setPageTitle('Gestão de Caixa');
        break;
      case '/kds':
        setPageTitle('Monitor de Produção (KDS)');
        break;
      case '/financial':
        setPageTitle('Fluxo de Caixa');
        break;
      case '/financial/entries':
        setPageTitle('Lançamentos Financeiros');
        break;
      case '/financial/bank-accounts':
        setPageTitle('Contas Bancárias');
        break;
      case '/payment-methods':
        setPageTitle('Formas de Pagamento');
        break;
      case '/fiscal':
        setPageTitle('Fiscal & Notas (NFC-e)');
        break;
      case '/checklists':
        setPageTitle('Checklists & Rotinas');
        break;
      default:
        if (location.pathname.startsWith('/products/')) {
             setPageTitle('Editar Produto');
        } else {
             setPageTitle('Painel Administrativo');
        }
    }
  }, [location.pathname]);

  return (
    <AdminLayout title={pageTitle}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/franchises" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/restaurants" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/subscriptions" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/permissions" element={<SuperAdminDashboard />} />
        <Route path="/franchise/my-restaurants" element={<SuperAdminDashboard />} />
        <Route path="/franchise/reports" element={<SuperAdminDashboard />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/waiters/settlement" element={<WaiterSettlement />} />
        <Route path="/products" element={
          <ProtectedRoute permission="products:view">
            <ProductManagement 
              onAddProductClick={() => {}} 
              onEditProductClick={() => {}} 
              refetchTrigger={0}
            />
          </ProtectedRoute>
        } />
        <Route path="/addons" element={
          <ProtectedRoute permission="products:manage">
            <AddonManagement />
          </ProtectedRoute>
        } />
        <Route path="/ingredients" element={
          <ProtectedRoute permission="stock:manage">
            <StockManagement />
          </ProtectedRoute>
        } />
        <Route path="/products/new" element={
          <ProtectedRoute permission="products:manage">
            <ProductFormPage />
          </ProtectedRoute>
        } />
        <Route path="/products/:id" element={
          <ProtectedRoute permission="products:manage">
            <ProductFormPage />
          </ProtectedRoute>
        } />
        <Route path="/categories" element={
          <ProtectedRoute permission="categories:manage">
            <CategoryManagement 
              onAddCategoryClick={() => setCategoryModalOpen(true)}
              onEditCategoryClick={handleEditCategoryClick}
              refetchTrigger={refetchCategories}
            />
          </ProtectedRoute>
        } />
        <Route path="/global-sizes" element={
          <ProtectedRoute permission="products:manage">
            <GlobalSizesPage />
          </ProtectedRoute>
        } />
        <Route path="/promotions" element={
          <ProtectedRoute permission="products:manage">
            <PromotionManagement 
              onAddPromotionClick={() => setPromotionModalOpen(true)}
              onEditPromotionClick={handleEditPromotionClick}
              refetchTrigger={refetchPromotions}
            />
          </ProtectedRoute>
        } />
        <Route path="/coupons" element={
          <ProtectedRoute permission="products:manage">
            <PromotionManagement 
              onAddPromotionClick={() => setPromotionModalOpen(true)}
              onEditPromotionClick={handleEditPromotionClick}
              refetchTrigger={refetchPromotions}
            />
          </ProtectedRoute>
        } />
        <Route path="/customers" element={
          <ProtectedRoute permission="orders:view">
            <CustomerManagement />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute permission="orders:view">
            <OrderManagement />
          </ProtectedRoute>
        } />
        <Route path="/tables" element={
          <ProtectedRoute permission="table:manage">
            <TableManagement 
              onAddTableClick={() => setTableModalOpen(true)} 
              onEditTableClick={handleEditTableClick}
              refetchTrigger={refetchTables}
            />
          </ProtectedRoute>
        } />
        <Route path="/drivers" element={
          <ProtectedRoute permission="driver_settlement:manage">
            <DriverManagement />
          </ProtectedRoute>
        } />
        <Route path="/drivers/settlement" element={
          <ProtectedRoute permission="driver_settlement:manage">
            <DriverSettlement />
          </ProtectedRoute>
        } />
        <Route path="/auth/waiters" element={
          <ProtectedRoute permission="waiter_settlement:manage">
            <WaiterManagement />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute permission="reports:view">
            <ReportManagement />
          </ProtectedRoute>
        } />
        <Route path="/reports/*" element={
          <ProtectedRoute permission="reports:view">
            <ReportManagement />
          </ProtectedRoute>
        } /> 
        <Route path="/settings" element={
          <ProtectedRoute permission="settings:view">
            <SettingsManagement />
          </ProtectedRoute>
        } />
        <Route path="/settings/*" element={
          <ProtectedRoute permission="settings:view">
            <SettingsManagement />
          </ProtectedRoute>
        } />
        <Route path="/settings/delivery-zones" element={
          <ProtectedRoute permission="settings:manage">
            <DeliveryAreaManagement />
          </ProtectedRoute>
        } />
        <Route path="/integrations" element={
          <ProtectedRoute permission="integrations:manage">
            <IntegrationManagement />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute permission="users:manage">
            <UserAndPermissions />
          </ProtectedRoute>
        } />
        <Route path="/pos" element={
          <ProtectedRoute permission="pos:access">
            <PosPage />
          </ProtectedRoute>
        } />
        <Route path="/cashier" element={
          <ProtectedRoute permission="cashier:manage">
            <CashierManagement />
          </ProtectedRoute>
        } />
        <Route path="/kds" element={
          <ProtectedRoute permission="kds:view">
            <KdsPage />
          </ProtectedRoute>
        } />
        <Route path="/financial" element={
          <ProtectedRoute permission="financial:view">
            <FinancialManagement />
          </ProtectedRoute>
        } />
        <Route path="/financial/*" element={
          <ProtectedRoute permission="financial:view">
            <FinancialManagement />
          </ProtectedRoute>
        } />
        <Route path="/payment-methods" element={
          <ProtectedRoute permission="financial:manage">
            <PaymentMethodManagement 
              onAddClick={() => setPaymentMethodModalOpen(true)}
              onEditClick={handleEditPaymentMethodClick}
              refetchTrigger={refetchPaymentMethods}
            />
          </ProtectedRoute>
        } />
        <Route path="/stock/cmv" element={
          <ProtectedRoute permission="reports:abc">
            <CmvAnalysis />
          </ProtectedRoute>
        } />
        <Route path="/stock" element={
          <ProtectedRoute permission="stock:view">
            <StockManagement />
          </ProtectedRoute>
        } />
        <Route path="/stock/*" element={
          <ProtectedRoute permission="stock:view">
            <StockManagement />
          </ProtectedRoute>
        } />
        <Route path="/ingredients" element={<StockManagement />} />
        <Route path="/ingredients/*" element={<StockManagement />} />
        <Route path="/fiscal" element={
          <ProtectedRoute permission="settings:manage">
            <FiscalManagement />
          </ProtectedRoute>
        } />
        <Route path="/checklists" element={
          <ProtectedRoute permission="orders:view">
            <ChecklistManagement />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Modais Globais Extraídos */}
      <GlobalModals 
        isTableModalOpen={isTableModalOpen}
        closeTableModal={handleTableModalClose}
        saveTableModal={handleTableSave}
        tableToEdit={tableToEdit}

        isCategoryModalOpen={isCategoryModalOpen}
        closeCategoryModal={handleCategoryModalClose}
        saveCategoryModal={handleCategorySave}
        categoryToEdit={categoryToEdit}

        isPromotionModalOpen={isPromotionModalOpen}
        closePromotionModal={handlePromotionModalClose}
        savePromotionModal={handlePromotionSave}
        promotionToEdit={promotionToEdit}

        isOrderDetailModalOpen={isOrderDetailModalOpen}
        closeOrderDetailModal={handleOrderDetailModalClose}
        orderToView={orderToView}

        isPaymentMethodModalOpen={isPaymentMethodModalOpen}
        closePaymentMethodModal={handlePaymentMethodModalClose}
        savePaymentMethodModal={handlePaymentMethodSave}
        paymentMethodToEdit={paymentMethodToEdit}
      />
    </AdminLayout>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/waiter" element={
            <ProtectedRoute permission="waiter:pos">
              <WaiterPos />
            </ProtectedRoute>
          } />
          <Route path="/checklist/fill/:id" element={<ChecklistFill />} />
          <Route path="/driver/dashboard" element={
            <ProtectedRoute permission="delivery:manage">
              <DriverDashboard />
            </ProtectedRoute>
          } />
          <Route path="/*" element={
            <ProtectedRoute>
              <AdminRoutes />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
