import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Form,
  message,
  Space,
  Card,
  Row,
  Col,
  Select,
  InputNumber,
  Popconfirm,
  Table,
  Empty,
  Input,
  Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, LeftOutlined } from '@ant-design/icons';
import { plansApi, ordersApi } from '@/api';
import type { ProductionOrder, OrderItem } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 汇总表格单元格组件
const SummaryCell = ({ planned, required }: { planned: number; required: number }) => {
  const diff = planned - required;
  let color = 'inherit';
  if (diff > 0) color = '#1677ff'; // 超出: 蓝色
  if (diff < 0) color = '#f5222d'; // 缺少: 红色
  if (diff === 0 && required > 0) color = '#52c41a'; // 正好: 绿色

  return (
    <Text style={{ color, fontWeight: 'bold' }}>
      {planned} / {required}
    </Text>
  );
};

export default function PlanCreate() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const layouts = Form.useWatch('layouts', form);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await ordersApi.list();
      setOrders(data);
    } catch (error) {
      message.error('加载订单失败');
    }
  };

  const handleOrderChange = async (orderId: number) => {
    setSelectedOrderId(orderId);
    try {
      const fullOrder = await ordersApi.getFull(orderId);
      setSelectedOrder(fullOrder.order);
      setOrderItems(fullOrder.items || []);
      form.resetFields(['layouts']);
      form.setFieldsValue({ layouts: [{ colors: [], ratios: {} }] });
    } catch (error) {
      message.error('加载订单详情失败');
    }
  };

  // 订单需求汇总
  const { orderDemand, orderColors, orderSizes } = useMemo(() => {
    if (!orderItems || orderItems.length === 0) {
      return { orderDemand: {}, orderColors: [], orderSizes: [] };
    }

    const demand: Record<string, Record<string, number>> = {};
    const colors = new Set<string>();
    const sizes = new Set<string>();

    orderItems.forEach((item) => {
      if (!demand[item.color]) demand[item.color] = {};
      demand[item.color][item.size] = item.quantity;
      colors.add(item.color);
      sizes.add(item.size);
    });

    return {
      orderDemand: demand,
      orderColors: Array.from(colors),
      orderSizes: Array.from(sizes).sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      }),
    };
  }, [orderItems]);

  // 计划产量汇总（实时计算）
  const plannedSupply = useMemo(() => {
    const supply: Record<string, Record<string, number>> = {};
    if (!layouts) return supply;

    layouts.forEach((layout: any) => {
      if (!layout || !layout.colors || layout.colors.length === 0 || !layout.planned_layers || !layout.ratios) {
        return;
      }

      const { colors, planned_layers } = layout;

      colors.forEach((color: string) => {
        if (!supply[color]) supply[color] = {};
        Object.entries(layout.ratios || {}).forEach(([size, ratio]: [string, any]) => {
          if (ratio && ratio > 0) {
            supply[color][size] = (supply[color][size] || 0) + planned_layers * ratio;
          }
        });
      });
    });

    return supply;
  }, [layouts]);

  const handleCreatePlan = async (values: any) => {
    if (!selectedOrder) {
      message.error('请选择订单');
      return;
    }

    try {
      setLoading(true);

      // 简化版：先创建计划，后续可以通过版型管理添加详细排版
      await plansApi.create({
        plan_name: values.plan_name || `${selectedOrder.order_number} 的生产计划`,
        order_id: selectedOrder.order_id,
        note: values.note || undefined,
      });

      message.success('生产计划创建成功！请继续添加版型和任务。');
      navigate('/plans');
    } catch (error: any) {
      message.error(error.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const summaryColumns = [
    { title: '颜色', dataIndex: 'color', key: 'color', width: 120, fixed: 'left' as const },
    ...orderSizes.map((size) => ({
      title: size,
      dataIndex: size,
      key: size,
      width: 100,
      render: (_: any, record: { color: string }) => (
        <SummaryCell
          planned={plannedSupply[record.color]?.[size] || 0}
          required={orderDemand[record.color]?.[size] || 0}
        />
      ),
    })),
  ];

  return (
    <Form form={form} onFinish={handleCreatePlan} layout="vertical" initialValue={{ layouts: [{}] }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
        <Row align="middle" style={{ marginBottom: 16, flexShrink: 0 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => navigate('/plans')} style={{ marginRight: 8 }}>
            返回计划列表
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            制定新生产计划
          </Title>
        </Row>

        <div style={{ flexShrink: 0 }}>
          {/* 对比表格 */}
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="订单需求概览 (目标)" size="small">
                <Table
                  columns={[
                    { title: '颜色', dataIndex: 'color', key: 'color', width: 120 },
                    ...orderSizes.map((size) => ({
                      title: size,
                      dataIndex: size,
                      key: size,
                      width: 80,
                      render: (_: any, record: { color: string }) => orderDemand[record.color]?.[size] || 0,
                    })),
                  ]}
                  dataSource={orderColors.map((color) => ({ key: color, color }))}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 'max-content' }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="生产计划汇总 (当前)" size="small">
                <Table
                  columns={summaryColumns}
                  dataSource={orderColors.map((color) => ({ key: color, color }))}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 'max-content' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 订单选择和提交 */}
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="选择生产订单" required>
                  <Select
                    showSearch
                    style={{ width: '100%' }}
                    placeholder="选择一个订单"
                    onChange={handleOrderChange}
                    value={selectedOrderId}
                    optionFilterProp="label"
                    options={orders.map((o) => ({
                      value: o.order_id,
                      label: `${o.order_number} - ${o.customer_name || '无客户'}`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="plan_name" label="计划名称">
                  <Input placeholder="不填写则自动生成" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="note" label="备注">
              <TextArea rows={2} placeholder="计划备注" />
            </Form.Item>
            <Row justify="end">
              <Space>
                <Button onClick={() => navigate('/plans')}>取消</Button>
                <Button type="primary" htmlType="submit" loading={loading} disabled={!selectedOrderId}>
                  创建计划
                </Button>
              </Space>
            </Row>
          </Card>
        </div>

        {/* 排版方案设计器（简化版） */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px 0' }}>
          {!selectedOrderId ? (
            <Card>
              <Empty description="请先选择一个订单以开始制定计划" />
            </Card>
          ) : (
            <Card title="预览：排版方案设计（计划创建后通过版型管理添加）">
              <Form.List name="layouts">
                {(fields, { add, remove }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <Card
                        key={key}
                        type="inner"
                        title={`排版方案 #${index + 1}`}
                        size="small"
                        extra={
                          fields.length > 1 && (
                            <Popconfirm title="确认删除?" onConfirm={() => remove(name)}>
                              <Button type="link" danger icon={<DeleteOutlined />} size="small">
                                删除
                              </Button>
                            </Popconfirm>
                          )
                        }
                      >
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              {...restField}
                              name={[name, 'colors']}
                              label="颜色 (可多选)"
                              rules={[{ required: true, message: '请至少选择一个颜色' }]}
                            >
                              <Select mode="multiple" placeholder="选择此方案应用的颜色">
                                {orderColors.map((c) => (
                                  <Option key={c} value={c}>
                                    {c}
                                  </Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              {...restField}
                              name={[name, 'planned_layers']}
                              label="拉布层数"
                              rules={[{ required: true, message: '请输入拉布层数' }]}
                            >
                              <InputNumber min={1} placeholder="计划生产的份数" style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Divider orientation="left" style={{ margin: '12px 0' }}>
                          尺码比例
                        </Divider>
                        <Row gutter={[16, 16]}>
                          {orderSizes.map((size) => (
                            <Col xs={8} sm={6} md={4} key={size}>
                              <Form.Item label={size} {...restField} name={[name, 'ratios', size]} initialValue={0}>
                                <InputNumber min={0} placeholder="比例" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => add({ colors: [], ratios: {} })}
                      block
                      icon={<PlusOutlined />}
                      style={{ marginTop: 16, padding: '20px 0', height: 'auto', borderStyle: 'dashed' }}
                    >
                      添加新的排版方案（用于预览计算）
                    </Button>
                  </div>
                )}
              </Form.List>
            </Card>
          )}
        </div>
      </div>
    </Form>
  );
}

