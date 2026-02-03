import { Routes, Route } from 'react-router-dom';
import TableMenuWrapper from './pages/TableMenuWrapper';
import DeliveryPage from './pages/DeliveryPage';
import OrderTracking from './pages/OrderTracking'; // Importar nova página

function App() {
  return (
    <Routes>
      <Route path="/cardapio/:restaurantId/:tableNumber" element={<TableMenuWrapper />} />
      <Route path="/order-status/:orderId" element={<OrderTracking />} />
      <Route path="/:slug" element={<DeliveryPage />} />
      <Route path="*" element={<div>404 - Cardápio não encontrado</div>} />
    </Routes>
  );
}

export default App;