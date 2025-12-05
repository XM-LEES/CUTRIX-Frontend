import { Button, Space, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ProductionOrder } from '@/types';
import { hasPermission } from '@/utils/permissions';
import dayjs from 'dayjs';

interface UseOrderTableColumnsProps {
  userRole: any;
  onViewDetail: (order: ProductionOrder) => void;
  onEditNote: (order: ProductionOrder) => void;
  onDelete: (order: ProductionOrder) => void;
}

export function useOrderTableColumns({
  userRole,
  onViewDetail,
  onEditNote,
  onDelete,
}: UseOrderTableColumnsProps): ColumnsType<ProductionOrder> {
  const canUpdate = hasPermission(userRole, 'order:update');
  const canDelete = hasPermission(userRole, 'order:delete');

  return [
    {
      title: '订单号',
      dataIndex: 'order_number',
      key: 'order_number',
    },
    {
      title: '款号',
      dataIndex: 'style_number',
      key: 'style_number',
    },
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text) => text || '-',
    },
    {
      title: (
        <Tooltip title="客户下单的日期（业务时间）">
          <span>下单日期</span>
        </Tooltip>
      ),
      dataIndex: 'order_start_date',
      key: 'order_start_date',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
    },
    {
      title: (
        <Tooltip title="订单完成的日期（业务时间）">
          <span>完成日期</span>
        </Tooltip>
      ),
      dataIndex: 'order_finish_date',
      key: 'order_finish_date',
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
          {canUpdate && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => onEditNote(record)}
            >
              编辑备注
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title="确定要删除这个订单吗？"
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

