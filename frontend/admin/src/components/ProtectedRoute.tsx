import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string; // Nova propriedade opcional
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission }) => {
  const { isAuthenticated, loading, user } = useAuth();

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

  // Se uma permissão específica foi exigida, verificamos:
  if (permission && user) {
    const hasAccess = user.isSuperAdmin || 
                      user.permissions.includes('all:manage') || 
                      user.permissions.includes(permission);

    if (!hasAccess) {
      // Opcional: Avisar o usuário que ele não tem acesso
      toast.error("Acesso Negado: Você não tem permissão para acessar esta página.");
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
