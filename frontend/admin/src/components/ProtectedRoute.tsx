import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // Mostra um indicador de carregamento enquanto o estado de autenticação é verificado
    return <div>Carregando...</div>; // Ou um componente de spinner mais elaborado
  }

  if (!isAuthenticated) {
    // Redireciona para a página de login se não estiver autenticado após a verificação
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
