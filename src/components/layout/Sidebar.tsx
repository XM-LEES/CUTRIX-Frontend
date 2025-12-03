import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  BlockOutlined,
  TeamOutlined,
  LogoutOutlined,
  FileAddOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';

const { Sider } = Layout;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  // 兼容大小写字段名
  const userRole = (user.role || user.Role) as any;

  // 根据权限动态生成菜单
  // 仪表板对所有已登录用户可见
  // 基础菜单（订单、任务、日志）对所有已登录用户可见
  // 高级菜单（计划、用户管理）根据权限显示
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/orders',
      icon: <FileTextOutlined />,
      label: '生产订单',
      // 订单菜单：所有已登录用户可见（worker 有 order:read 权限）
    },
    {
      key: '/plans',
      icon: <UnorderedListOutlined />,
      label: '生产计划',
      // 计划菜单：pattern_maker, admin, manager 可见
      hidden: !hasPermission(userRole, 'plan:read'),
    },
    {
      key: '/tasks',
      icon: <BlockOutlined />,
      label: '任务管理',
      // 任务菜单：所有已登录用户可见（worker 有 task:read 权限）
    },
    {
      key: '/logs',
      icon: <FileAddOutlined />,
      label: '日志记录',
      // 日志菜单：所有已登录用户可见（worker 有 log:create 权限）
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: '用户管理',
      // 用户管理：仅 admin 和 manager 可见
      hidden: !hasPermission(userRole, 'user:read'),
    },
  ].filter(item => !item.hidden);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else {
      navigate(key);
    }
  };

  return (
    <Sider width={256} theme="dark">
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          borderBottom: '1px solid #434343',
        }}
      >
        CUTRIX 管理系统
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        onClick={handleMenuClick}
        items={[
          ...menuItems,
          { type: 'divider' },
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            danger: true,
          },
        ]}
      />
    </Sider>
  );
}

