import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PrivateRoute from '../components/common/PrivateRoute';
import { useAuth } from '../hooks/useAuth';

const Loading = () => (
  <div className="flex h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

// Lazy load pages
const TableMenuWrapper = lazy(() => import('../pages/TableMenuWrapper'));
const DeliveryPage = lazy(() => import('../pages/DeliveryPage'));
const OrderTracking = lazy(() => import('../pages/OrderTracking'));
const TenantHandler = lazy(() => import('../pages/TenantHandler'));

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  // Don't show routes while checking auth
  if (authLoading) {
    return <Loading />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public routes */}
        <Route path="/order-status/:orderId" element={<OrderTracking />} />
        <Route path="/cardapio/:restaurantId/:tableNumber" element={<TableMenuWrapper />} />
        
        {/* Multi-tenant routes (via subdomain simulation) */}
        <Route path="/mesa/:tableNumber" element={<TenantHandler />} />
        <Route path="/" element={<TenantHandler />} />

        {/* Fallback for old URLs or direct slugs */}
        <Route path="/:slug" element={<DeliveryPage />} />

        {/* Catch-all for 404s */}
        <Route path="*" element={<div>404 - Cardápio não encontrado</div>} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;