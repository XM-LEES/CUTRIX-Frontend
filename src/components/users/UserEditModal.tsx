import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Button, Space } from 'antd';
import { User } from '@/types';
import { usersApi } from '@/api';
import { canManagerOperate, canModifyOwnRole, getTargetUserRole } from '@/utils/userPermissions';

const { TextArea } = Input;

interface UserEditModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentUser: User | null;
  selectedUser: User | null;
}

export default function UserEditModal({
  open,
  onCancel,
  onSuccess,
  currentUser,
  selectedUser,
}: UserEditModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedUser && open) {
      const currentRole = getTargetUserRole(selectedUser);
      form.setFieldsValue({
        name: selectedUser.name || selectedUser.Name,
        role: currentRole,
        group: selectedUser.user_group || selectedUser.UserGroup,
        note: selectedUser.note || selectedUser.Note,
      });
    }
  }, [selectedUser, open, form]);

  const handleSubmit = async (values: any) => {
    if (!selectedUser) return;

    // 检查权限
    if (!canManagerOperate(currentUser, selectedUser)) {
      message.error('没有权限编辑管理员');
      return;
    }

    // 检查是否可以修改角色
    if (!canModifyOwnRole(currentUser, selectedUser)) {
      const currentRole = getTargetUserRole(selectedUser);
      if (values.role && values.role !== currentRole) {
        message.error('不能修改自己的角色');
        return;
      }
    }

    setLoading(true);
    try {
      const userId = selectedUser.user_id || selectedUser.UserID;
      if (!userId) {
        message.error('用户ID无效');
        return;
      }

      // 更新用户资料
      await usersApi.updateProfile(userId, {
        name: values.name,
        group: values.group || undefined,
        note: values.note || undefined,
      });

      // 如果角色发生变化，更新角色
      const currentRole = getTargetUserRole(selectedUser);
      if (values.role && values.role !== currentRole && canModifyOwnRole(currentUser, selectedUser)) {
        await usersApi.assignRole(userId, values.role);
      }

      message.success('更新用户成功');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedUser) return null;

  const canModifyRole = canModifyOwnRole(currentUser, selectedUser);

  return (
    <Modal
      title="编辑用户资料"
      open={open}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
      width={600}
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
          name="role"
          label="角色"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select
            placeholder="选择角色"
            disabled={!canModifyRole}
          >
            <Select.Option value="admin">管理员</Select.Option>
            <Select.Option value="manager">经理</Select.Option>
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
              保存
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

