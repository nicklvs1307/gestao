import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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
import UserManagement from './components/UserManagement';
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
import { Toaster } from 'sonner';

import GlobalModals from './components/GlobalModals';

// Componente Wrapper para injetar o layout
const AdminRoutes: React.FC = () => {
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
        <Route path="/products" element={<ProductManagement 
          onAddProductClick={() => {}} // Will be handled by internal navigation in ProductManagement
          onEditProductClick={() => {}} // Will be handled by internal navigation
          refetchTrigger={0}
        />} />
        <Route path="/addons" element={<AddonManagement />} />
        <Route path="/ingredients" element={<StockManagement />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id" element={<ProductFormPage />} />
        <Route path="/categories" element={<CategoryManagement 
          onAddCategoryClick={() => setCategoryModalOpen(true)}
          onEditCategoryClick={handleEditCategoryClick}
          refetchTrigger={refetchCategories}
        />} />
        <Route path="/promotions" element={<PromotionManagement 
          onAddPromotionClick={() => setPromotionModalOpen(true)}
          onEditPromotionClick={handleEditPromotionClick}
          refetchTrigger={refetchPromotions}
        />} />
        <Route path="/coupons" element={<PromotionManagement 
          onAddPromotionClick={() => setPromotionModalOpen(true)}
          onEditPromotionClick={handleEditPromotionClick}
          refetchTrigger={refetchPromotions}
        />} />
        <Route path="/customers" element={<CustomerManagement />} />
        <Route path="/orders" element={<OrderManagement />} />
        <Route path="/tables" element={<TableManagement 
          onAddTableClick={() => setTableModalOpen(true)} 
          onEditTableClick={handleEditTableClick}
          refetchTrigger={refetchTables}
        />} />
        <Route path="/drivers" element={<DriverManagement />} />
        <Route path="/drivers/settlement" element={<DriverSettlement />} />
        <Route path="/auth/waiters" element={<WaiterManagement />} />
        <Route path="/reports" element={<ReportManagement />} />
        <Route path="/reports/*" element={<ReportManagement />} /> 
        <Route path="/settings" element={<SettingsManagement />} />
        <Route path="/settings/*" element={<SettingsManagement />} />
        <Route path="/settings/delivery-zones" element={<DeliveryAreaManagement />} />
        <Route path="/integrations" element={<IntegrationManagement />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/waiter" element={<WaiterPos />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/cashier" element={<CashierManagement />} />
        <Route path="/kds" element={<KdsPage />} />
        <Route path="/financial" element={<FinancialManagement />} />
        <Route path="/financial/*" element={<FinancialManagement />} />
        <Route path="/payment-methods" element={<PaymentMethodManagement 
          onAddClick={() => setPaymentMethodModalOpen(true)}
          onEditClick={handleEditPaymentMethodClick}
          refetchTrigger={refetchPaymentMethods}
        />} />
        <Route path="/stock" element={<StockManagement />} />
        <Route path="/stock/*" element={<StockManagement />} />
        <Route path="/ingredients" element={<StockManagement />} />
        <Route path="/ingredients/*" element={<StockManagement />} />
        <Route path="/fiscal" element={<FiscalManagement />} />
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
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/driver/dashboard" element={
              <ProtectedRoute>
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
    </ThemeProvider>
  );
}

export default App;
