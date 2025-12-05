// 字段	自动/手动	是否可修改	说明
// created_at	✅ 自动	❌ 否	创建时自动设置
// updated_at	✅ 自动	❌ 否	每次更新自动更新
// order_start_date	✋ 手动	❌ 否	创建时输入，之后不可改
// order_finish_date	✋ 手动	✅ 是	创建时输入，可通过API修改

import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Typography,
  Card,
  message,
  Row,
  Col,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ordersApi } from '@/api';
import { ProductionOrder, OrderItem } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';
import {
  OrderCreateModal,
  OrderDetailModal,
  OrderNoteModal,
  useOrderTableColumns,
} from '@/components/orders';

const { Title } = Typography;

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // 兼容大小写字段名
  const userRole = (user?.role || user?.Role) as any;
  const canCreate = hasPermission(userRole, 'order:create');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await ordersApi.list();
      setOrders(data);
    } catch (error) {
      message.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };


  const handleViewDetail = async (order: ProductionOrder) => {
    try {
      const full = await ordersApi.getFull(order.order_id);
      setSelectedOrder(full.order);
      setOrderItems(full.items);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('加载订单详情失败');
    }
  };

  const handleEditNote = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setEditModalVisible(true);
  };

  const handleNoteSuccess = () => {
    setEditModalVisible(false);
    setSelectedOrder(null);
    loadOrders();
  };

  const handleDelete = async (order: ProductionOrder) => {
    try {
      await ordersApi.delete(order.order_id);
      message.success('删除订单成功');
      loadOrders();
    } catch (error: any) {
      message.error(error.message || '删除订单失败');
    }
  };

  const columns = useOrderTableColumns({
    userRole,
    onViewDetail: handleViewDetail,
    onEditNote: handleEditNote,
    onDelete: handleDelete,
  });

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
      <Title level={2}>生产订单</Title>
        </Col>
        <Col>
          {canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建订单
            </Button>
          )}
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          loading={loading}
          rowKey="order_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <OrderCreateModal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          loadOrders();
        }}
      />

      <OrderDetailModal
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        order={selectedOrder}
        orderItems={orderItems}
      />

      <OrderNoteModal
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedOrder(null);
        }}
        onSuccess={handleNoteSuccess}
        order={selectedOrder}
      />
    </div>
  );
}
