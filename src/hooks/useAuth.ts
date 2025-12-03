import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { hasRole, hasPermission, Permission } from '@/utils/permissions';

/**
 * 认证相关 Hook
 */
export function useAuth() {
  const { isAuthenticated, user, login, logout, checkAuth, loading, error } = useAuthStore();

  // 兼容大小写字段名
  const userRole = (user?.role || user?.Role) as UserRole | null;

  return {
    isAuthenticated,
    user,
    login,
    logout,
    checkAuth,
    loading,
    error,
    // 便捷方法
    isAdmin: hasRole(userRole, ['admin', 'manager']),
    isWorker: hasRole(userRole, ['worker']),
    isPatternMaker: hasRole(userRole, ['pattern_maker']),
  };
}

/**
 * 权限检查 Hook
 */
export function usePermissions() {
  const { user } = useAuthStore();
  const userRole = user?.role || null;

  return {
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: Permission[]) => 
      permissions.some(p => hasPermission(userRole, p)),
    hasAllPermissions: (permissions: Permission[]) => 
      permissions.every(p => hasPermission(userRole, p)),
    hasRole: (roles: UserRole[]) => hasRole(userRole, roles),
  };
}

