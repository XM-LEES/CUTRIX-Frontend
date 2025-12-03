import { Typography, Switch, Button, Space, Tag, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { User, UserRole } from '@/types';
import {
  canManagerOperate,
  canModifyOwnStatus,
  canDeleteSelf,
  getTargetUserRole,
} from '@/utils/userPermissions';

const { Text } = Typography;

interface UseTableColumnsProps {
  currentUser: User | null;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDelete: (user: User) => void;
  onSetActive: (user: User, active: boolean) => void;
}

const roleMap: Record<UserRole, { color: string; text: string }> = {
  admin: { color: 'red', text: '管理员' },
  manager: { color: 'orange', text: '经理' },
  pattern_maker: { color: 'blue', text: '版师' },
  worker: { color: 'green', text: '工人' },
};

const getRoleTag = (role: UserRole) => {
  const config = roleMap[role];
  if (!config) {
    return <Tag>{role || '未知'}</Tag>;
  }
  return <Tag color={config.color}>{config.text}</Tag>;
};

export function useUserTableColumns({
  currentUser,
  onEdit,
  onResetPassword,
  onDelete,
  onSetActive,
}: UseTableColumnsProps): ColumnsType<User> {
  return [
    {
      title: '用户ID',
      key: 'user_id',
      width: 100,
      render: (_: any, record: User) => record.user_id || record.UserID || '-',
    },
    {
      title: '姓名',
      key: 'name',
      render: (_: any, record: User) => record.name || record.Name || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (_: any, record: User) => {
        const actualRole = getTargetUserRole(record);
        if (!actualRole) return <Tag>未知</Tag>;
        return getRoleTag(actualRole);
      },
    },
    {
      title: '分组',
      key: 'user_group',
      render: (_: any, record: User) => record.user_group || record.UserGroup || '-',
    },
    {
      title: '状态',
      key: 'is_active',
      render: (_: any, record: User) => {
        const isActive =
          record.is_active !== undefined
            ? record.is_active
            : record.IsActive !== undefined
            ? record.IsActive
            : true;

        // manager 不能操作 admin
        if (!canManagerOperate(currentUser, record)) {
          return <Tag color={isActive ? 'green' : 'red'}>{isActive ? '在职' : '离职'}</Tag>;
        }

        // 检查是否可以修改状态
        const canModify = canModifyOwnStatus(currentUser, record);

        return (
          <Switch
            checked={isActive !== false}
            onChange={(checked) => onSetActive(record, checked)}
            disabled={!canModify}
          />
        );
      },
    },
    {
      title: '备注',
      key: 'note',
      width: 150,
      render: (_: any, record: User) => {
        const note = record.note || record.Note;
        return note ? (
          <Text ellipsis={{ tooltip: note }} style={{ maxWidth: 150 }}>
            {note}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right' as const,
      render: (_, record) => {
        // manager 不能对 admin 做任何操作
        if (!canManagerOperate(currentUser, record)) {
          return <Text type="secondary">无权限</Text>;
        }

        const canDelete = canDeleteSelf(currentUser, record);

        return (
          <Space>
            <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)}>
              编辑资料
            </Button>
            <Button
              type="link"
              icon={<KeyOutlined />}
              onClick={() => onResetPassword(record)}
            >
              重置密码
            </Button>
            <Popconfirm
              title="确定要删除这个用户吗？"
              description={`删除用户 "${record.name || record.Name}" 后，此操作不可撤销。`}
              onConfirm={() => onDelete(record)}
              okText="确定"
              cancelText="取消"
              okType="danger"
              disabled={!canDelete}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                disabled={!canDelete}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];
}

