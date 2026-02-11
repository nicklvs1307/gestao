import { useAuth } from '../context/AuthContext';

/**
 * Hook para verificar permissões programaticamente.
 * Útil para validações dentro de funções (ex: onClick).
 */
export const usePermission = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string | string[], operator: 'AND' | 'OR' = 'OR'): boolean => {
    if (!user) return false;

    // SuperAdmin tem acesso total
    if (user.isSuperAdmin || user.permissions.includes('all:manage')) {
      return true;
    }

    const permissionsToCheck = Array.isArray(permission) ? permission : [permission];
    const userPermissions = user.permissions || [];

    return operator === 'OR' 
      ? permissionsToCheck.some(p => userPermissions.includes(p))
      : permissionsToCheck.every(p => userPermissions.includes(p));
  };

  return { hasPermission };
};
