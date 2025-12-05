import { Layout } from 'antd';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/hooks/useAuth';

const { Content } = Layout;

/**
 * 主布局组件
 * 禁止 worker 角色访问，worker 应该使用 WorkerDashboard
 */
export default function MainLayout() {
  const { user } = useAuth();

  // 如果是 worker 角色，禁止访问后台管理系统，重定向到工作台
  if (user) {
    const userRole = (user.role || user.Role) as string;
    if (userRole === 'worker') {
      return <Navigate to="/worker-dashboard" replace />;
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header />
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

