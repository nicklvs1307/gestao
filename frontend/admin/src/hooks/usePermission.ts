import { useAuth } from '../context/AuthContext';

export const usePermission = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const permissions = user.permissions || [];
    if (permissions.includes('all:manage')) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return permissions.some(p => hasPermission(p));
  };

  return { hasPermission, hasAnyPermission, isSuperAdmin: user?.isSuperAdmin || false };
};
