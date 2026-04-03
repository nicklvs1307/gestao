import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModules } from '../hooks/useModules';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  module?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission, module }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const { hasModule } = useModules();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (module && !user.isSuperAdmin && !hasModule(module)) {
        toast.error(`Módulo não disponível neste restaurante.`);
      } else if (permission) {
        const hasAccess = user.isSuperAdmin ||
                          user.permissions.includes('all:manage') ||
                          user.permissions.includes(permission);
        if (!hasAccess) {
          toast.error("Acesso Negado: Você não tem permissão para acessar esta página.");
        }
      }
    }
  }, [loading, isAuthenticated, permission, module, user, hasModule]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (module && user && !user.isSuperAdmin && !hasModule(module)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permission && user) {
    const hasAccess = user.isSuperAdmin ||
                      user.permissions.includes('all:manage') ||
                      user.permissions.includes(permission);
    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
