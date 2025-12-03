import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { hasRole } from '@/utils/permissions';

interface RequireRolesProps {
  children: ReactNode;
  roles: UserRole[];
  fallback?: ReactNode;
}

/**
 * 路由守卫：要求用户具有指定角色
 */
export function RequireRoles({ children, roles, fallback }: RequireRolesProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 兼容大小写字段名
  const userRole = (user.role || user.Role) as UserRole | null;
  
  if (!userRole || !hasRole(userRole, roles)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

