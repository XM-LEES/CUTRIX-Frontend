// 字段	自动/手动	是否可修改	说明
// created_at	✅ 自动	❌ 否	创建时自动设置
// updated_at	✅ 自动	❌ 否	每次更新自动更新
// order_start_date	✋ 手动	❌ 否	创建时输入，之后不可改
// order_finish_date	✋ 手动	✅ 是	创建时输入，可通过API修改

import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Descriptions,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ordersApi } from '@/api';
import { ProductionOrder, OrderItem } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 常规尺码列表（用于矩阵录入）
const REGULAR_SIZES = ['90', '100', '110', '120', '130', '140', '150', '160'];

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 兼容大小写字段名
  const userRole = (user?.role || user?.Role) as any;
  const canCreate = hasPermission(userRole, 'order:create');
  const canUpdate = hasPermission(userRole, 'order:update');
  const canDelete = hasPermission(userRole, 'order:delete');

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

  const handleCreate = async (values: any) => {
    try {
      // 从矩阵中提取有效数据
      const matrixItems = (values.matrix || [])
        .flatMap((row: { color: string; sizes: Record<string, number> }) => {
          if (!row || !row.color) return [];
          return Object.entries(row.sizes || {})
            .filter(([, quantity]) => quantity && quantity > 0)
            .map(([size, quantity]) => ({
              color: row.color,
              size,
              quantity: Number(quantity),
            }));
        });

      // 合并特殊尺码
      const specialItems = (values.special_items || [])
        .filter((item: any) => item && item.color && item.size && item.quantity > 0)
        .map((item: any) => ({
          color: item.color,
          size: item.size,
          quantity: Number(item.quantity),
        }));

      // 组合所有明细
      const allItems = [...matrixItems, ...specialItems];

      if (allItems.length === 0) {
        message.error('请至少输入一个有效的订单明细项');
        return;
      }

      const request = {
        order_number: values.order_number,
        style_number: values.style_number,
        customer_name: values.customer_name || undefined,
        order_start_date: values.order_start_date ? values.order_start_date.format('YYYY-MM-DD') : undefined,
        order_finish_date: values.order_finish_date ? values.order_finish_date.format('YYYY-MM-DD') : undefined,
        note: values.note || undefined,
        items: allItems,
      };
      
      await ordersApi.create(request);
      message.success('创建订单成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadOrders();
    } catch (error: any) {
      message.error(error.message || '创建订单失败');
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
    editForm.setFieldsValue({ note: order.note });
    setEditModalVisible(true);
  };

  const handleUpdateNote = async (values: any) => {
    if (!selectedOrder) return;
    try {
      await ordersApi.updateNote(selectedOrder.order_id, values.note || null);
      message.success('更新备注成功');
      setEditModalVisible(false);
      loadOrders();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
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

  const columns: ColumnsType<ProductionOrder> = [
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
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {canUpdate && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditNote(record)}
            >
              编辑备注
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title="确定要删除这个订单吗？"
              onConfirm={() => handleDelete(record)}
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

      {/* 创建订单模态框 */}
      <Modal
        title="创建订单"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={1100}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="order_number"
            label="订单号"
            rules={[{ required: true, message: '请输入订单号' }]}
          >
            <Input placeholder="例如：ORD-20250101-001" />
          </Form.Item>
          <Form.Item
            name="style_number"
            label="款号"
            rules={[{ required: true, message: '请输入款号' }]}
          >
            <Input placeholder="款号" />
          </Form.Item>
          <Form.Item name="customer_name" label="客户名称">
            <Input placeholder="客户名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="order_start_date" 
                label="下单日期"
                tooltip="客户下单的日期（业务时间）"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="order_finish_date" 
                label="完成日期"
                tooltip="订单计划完成的日期（业务时间）"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="备注">
            <TextArea rows={3} placeholder="备注信息" />
          </Form.Item>

          <Divider orientation="left">常规尺码批量录入</Divider>
          <Form.List name="matrix" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                <Row gutter={8} style={{ marginBottom: 8, color: 'gray' }}>
                  <Col span={4}><Text strong>颜色</Text></Col>
                  {REGULAR_SIZES.map(size => (
                    <Col span={2} key={size} style={{ textAlign: 'center' }}>
                      <Text strong>{size}</Text>
                    </Col>
                  ))}
                  <Col span={2}></Col>
                </Row>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'color']}
                        rules={[{ required: true, message: '输入颜色' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="颜色" />
                      </Form.Item>
                    </Col>
                    {REGULAR_SIZES.map(size => (
                      <Col span={2} key={size}>
                        <Form.Item
                          {...restField}
                          name={[name, 'sizes', size]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                        </Form.Item>
                      </Col>
                    ))}
                    <Col span={2}>
                      {fields.length > 1 && (
                        <Popconfirm title="确认删除此行?" onConfirm={() => remove(name)}>
                          <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      )}
                    </Col>
                  </Row>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginBottom: 16 }}
                >
                  添加颜色行
                </Button>
              </>
            )}
          </Form.List>

          <Divider orientation="left" style={{ marginTop: 24 }}>添加特殊尺码（可选）</Divider>
          <Form.List name="special_items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'color']}
                      rules={[{ required: true, message: '颜色' }]}
                    >
                      <Input placeholder="颜色" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'size']}
                      rules={[{ required: true, message: '尺码' }]}
                    >
                      <Input placeholder="特殊尺码" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      rules={[{ required: true, message: '数量' }]}
                    >
                      <InputNumber min={1} placeholder="数量" />
                    </Form.Item>
                    <DeleteOutlined onClick={() => remove(name)} style={{ cursor: 'pointer', color: '#ff4d4f' }} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  添加特殊尺码明细
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false);
                createForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 订单详情模态框 */}
      <Modal
        title="订单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <>
            <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单号">{selectedOrder.order_number}</Descriptions.Item>
              <Descriptions.Item label="款号">{selectedOrder.style_number}</Descriptions.Item>
              <Descriptions.Item label="客户名称">
                {selectedOrder.customer_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="下单日期">
                {selectedOrder.order_start_date ? dayjs(selectedOrder.order_start_date).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="完成日期">
                {selectedOrder.order_finish_date ? dayjs(selectedOrder.order_finish_date).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {selectedOrder.note || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Divider orientation="left">系统信息</Divider>
            <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="录入时间">
                {dayjs(selectedOrder.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新时间">
                {dayjs(selectedOrder.updated_at || selectedOrder.created_at).format('YYYY-MM-DD HH:mm')}
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
          </>
        )}
      </Modal>

      {/* 编辑备注模态框 */}
      <Modal
        title="编辑备注"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateNote}
        >
          <Form.Item name="note" label="备注">
            <TextArea rows={4} placeholder="备注信息" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
