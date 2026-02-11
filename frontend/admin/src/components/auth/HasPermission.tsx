import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface HasPermissionProps {
  permission: string | string[];
  operator?: 'AND' | 'OR';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente utilitário para renderização condicional baseada em permissões.
 * @param permission - Uma permissão única ou um array de permissões.
 * @param operator - 'AND' exige todas as permissões, 'OR' exige pelo menos uma. Padrão: 'OR'.
 * @param children - Conteúdo a ser exibido se a permissão for concedida.
 * @param fallback - Conteúdo alternativo (opcional).
 */
export const HasPermission: React.FC<HasPermissionProps> = ({ 
  permission, 
  operator = 'OR', 
  children, 
  fallback = null 
}) => {
  const { user } = useAuth();

  if (!user) return <>{fallback}</>;

  // SuperAdmin tem acesso a tudo
  if (user.isSuperAdmin || user.permissions.includes('all:manage')) {
    return <>{children}</>;
  }

  const permissionsToCheck = Array.isArray(permission) ? permission : [permission];
  const userPermissions = user.permissions || [];

  const hasAccess = operator === 'OR' 
    ? permissionsToCheck.some(p => userPermissions.includes(p))
    : permissionsToCheck.every(p => userPermissions.includes(p));

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default HasPermission;
