import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Modal,
} from 'antd';
import { PlusOutlined, DeleteOutlined, LeftOutlined } from '@ant-design/icons';
import { plansApi, ordersApi, layoutsApi, tasksApi } from '@/api';
import type { ProductionOrder, OrderItem } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';

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
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId');
  const isEditMode = !!planIdParam;
  const planId = planIdParam ? parseInt(planIdParam, 10) : null;

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const userRole = (user?.role || user?.Role) as any;
  const canPublish = hasPermission(userRole, 'plan:publish');

  const layouts = Form.useWatch('layouts', form);

  useEffect(() => {
    loadOrders();
    if (isEditMode && planId) {
      loadPlanData(planId);
    }
  }, [isEditMode, planId]);

  const loadOrders = async () => {
    try {
      const data = await ordersApi.list();
      setOrders(data);
    } catch (error) {
      message.error('加载订单失败');
    }
  };

  // 加载计划数据（编辑模式）
  const loadPlanData = async (id: number) => {
    try {
      setInitializing(true);
      
      // 1. 加载计划信息
      const plan = await plansApi.get(id);
      
      // 检查计划状态：只有 pending 状态的计划可以编辑
      if (plan.status !== 'pending') {
        const statusText = plan.status === 'in_progress' ? '进行中' : 
                          plan.status === 'completed' ? '已完成' : 
                          plan.status === 'frozen' ? '已冻结' : plan.status;
        Modal.warning({
          title: '无法编辑计划',
          content: `该计划状态为"${statusText}"，只有"待发布"状态的计划可以编辑。`,
          okText: '确定',
          onOk: () => {
            navigate('/plans');
          },
        });
        return;
      }
      
      // 2. 加载订单信息
      const fullOrder = await ordersApi.getFull(plan.order_id);
      setSelectedOrder(fullOrder.order);
      setSelectedOrderId(plan.order_id);
      setOrderItems(fullOrder.items || []);

      // 3. 加载版型列表
      const layouts = await layoutsApi.listByPlan(id);

      // 4. 为每个版型加载尺码比例和任务
      const layoutsWithData = await Promise.all(
        layouts.map(async (layout) => {
          const [ratios, tasks] = await Promise.all([
            layoutsApi.getRatios(layout.layout_id).catch(() => []),
            tasksApi.listByLayout(layout.layout_id).catch(() => []),
          ]);

          // 将尺码比例转换为对象格式
          const ratiosObj: Record<string, number> = {};
          ratios.forEach((r) => {
            ratiosObj[r.size] = r.ratio;
          });

          // 收集所有颜色（过滤掉空值）
          const colors = Array.from(new Set(
            tasks
              .map((t) => t.color)
              .filter((color) => color && color.trim() !== '')
          ));

          // 获取拉布层数（从第一个任务获取，所有任务应该相同）
          const plannedLayers = tasks.length > 0 ? tasks[0].planned_layers : 0;

          return {
            layout_id: layout.layout_id, // 保存 layout_id 用于后续更新
            layout_name: layout.layout_name,
            note: layout.note || undefined,
            colors,
            planned_layers: plannedLayers,
            ratios: ratiosObj,
          };
        })
      );

      // 5. 填充表单
      form.setFieldsValue({
        plan_name: plan.plan_name,
        note: plan.note || undefined,
        layouts: layoutsWithData,
      });
    } catch (error: any) {
      message.error(error.message || '加载计划数据失败');
      navigate('/plans');
    } finally {
      setInitializing(false);
    }
  };

  const handleOrderChange = async (orderId: number) => {
    // 如果是编辑模式，不检查（因为订单不能修改）
    if (isEditMode) {
      return;
    }

    // 检查该订单是否已有计划
    try {
      const existingPlans = await plansApi.getByOrderId(orderId);
      if (existingPlans.length > 0) {
        const existingPlan = existingPlans[0];
        Modal.warning({
          title: '订单已有生产计划',
          content: `该订单已存在生产计划"${existingPlan.plan_name}"（状态：${existingPlan.status === 'pending' ? '待发布' : existingPlan.status === 'in_progress' ? '进行中' : existingPlan.status === 'completed' ? '已完成' : '已冻结'}）。一个订单只能有一个生产计划。`,
          okText: '确定',
          onOk: () => {
            // 重置选择
            setSelectedOrderId(null);
            setSelectedOrder(null);
            setOrderItems([]);
            form.resetFields(['layouts']);
          },
        });
        return;
      }
    } catch (error) {
      // 如果检查失败，继续执行（可能是网络问题）
      console.warn('检查订单计划失败', error);
    }

    setSelectedOrderId(orderId);
    try {
      const fullOrder = await ordersApi.getFull(orderId);
      setSelectedOrder(fullOrder.order);
      setOrderItems(fullOrder.items || []);
      form.resetFields(['layouts']);
      // 不自动添加排版方案，让用户自己选择是否添加
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

    // 允许创建计划时没有排版方案（0个或多个）
    // 如果没有排版方案，只创建计划，后续可以编辑添加

    try {
      setLoading(true);

      let currentPlanId: number;

      if (isEditMode && planId) {
        // 编辑模式：更新计划备注
        currentPlanId = planId;
        if (values.note !== undefined) {
          await plansApi.updateNote(planId, values.note || null);
        }
      } else {
        // 创建模式：创建新计划
        const plan = await plansApi.create({
          plan_name: values.plan_name || `${selectedOrder.order_number} 的生产计划`,
          order_id: selectedOrder.order_id,
          note: values.note || undefined,
        });
        currentPlanId = plan.plan_id;
      }

      // 2. 处理版型、尺码比例、任务（如果有排版方案）
      let createdLayouts = 0;
      let createdTasks = 0;

      if (isEditMode && currentPlanId) {
        // 编辑模式：需要对比现有版型和表单中的版型
        const existingLayouts = await layoutsApi.listByPlan(currentPlanId);
        const formLayoutIds = new Set(
          (values.layouts || [])
            .map((l: any) => l.layout_id)
            .filter((id: any) => id !== undefined && id !== null)
        );

        // 删除不存在的版型（会级联删除任务和尺码比例）
        for (const layout of existingLayouts) {
          if (!formLayoutIds.has(layout.layout_id)) {
            await layoutsApi.delete(layout.layout_id);
          }
        }

        // 处理表单中的版型
        if (values.layouts && values.layouts.length > 0) {
          for (const layoutData of values.layouts) {
            // 验证必填字段
            if (!layoutData.colors || layoutData.colors.length === 0) {
              message.warning('跳过未选择颜色的排版方案');
              continue;
            }
            if (!layoutData.planned_layers || layoutData.planned_layers <= 0) {
              message.warning('跳过未设置拉布层数的排版方案');
              continue;
            }
            // 检查尺码比例总和是否大于0
            const ratiosSum = Object.values(layoutData.ratios || {}).reduce((sum: number, ratio: any) => {
              return sum + (typeof ratio === 'number' && ratio > 0 ? ratio : 0);
            }, 0);
            if (ratiosSum <= 0) {
              message.warning('跳过尺码比例总和为0的排版方案');
              continue;
            }

            try {
              let layoutId: number;

              if (layoutData.layout_id) {
                // 更新现有版型
                layoutId = layoutData.layout_id;
                if (layoutData.layout_name) {
                  await layoutsApi.updateName(layoutId, layoutData.layout_name);
                }
                if (layoutData.note !== undefined) {
                  await layoutsApi.updateNote(layoutId, layoutData.note || null);
                }

                // 删除现有任务（重新创建）
                // 注意：只有 pending 状态的计划才能删除任务，已在 loadPlanData 中检查
                const existingTasks = await tasksApi.listByLayout(layoutId);
                for (const task of existingTasks) {
                  await tasksApi.delete(task.task_id);
                }
              } else {
                // 创建新版型
                const layout = await layoutsApi.create({
                  plan_id: currentPlanId,
                  layout_name: layoutData.layout_name || `版型-${createdLayouts + 1}`,
                  note: layoutData.note || undefined,
                });
                layoutId = layout.layout_id;
                createdLayouts++;
              }

              // 设置尺码比例（只保存非零的比例）
              const validRatios: Record<string, number> = {};
              for (const [size, ratio] of Object.entries(layoutData.ratios || {})) {
                if (ratio && typeof ratio === 'number' && ratio > 0) {
                  validRatios[size] = ratio;
                }
              }
              if (Object.keys(validRatios).length > 0) {
                await layoutsApi.setRatios(layoutId, validRatios);
              }

              // 为每个颜色创建任务
              for (const color of layoutData.colors) {
                await tasksApi.create({
                  layout_id: layoutId,
                  color: color,
                  planned_layers: layoutData.planned_layers,
                });
                createdTasks++;
              }
            } catch (error: any) {
              message.error(`处理版型失败: ${error.message}`);
              // 继续处理下一个版型，不中断整个流程
            }
          }
        }
      } else {
        // 创建模式：创建新版型
        if (values.layouts && values.layouts.length > 0) {
          for (const layoutData of values.layouts) {
            // 验证必填字段
            if (!layoutData.colors || layoutData.colors.length === 0) {
              message.warning('跳过未选择颜色的排版方案');
              continue;
            }
            if (!layoutData.planned_layers || layoutData.planned_layers <= 0) {
              message.warning('跳过未设置拉布层数的排版方案');
              continue;
            }
            // 检查尺码比例总和是否大于0
            const ratiosSum = Object.values(layoutData.ratios || {}).reduce((sum: number, ratio: any) => {
              return sum + (typeof ratio === 'number' && ratio > 0 ? ratio : 0);
            }, 0);
            if (ratiosSum <= 0) {
              message.warning('跳过尺码比例总和为0的排版方案');
              continue;
            }

            try {
              // 2.1 创建版型
              const layout = await layoutsApi.create({
                plan_id: currentPlanId,
                layout_name: layoutData.layout_name || `版型-${createdLayouts + 1}`,
                note: layoutData.note || undefined,
              });
              createdLayouts++;

              // 2.2 设置尺码比例（只保存非零的比例）
              const validRatios: Record<string, number> = {};
              for (const [size, ratio] of Object.entries(layoutData.ratios || {})) {
                if (ratio && typeof ratio === 'number' && ratio > 0) {
                  validRatios[size] = ratio;
                }
              }
              if (Object.keys(validRatios).length > 0) {
                await layoutsApi.setRatios(layout.layout_id, validRatios);
              }

              // 2.3 为每个颜色创建任务
              for (const color of layoutData.colors) {
                await tasksApi.create({
                  layout_id: layout.layout_id,
                  color: color,
                  planned_layers: layoutData.planned_layers,
                });
                createdTasks++;
              }
            } catch (error: any) {
              message.error(`创建版型失败: ${error.message}`);
              // 继续处理下一个版型，不中断整个流程
            }
          }
        }
      }

      // 根据结果给出不同的提示
      if (isEditMode) {
        if (createdLayouts === 0 && createdTasks === 0) {
          message.success('计划已更新');
        } else {
          message.success(`计划已更新！${createdLayouts > 0 ? `新增 ${createdLayouts} 个版型` : ''} ${createdTasks > 0 ? `新增 ${createdTasks} 个任务` : ''}`);
        }
        navigate('/plans');
      } else {
        if (createdLayouts === 0) {
          message.success('计划已创建，请使用"编辑"功能添加版型和任务后再发布。');
          navigate('/plans');
        } else if (createdTasks === 0) {
          message.warning('计划已创建，但未创建任何任务。请使用"编辑"功能添加任务后再发布。');
          navigate('/plans');
        } else {
          message.success(`生产计划创建成功！已创建 ${createdLayouts} 个版型和 ${createdTasks} 个任务。`);
          
          // 如果用户有发布权限，询问是否立即发布
          if (canPublish) {
            Modal.confirm({
              title: '计划创建成功',
              content: '是否立即发布此计划？',
              okText: '发布',
              cancelText: '稍后发布',
              onOk: async () => {
                try {
                  await plansApi.publish(currentPlanId);
                  message.success('计划发布成功！');
                  navigate('/plans');
                } catch (error: any) {
                  message.error(error.message || '发布失败');
                }
              },
              onCancel: () => {
                navigate('/plans');
              },
            });
          } else {
            navigate('/plans');
          }
        }
      }
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
    <Form form={form} onFinish={handleCreatePlan} layout="vertical" initialValues={{ layouts: [{}] }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
        <Row align="middle" style={{ marginBottom: 16, flexShrink: 0 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => navigate('/plans')} style={{ marginRight: 8 }}>
            返回计划列表
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {isEditMode ? '编辑生产计划' : '制定新生产计划'}
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
                    disabled={isEditMode || initializing}
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
                <Button type="primary" htmlType="submit" loading={loading || initializing} disabled={!selectedOrderId || initializing}>
                  {isEditMode ? '保存修改' : '创建计划'}
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
            <Card title="排版方案设计">
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
                          <Popconfirm title="确认删除?" onConfirm={() => remove(name)}>
                            <Button type="link" danger icon={<DeleteOutlined />} size="small">
                              删除
                            </Button>
                          </Popconfirm>
                        }
                      >
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              {...restField}
                              name={[name, 'layout_name']}
                              label="版型名称"
                            >
                              <Input placeholder="不填写则自动生成" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              {...restField}
                              name={[name, 'planned_layers']}
                              label="拉布层数"
                            >
                              <InputNumber min={1} placeholder="计划生产的份数" style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item
                              {...restField}
                              name={[name, 'colors']}
                              label="颜色 (可多选)"
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
                        </Row>
                        <Form.Item {...restField} name={[name, 'note']} label="备注">
                          <TextArea rows={2} placeholder="版型备注（可选）" />
                        </Form.Item>
                        <Divider orientation="left" style={{ margin: '12px 0' }}>
                          尺码比例
                        </Divider>
                        <Row gutter={[16, 16]}>
                          {orderSizes.map((size) => (
                            <Col xs={8} sm={6} md={4} key={size}>
                              <Form.Item label={size} {...restField} name={[name, 'ratios', size]}>
                                <InputNumber min={0} placeholder="比例" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => {
                        const initialRatios: Record<string, number> = {};
                        orderSizes.forEach(size => {
                          initialRatios[size] = 0;
                        });
                        add({ colors: [], ratios: initialRatios });
                      }}
                      block
                      icon={<PlusOutlined />}
                      style={{ marginTop: 16, padding: '20px 0', height: 'auto', borderStyle: 'dashed' }}
                    >
                      添加新的排版方案
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

