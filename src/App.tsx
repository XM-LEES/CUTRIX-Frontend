import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth, RequireRoles, RequirePermission } from '@/components/guards';
import MainLayout from '@/components/layout/MainLayout';
import LoginPage from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import OrdersPage from '@/pages/Orders';
import PlansPage from '@/pages/Plans';
import TasksPage from '@/pages/Tasks';
import LogsPage from '@/pages/Logs';
import UsersPage from '@/pages/Users';
import WorkerDashboard from '@/pages/WorkerDashboard';
import TaskOperation from '@/pages/TaskOperation';
import PlanCreate from '@/pages/PlanCreate';

function App() {
  const { checkAuth, isAuthenticated } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />

          {/* Worker 专属路由（无侧边栏布局） */}
          <Route
            path="/worker-dashboard"
            element={
              <RequireAuth>
                <RequireRoles roles={['worker']}>
                  <WorkerDashboard />
                </RequireRoles>
              </RequireAuth>
            }
          />
          <Route
            path="/task-operation/:planId"
            element={
              <RequireAuth>
                <RequireRoles roles={['worker']}>
                  <TaskOperation />
                </RequireRoles>
              </RequireAuth>
            }
          />

          {/* 受保护的路由 - 使用 Outlet 模式 */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            }
          >
                    <Route index element={<Dashboard />} />
                    <Route
                      path="orders"
                      element={
                        <RequirePermission permission="order:read">
                          <OrdersPage />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="plans"
                      element={
                        <RequirePermission permission="plan:read">
                          <PlansPage />
                        </RequirePermission>
                      }
                    />
            <Route
              path="plans/create"
              element={
                <RequirePermission permission="plan:create">
                  <PlanCreate />
                </RequirePermission>
              }
            />
                    <Route
                      path="tasks"
                      element={
                        <RequirePermission permission="task:read">
                          <TasksPage />
                        </RequirePermission>
                      }
                    />
            <Route
              path="logs"
              element={
                <RequirePermission permission="log:create">
                  <RequireRoles roles={['admin', 'manager', 'pattern_maker']}>
                    <LogsPage />
                  </RequireRoles>
                </RequirePermission>
              }
            />
                    <Route
                      path="users"
                      element={
                        <RequireRoles roles={['admin', 'manager']}>
                          <UsersPage />
                        </RequireRoles>
                      }
                    />
          </Route>

          {/* 默认重定向 */}
          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;

