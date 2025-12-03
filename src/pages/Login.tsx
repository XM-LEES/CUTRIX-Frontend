import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LoginRequest } from '@/types';

const { Title } = Typography;

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: LoginRequest) => {
    try {
      await login(values);
      message.success('登录成功');
      navigate('/');
    } catch (error) {
      message.error((error as Error).message || '登录失败，请重试');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
          CUTRIX 系统登录
        </Title>
        <Form name="login" onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="name"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

