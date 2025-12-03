import { Layout, Typography, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

export default function Header() {
  const { user } = useAuth();

  return (
    <AntHeader
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div>
        <Text strong style={{ fontSize: '18px' }}>
          裁剪车间管理系统
        </Text>
      </div>
      {user && (
        <Space>
          <UserOutlined />
          <Text>{user.name || user.Name || '未知用户'}</Text>
          <Text type="secondary">({user.role || user.Role || '未知'})</Text>
        </Space>
      )}
    </AntHeader>
  );
}

