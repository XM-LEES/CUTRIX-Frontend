import { useNavigate } from 'react-router-dom';
import { Button, Space, Popconfirm } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  StopOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ProductionPlan } from '@/types';
import { hasPermission } from '@/utils/permissions';
import { PlanStatusTag } from './PlanStatusTag';
import dayjs from 'dayjs';

interface UsePlanTableColumnsProps {
  userRole: any;
  onViewDetail: (plan: ProductionPlan) => void;
  onPublish: (plan: ProductionPlan) => void;
  onFreeze: (plan: ProductionPlan) => void;
  onDelete: (plan: ProductionPlan) => void;
  onEditNote: (plan: ProductionPlan) => void;
}

export function usePlanTableColumns({
  userRole,
  onViewDetail,
  onPublish,
  onFreeze,
  onDelete,
  onEditNote,
}: UsePlanTableColumnsProps): ColumnsType<ProductionPlan> {
  const navigate = useNavigate();
  const canPublish = hasPermission(userRole, 'plan:publish');
  const canFreeze = hasPermission(userRole, 'plan:freeze');
  const canDelete = hasPermission(userRole, 'plan:delete');
  const canUpdate = hasPermission(userRole, 'plan:update');
  const isPatternMaker = userRole === 'pattern_maker';

  return [
    {
      title: '计划名称',
      dataIndex: 'plan_name',
      key: 'plan_name',
    },
    {
      title: '订单ID',
      dataIndex: 'order_id',
      key: 'order_id',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <PlanStatusTag status={status} />,
    },
    {
      title: '计划发布时间',
      dataIndex: 'planned_publish_date',
      key: 'planned_publish_date',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '计划完成日期',
      dataIndex: 'planned_finish_date',
      key: 'planned_finish_date',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail(record)}
          >
            详情
          </Button>
          {canUpdate && record.status === 'pending' && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/plans/create?planId=${record.plan_id}`)}
            >
              编辑
            </Button>
          )}
          {canPublish && record.status === 'pending' && (
            <Popconfirm
              title="确定要发布这个计划吗？"
              onConfirm={() => onPublish(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<PlayCircleOutlined />}>
                发布
              </Button>
            </Popconfirm>
          )}
          {/* pattern_maker 不能修改已发布计划的备注，其他角色可以 */}
          {canUpdate && (record.status === 'in_progress' || record.status === 'completed') && !isPatternMaker && (
            <Button
              type="link"
              icon={<FileTextOutlined />}
              onClick={() => onEditNote(record)}
            >
              修改备注
            </Button>
          )}
          {canFreeze && record.status === 'completed' && (
            <Popconfirm
              title="确定要冻结这个计划吗？"
              onConfirm={() => onFreeze(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<StopOutlined />}>
                冻结
              </Button>
            </Popconfirm>
          )}
          {/* pattern_maker 只能删除未发布的计划，其他角色可以删除所有计划 */}
          {canDelete && (isPatternMaker ? record.status === 'pending' : true) && (
            <Popconfirm
              title="确定要删除这个计划吗？"
              onConfirm={() => onDelete(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];
}

