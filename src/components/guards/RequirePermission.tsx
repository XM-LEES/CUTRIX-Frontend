import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Permission, UserRole } from '@/types';
import { hasPermission } from '@/utils/permissions';

interface RequirePermissionProps {
  children: ReactNode;
  permission: Permission;
  fallback?: ReactNode;
}

/**
 * 路由守卫：要求用户具有指定权限
 */
export function RequirePermission({ children, permission, fallback }: RequirePermissionProps) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 兼容大小写格式
  const userRole = (user.role || user.Role) as UserRole | null;

  if (!hasPermission(userRole, permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

