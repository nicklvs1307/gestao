import { Routes, Route } from 'react-router-dom';
import TableMenuWrapper from './pages/TableMenuWrapper';
import DeliveryPage from './pages/DeliveryPage';
import OrderTracking from './pages/OrderTracking';
import TenantHandler from './pages/TenantHandler';

function App() {
  return (
    <Routes>
      {/* Rotas Genéricas/Admin */}
      <Route path="/order-status/:orderId" element={<OrderTracking />} />
      <Route path="/cardapio/:restaurantId/:tableNumber" element={<TableMenuWrapper />} />
      
      {/* Roteamento Multi-Tenant (Via Subdomínio) */}
      <Route path="/mesa/:tableNumber" element={<TenantHandler />} />
      <Route path="/" element={<TenantHandler />} />

      {/* Fallback para URLs antigas ou slugs diretos */}
      <Route path="/:slug" element={<DeliveryPage />} />
      
      <Route path="*" element={<div>404 - Cardápio não encontrado</div>} />
    </Routes>
  );
}

export default App;