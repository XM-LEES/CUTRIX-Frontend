import { useState } from 'react';
import { Modal, Form, Input, message, Button, Space } from 'antd';
import { User } from '@/types';
import { usersApi } from '@/api';
import { canManagerOperate } from '@/utils/userPermissions';

interface UserPasswordModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentUser: User | null;
  selectedUser: User | null;
}

export default function UserPasswordModal({
  open,
  onCancel,
  onSuccess,
  currentUser,
  selectedUser,
}: UserPasswordModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    if (!selectedUser) return;

    // 检查权限
    if (!canManagerOperate(currentUser, selectedUser)) {
      message.error('没有权限重置管理员的密码');
      return;
    }

    setLoading(true);
    try {
      const userId = selectedUser.user_id || selectedUser.UserID;
      if (!userId) {
        message.error('用户ID无效');
        return;
      }
      await usersApi.setPassword(userId, values.new_password);
      message.success('重置密码成功');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '重置密码失败');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedUser) return null;

  return (
    <Modal
      title={`为 "${selectedUser.name || selectedUser.Name}" 重置密码`}
      open={open}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="new_password"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度至少6位' },
          ]}
        >
          <Input.Password placeholder="新密码" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              重置
            </Button>
            <Button
              onClick={() => {
                onCancel();
                form.resetFields();
              }}
            >
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

