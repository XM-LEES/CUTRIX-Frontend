import { Modal, Descriptions, Divider, Table, Typography } from 'antd';
import { ProductionOrder, OrderItem } from '@/types';
import dayjs from 'dayjs';

const { Title } = Typography;

interface OrderDetailModalProps {
  open: boolean;
  onCancel: () => void;
  order: ProductionOrder | null;
  orderItems: OrderItem[];
}

export default function OrderDetailModal({
  open,
  onCancel,
  order,
  orderItems,
}: OrderDetailModalProps) {
  if (!order) return null;

  return (
    <Modal
      title="订单详情"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="订单号">{order.order_number}</Descriptions.Item>
        <Descriptions.Item label="款号">{order.style_number}</Descriptions.Item>
        <Descriptions.Item label="客户名称">
          {order.customer_name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="下单日期">
          {order.order_start_date ? dayjs(order.order_start_date).format('YYYY-MM-DD') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="完成日期">
          {order.order_finish_date ? dayjs(order.order_finish_date).format('YYYY-MM-DD') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {order.note || '-'}
        </Descriptions.Item>
      </Descriptions>
      <Divider orientation="left">系统信息</Divider>
      <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="录入时间">
          {dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="最后更新时间">
          {dayjs(order.updated_at || order.created_at).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
      </Descriptions>
      <Title level={5}>订单明细</Title>
      <Table
        dataSource={orderItems}
        rowKey="item_id"
        pagination={false}
        columns={[
          { title: '颜色', dataIndex: 'color', key: 'color' },
          { title: '尺码', dataIndex: 'size', key: 'size' },
          { title: '数量', dataIndex: 'quantity', key: 'quantity' },
        ]}
      />
    </Modal>
  );
}

