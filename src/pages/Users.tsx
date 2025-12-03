import { useState, useEffect } from 'react';
import { Button, Typography, Card, Table, Row, Col, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { usersApi } from '@/api';
import { User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { canManagerOperate, canDeleteSelf, canDeactivate } from '@/utils/userPermissions';
import UserCreateModal from '@/components/users/UserCreateModal';
import UserEditModal from '@/components/users/UserEditModal';
import UserPasswordModal from '@/components/users/UserPasswordModal';
import { useUserTableColumns } from '@/components/users/UserTableColumns';

const { Title } = Typography;

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (error) {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (targetUser: User) => {
    // 检查权限：manager 不能编辑 admin
    if (!canManagerOperate(currentUser, targetUser)) {
      message.error('没有权限编辑管理员');
      return;
    }
    setSelectedUser(targetUser);
    setEditModalVisible(true);
  };

  const handleSetActive = async (user: User, active: boolean) => {
    // 检查权限：manager 不能操作 admin
    if (!canManagerOperate(currentUser, user)) {
      message.error('没有权限操作管理员');
      return;
    }

    // 检查是否可以停用
    if (!canDeactivate(currentUser, user, active)) {
      message.error('不能停用自己的账户');
      return;
    }

    try {
      const userId = user.user_id || user.UserID;
      if (!userId) {
        message.error('用户ID无效');
        return;
      }
      await usersApi.setActive(userId, active);
      message.success(`${active ? '激活' : '停用'}用户成功`);
      loadUsers();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleResetPassword = (user: User) => {
    // 检查权限：manager 不能重置 admin 的密码
    if (!canManagerOperate(currentUser, user)) {
      message.error('没有权限重置管理员的密码');
      return;
    }
    setSelectedUser(user);
    setPasswordModalVisible(true);
  };

  const handleDelete = async (user: User) => {
    // 检查权限：manager 不能删除 admin
    if (!canManagerOperate(currentUser, user)) {
      message.error('没有权限删除管理员');
      return;
    }

    // 检查是否可以删除自己
    if (!canDeleteSelf(currentUser, user)) {
      message.error('不能删除自己的账户');
      return;
    }

    try {
      const userId = user.user_id || user.UserID;
      if (!userId) {
        message.error('用户ID无效');
        return;
      }
      await usersApi.delete(userId);
      message.success('删除用户成功');
      loadUsers();
    } catch (error: any) {
      message.error(error.message || '删除用户失败');
    }
  };

  const currentUser = user;

  const columns = useUserTableColumns({
    currentUser,
    onEdit: handleEdit,
    onResetPassword: handleResetPassword,
    onDelete: handleDelete,
    onSetActive: handleSetActive,
  });

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>用户管理</Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建用户
          </Button>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey={(record) => String(record.user_id || record.UserID || Math.random())}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <UserCreateModal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          loadUsers();
        }}
        currentUser={currentUser}
        existingUsers={users}
      />

      <UserEditModal
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          setEditModalVisible(false);
          setSelectedUser(null);
          loadUsers();
        }}
        currentUser={currentUser}
        selectedUser={selectedUser}
      />

      <UserPasswordModal
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          setPasswordModalVisible(false);
          setSelectedUser(null);
        }}
        currentUser={currentUser}
        selectedUser={selectedUser}
      />
    </div>
  );
}
