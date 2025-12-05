import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * 路由守卫：要求用户已登录
 * 根据用户角色重定向到对应的首页
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, user, checkAuth } = useAuth();
  const location = useLocation();

  // 在 useEffect 中检查认证状态，避免在渲染过程中调用 setState
  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, checkAuth]);

  // 检查认证状态
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 如果是 worker 角色访问根路径，重定向到 worker 专属页面
  if (user) {
    const userRole = (user.role || user.Role) as string;
    
    if (userRole === 'worker' && location.pathname === '/') {
      return <Navigate to="/worker-dashboard" replace />;
    }
  }

  return <>{children}</>;
}

