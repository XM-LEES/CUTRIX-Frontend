import { useNavigate } from 'react-router-dom';
import {
  Modal,
  Descriptions,
  Button,
  Row,
  Col,
  Divider,
  Card,
  Table,
  Collapse,
  Empty,
  Tag,
  Progress,
  Typography,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { ProductionPlan, CuttingLayout, ProductionTask, OrderItem } from '@/types';
import { hasPermission } from '@/utils/permissions';
import { PlanStatusTag } from './PlanStatusTag';
import dayjs from 'dayjs';
import { useMemo } from 'react';

const { Panel } = Collapse;
const { Text } = Typography;

interface PlanDetailModalProps {
  open: boolean;
  onCancel: () => void;
  plan: ProductionPlan | null;
  orderItems: OrderItem[];
  planLayouts: CuttingLayout[];
  planTasks: ProductionTask[];
  layoutRatios: Record<number, Record<string, number>>;
  userRole: any;
}

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

export default function PlanDetailModal({
  open,
  onCancel,
  plan,
  orderItems,
  planLayouts,
  planTasks,
  layoutRatios,
  userRole,
}: PlanDetailModalProps) {
  const navigate = useNavigate();
  const canUpdate = hasPermission(userRole, 'plan:update');

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

  if (!plan) return null;

  return (
    <Modal
      title="计划详情"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1000}
    >
      <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="计划名称">{plan.plan_name}</Descriptions.Item>
        <Descriptions.Item label="订单ID">{plan.order_id}</Descriptions.Item>
        {(plan as any).order && (
          <>
            <Descriptions.Item label="订单号">{(plan as any).order.order_number}</Descriptions.Item>
            <Descriptions.Item label="款号">{(plan as any).order.style_number}</Descriptions.Item>
          </>
        )}
        <Descriptions.Item label="状态">
          <PlanStatusTag status={plan.status} />
        </Descriptions.Item>
        <Descriptions.Item label="计划发布时间">
          {plan.planned_publish_date
            ? dayjs(plan.planned_publish_date).format('YYYY-MM-DD HH:mm')
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="计划完成日期">
          {plan.planned_finish_date
            ? dayjs(plan.planned_finish_date).format('YYYY-MM-DD')
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {plan.note || '-'}
        </Descriptions.Item>
      </Descriptions>
      {plan.status === 'pending' && canUpdate && (
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              onCancel();
              navigate(`/plans/create?planId=${plan.plan_id}`);
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
                        render: (status) => <PlanStatusTag status={status} />,
                      },
                    ]}
                  />
                )}
              </Panel>
            );
          })}
        </Collapse>
      )}
    </Modal>
  );
}

