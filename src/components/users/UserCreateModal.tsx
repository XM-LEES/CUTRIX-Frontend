import { useState } from 'react';
import { Modal, Form, Input, Select, message, Button, Space } from 'antd';
import { User, UserRole } from '@/types';
import { usersApi } from '@/api';
import { canCreateRole } from '@/utils/userPermissions';

const { TextArea } = Input;

interface UserCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentUser: User | null;
  existingUsers: User[];
}

export default function UserCreateModal({
  open,
  onCancel,
  onSuccess,
  currentUser,
  existingUsers,
}: UserCreateModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    // 检查密码
    if (!values.password || values.password.length < 6) {
      message.error('密码是必填项，且长度至少6位');
      return;
    }

    // 检查权限
    const permissionCheck = canCreateRole(currentUser, values.role, existingUsers);
    if (!permissionCheck.allowed) {
      message.error(permissionCheck.reason || '没有权限创建此角色');
      return;
    }

    setLoading(true);
    try {
      // 创建用户
      const newUser = await usersApi.create({
        name: values.name,
        role: values.role,
        group: values.group || undefined,
        note: values.note || undefined,
      });

      // 设置密码
      const userId = newUser.user_id || newUser.UserID;
      if (userId) {
        await usersApi.setPassword(userId, values.password);
      }

      message.success('创建用户成功');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '创建用户失败');
    } finally {
      setLoading(false);
    }
  };

  const currentUserRole = (currentUser?.role || currentUser?.Role) as UserRole;
  const hasAdmin = existingUsers.some(u => {
    const role = (u.role || u.Role) as UserRole;
    return role === 'admin';
  });
  const hasManager = existingUsers.some(u => {
    const role = (u.role || u.Role) as UserRole;
    return role === 'manager';
  });

  return (
    <Modal
      title="创建用户"
      open={open}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input placeholder="姓名" />
        </Form.Item>
        <Form.Item
          name="password"
          label="初始密码"
          rules={[
            { required: true, message: '创建新用户时必须设置初始密码' },
            { min: 6, message: '密码长度至少6位' },
          ]}
        >
          <Input.Password placeholder="请输入至少6位初始密码" />
        </Form.Item>
        <Form.Item
          name="role"
          label="角色"
          rules={[{ required: true, message: '请选择角色' }]}
          initialValue="worker"
        >
          <Select placeholder="选择角色">
            {currentUserRole === 'admin' && !hasAdmin && (
              <Select.Option value="admin">管理员</Select.Option>
            )}
            {currentUserRole === 'admin' && !hasManager && (
              <Select.Option value="manager">经理</Select.Option>
            )}
            <Select.Option value="pattern_maker">版师</Select.Option>
            <Select.Option value="worker">工人</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="group" label="分组">
          <Input placeholder="分组（可选）" />
        </Form.Item>
        <Form.Item name="note" label="备注">
          <TextArea rows={3} placeholder="备注信息（可选）" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              创建
            </Button>
            <Button onClick={() => {
              onCancel();
              form.resetFields();
            }}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

