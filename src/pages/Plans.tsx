import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  Modal,
  message,
  Popconfirm,
  Tag,
  Descriptions,
  Row,
  Col,
  Collapse,
  Input,
  Progress,
  Empty,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  StopOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { plansApi, layoutsApi, tasksApi, ordersApi } from '@/api';
import { ProductionPlan, CuttingLayout, ProductionTask } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

export default function PlansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
  const [planLayouts, setPlanLayouts] = useState<CuttingLayout[]>([]);
  const [planTasks, setPlanTasks] = useState<ProductionTask[]>([]);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ProductionPlan | null>(null);
  const [noteValue, setNoteValue] = useState<string>('');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [layoutRatios, setLayoutRatios] = useState<Record<number, Record<string, number>>>({});

  // 兼容大小写字段名
  const userRole = (user?.role || user?.Role) as any;
  const canCreate = hasPermission(userRole, 'plan:create');
  const canPublish = hasPermission(userRole, 'plan:publish');
  const canFreeze = hasPermission(userRole, 'plan:freeze');
  const canDelete = hasPermission(userRole, 'plan:delete');
  const canUpdate = hasPermission(userRole, 'plan:update');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await plansApi.list();
      setPlans(data);
    } catch (error) {
      message.error('加载计划列表失败');
    } finally {
      setLoading(false);
    }
  };


  const handleViewDetail = async (plan: ProductionPlan) => {
    try {
      const [planDetail, layouts, allTasks, orderDetail, fullOrder] = await Promise.all([
        plansApi.get(plan.plan_id),
        layoutsApi.listByPlan(plan.plan_id),
        tasksApi.list(),
        ordersApi.get(plan.order_id).catch(() => null), // 订单可能不存在，静默失败
        ordersApi.getFull(plan.order_id).catch(() => null), // 获取订单和订单项
      ]);
      setPlanLayouts(layouts);
      // 过滤出属于该计划版型的任务
      const tasks = allTasks.filter((task) =>
        layouts.some((layout) => layout.layout_id === task.layout_id)
      );
      setPlanTasks(tasks);
      // 保存订单信息到 selectedPlan（用于显示）
      if (orderDetail) {
        setSelectedPlan({ ...planDetail, order: orderDetail } as any);
      } else {
        setSelectedPlan(planDetail);
      }
      // 保存订单项
      if (fullOrder && fullOrder.items) {
        setOrderItems(fullOrder.items);
      } else {
        setOrderItems([]);
      }
      // 加载所有版型的尺码比例
      const ratiosMap: Record<number, Record<string, number>> = {};
      await Promise.all(
        layouts.map(async (layout) => {
          try {
            const ratios = await layoutsApi.getRatios(layout.layout_id);
            const ratiosObj: Record<string, number> = {};
            ratios.forEach((r) => {
              ratiosObj[r.size] = r.ratio;
            });
            ratiosMap[layout.layout_id] = ratiosObj;
          } catch (error) {
            ratiosMap[layout.layout_id] = {};
          }
        })
      );
      setLayoutRatios(ratiosMap);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('加载计划详情失败');
    }
  };

  const handlePublish = async (plan: ProductionPlan) => {
    try {
      await plansApi.publish(plan.plan_id);
      message.success('发布计划成功');
      loadPlans();
    } catch (error: any) {
      message.error(error.message || '发布计划失败');
    }
  };

  const handleFreeze = async (plan: ProductionPlan) => {
    try {
      await plansApi.freeze(plan.plan_id);
      message.success('冻结计划成功');
      loadPlans();
    } catch (error: any) {
      message.error(error.message || '冻结计划失败');
    }
  };

  const handleDelete = async (plan: ProductionPlan) => {
    try {
      await plansApi.delete(plan.plan_id);
      message.success('删除计划成功');
      loadPlans();
    } catch (error: any) {
      message.error(error.message || '删除计划失败');
    }
  };

  const handleEditNote = (plan: ProductionPlan) => {
    setEditingPlan(plan);
    setNoteValue(plan.note || '');
    setNoteModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!editingPlan) return;
    try {
      await plansApi.updateNote(editingPlan.plan_id, noteValue || null);
      message.success('备注更新成功');
      setNoteModalVisible(false);
      setEditingPlan(null);
      setNoteValue('');
      loadPlans();
      // 如果当前正在查看详情，刷新详情数据
      if (selectedPlan && selectedPlan.plan_id === editingPlan.plan_id) {
        const updatedPlan = await plansApi.get(editingPlan.plan_id);
        setSelectedPlan(updatedPlan);
      }
    } catch (error: any) {
      message.error(error.message || '更新备注失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待发布' },
      in_progress: { color: 'processing', text: '进行中' },
      completed: { color: 'success', text: '已完成' },
      frozen: { color: 'warning', text: '已冻结' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 计算订单需求汇总
  const { orderDemand, orderColors, orderSizes } = useMemo(() => {
    if (!orderItems || orderItems.length === 0) {
      return { orderDemand: {}, orderColors: [], orderSizes: [] };
    }

    const demand: Record<string, Record<string, number>> = {};
    const colors = new Set<string>();
    const sizes = new Set<string>();

    orderItems.forEach((item: any) => {
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

  // 计算计划产量汇总
  const plannedSupply = useMemo(() => {
    const supply: Record<string, Record<string, number>> = {};
    if (!planLayouts || planLayouts.length === 0 || !planTasks || planTasks.length === 0) {
      return supply;
    }

    planLayouts.forEach((layout) => {
      const layoutTasks = planTasks.filter((task) => task.layout_id === layout.layout_id);
      if (layoutTasks.length === 0) return;

      const ratios = layoutRatios[layout.layout_id] || {};

      layoutTasks.forEach((task) => {
        if (!supply[task.color]) supply[task.color] = {};
        Object.entries(ratios).forEach(([size, ratio]) => {
          if (ratio && ratio > 0) {
            supply[task.color][size] = (supply[task.color][size] || 0) + task.planned_layers * ratio;
          }
        });
      });
    });

    return supply;
  }, [planLayouts, planTasks, layoutRatios]);

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

  const columns: ColumnsType<ProductionPlan> = [
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
      render: (status) => getStatusTag(status),
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
            onClick={() => handleViewDetail(record)}
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
              onConfirm={() => handlePublish(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<PlayCircleOutlined />}>
                发布
              </Button>
            </Popconfirm>
          )}
          {canUpdate && (record.status === 'in_progress' || record.status === 'completed') && (
            <Button
              type="link"
              icon={<FileTextOutlined />}
              onClick={() => handleEditNote(record)}
            >
              修改备注
            </Button>
          )}
          {canFreeze && record.status === 'completed' && (
            <Popconfirm
              title="确定要冻结这个计划吗？"
              onConfirm={() => handleFreeze(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<StopOutlined />}>
                冻结
              </Button>
            </Popconfirm>
          )}
          {canDelete && (
            <Popconfirm
              title="确定要删除这个计划吗？"
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
      <Title level={2}>生产计划</Title>
        </Col>
        <Col>
          {canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/plans/create')}
            >
              创建计划
            </Button>
          )}
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={plans}
          loading={loading}
          rowKey="plan_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 计划详情模态框 */}
      <Modal
        title="计划详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={1000}
      >
        {selectedPlan && (
          <>
            <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="计划名称">{selectedPlan.plan_name}</Descriptions.Item>
              <Descriptions.Item label="订单ID">{selectedPlan.order_id}</Descriptions.Item>
              {(selectedPlan as any).order && (
                <>
                  <Descriptions.Item label="订单号">{(selectedPlan as any).order.order_number}</Descriptions.Item>
                  <Descriptions.Item label="款号">{(selectedPlan as any).order.style_number}</Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="状态">
                {getStatusTag(selectedPlan.status)}
              </Descriptions.Item>
              <Descriptions.Item label="计划发布时间">
                {selectedPlan.planned_publish_date
                  ? dayjs(selectedPlan.planned_publish_date).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="计划完成日期">
                {selectedPlan.planned_finish_date
                  ? dayjs(selectedPlan.planned_finish_date).format('YYYY-MM-DD')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {selectedPlan.note || '-'}
              </Descriptions.Item>
            </Descriptions>
            {selectedPlan.status === 'pending' && canUpdate && (
              <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setDetailModalVisible(false);
                    navigate(`/plans/create?planId=${selectedPlan.plan_id}`);
                  }}
                >
                  编辑计划（添加版型和任务）
                </Button>
              </div>
            )}
            {/* 订单需求与生产计划对比 */}
            {orderItems.length > 0 && (
              <>
                <Divider orientation="left">订单需求与生产计划对比</Divider>
                <Row gutter={24} style={{ marginBottom: 24 }}>
                  <Col xs={24} lg={12}>
                    <Card title="订单需求 (目标)" size="small">
                      <Table
                        columns={[
                          { title: '颜色', dataIndex: 'color', key: 'color', width: 120, fixed: 'left' as const },
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
                        columns={[
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
                        ]}
                        dataSource={orderColors.map((color) => ({ key: color, color }))}
                        pagination={false}
                        size="small"
                        bordered
                        scroll={{ x: 'max-content' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </>
            )}

            {/* 版型和任务层级展示 */}
            {planLayouts.length === 0 ? (
              <Empty description="暂无版型" style={{ padding: 40 }} />
            ) : (
              <Collapse
                defaultActiveKey={planLayouts.map((l) => String(l.layout_id))}
                style={{ marginTop: 16 }}
              >
                {planLayouts.map((layout) => {
                  const layoutTasks = planTasks.filter((task) => task.layout_id === layout.layout_id);
                  return (
                    <Panel
                      key={layout.layout_id}
                      header={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Text strong style={{ fontSize: 16 }}>{layout.layout_name}</Text>
                            {layout.note && (
                              <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                                {layout.note}
                              </Text>
                            )}
                          </div>
                          <Tag color="blue">{layoutTasks.length} 个任务</Tag>
                        </div>
                      }
                    >
                      {layoutTasks.length === 0 ? (
                        <Empty description="该版型暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <Table
                          dataSource={layoutTasks}
                          rowKey="task_id"
                          pagination={false}
                          size="small"
                          columns={[
                            {
                              title: '颜色',
                              dataIndex: 'color',
                              key: 'color',
                              width: 100,
                              render: (color) => <Tag color="purple">{color}</Tag>,
                            },
                            {
                              title: '计划层数',
                              dataIndex: 'planned_layers',
                              key: 'planned_layers',
                              width: 100,
                              align: 'center' as const,
                            },
                            {
                              title: '完成层数',
                              dataIndex: 'completed_layers',
                              key: 'completed_layers',
                              width: 100,
                              align: 'center' as const,
                            },
                            {
                              title: '进度',
                              key: 'progress',
                              width: 200,
                              render: (_, record) => {
                                const progress = record.planned_layers > 0
                                  ? Math.round((record.completed_layers / record.planned_layers) * 100)
                                  : 0;
                                return (
                                  <Progress
                                    percent={progress}
                                    size="small"
                                    status={record.status === 'completed' ? 'success' : 'active'}
                                  />
                                );
                              },
                            },
                            {
                              title: '状态',
                              dataIndex: 'status',
                              key: 'status',
                              width: 100,
                              render: (status) => getStatusTag(status),
                            },
                          ]}
                        />
                      )}
                    </Panel>
                  );
                })}
              </Collapse>
            )}
          </>
        )}
      </Modal>

      {/* 修改备注模态框 */}
      <Modal
        title="修改计划备注"
        open={noteModalVisible}
        onOk={handleSaveNote}
        onCancel={() => {
          setNoteModalVisible(false);
          setEditingPlan(null);
          setNoteValue('');
        }}
        okText="保存"
        cancelText="取消"
      >
        {editingPlan && (
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              计划：{editingPlan.plan_name}
            </Text>
            <TextArea
              rows={4}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="请输入备注信息（可为空）"
              maxLength={500}
              showCount
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
