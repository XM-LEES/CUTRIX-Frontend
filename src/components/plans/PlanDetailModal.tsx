import { useNavigate } from 'react-router-dom';
import {
  Modal,
  Descriptions,
  Button,
  Divider,
  Card,
  Table,
  Empty,
  Typography,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { ProductionPlan, CuttingLayout, ProductionTask, OrderItem } from '@/types';
import { hasPermission } from '@/utils/permissions';
import { PlanStatusTag } from './PlanStatusTag';
import dayjs from 'dayjs';
import { useMemo } from 'react';

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
  let plannedColor = '#000000'; // 默认黑色
  if (diff >= 0 && required > 0) plannedColor = '#52c41a'; // 满足: 绿色
  if (diff < 0) plannedColor = '#f5222d'; // 缺少: 红色

  return (
    <span>
      <Text style={{ color: '#000000' }}>
        {required}
      </Text>
      <Text style={{ color: '#000000', margin: '0 4px' }}>/</Text>
      <Text style={{ color: plannedColor, fontWeight: 'bold' }}>
        {planned}
      </Text>
    </span>
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

  // 构建版型详细信息表格数据（类似Excel第二部分）
  const layoutDetailData = useMemo(() => {
    if (!planLayouts || planLayouts.length === 0 || !planTasks || planTasks.length === 0) {
      return [];
    }

    const data: Array<{
      key: string;
      color: string;
      layout_name: string;
      layout_id: number;
      [size: string]: any;
    }> = [];

    planLayouts.forEach((layout) => {
      const layoutTasks = planTasks.filter((task) => task.layout_id === layout.layout_id);
      if (layoutTasks.length === 0) return;

      const ratios = layoutRatios[layout.layout_id] || {};

      // 每个颜色一行
      layoutTasks.forEach((task) => {
        const row: any = {
          key: `${layout.layout_id}-${task.color}`,
          color: task.color,
          layout_name: layout.layout_name,
          layout_id: layout.layout_id,
        };

        // 添加各尺码比例
        orderSizes.forEach((size) => {
          row[size] = ratios[size] || 0;
        });

        // 计算合计（所有尺码比例之和）
        const total = orderSizes.reduce((sum, size) => {
          return sum + (ratios[size] || 0);
        }, 0);
        row.total = total;

        data.push(row);
      });
    });

    return data;
  }, [planLayouts, planTasks, layoutRatios, orderSizes]);

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
      {/* 订单需求与生产计划对比（合并为一个表格） */}
      {orderItems.length > 0 && (
        <>
          <Divider orientation="left">订单需求与生产计划对比</Divider>
            <Card 
            extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                 格式：<Text style={{ fontWeight: 'bold' }}> 需求数量 / 计划数量</Text> | 
                 <Text style={{ color: '#52c41a', fontWeight: 'bold' }}> 绿色=满足 </Text>
                 <Text style={{ color: '#f5222d', fontWeight: 'bold' }}> 红色=不足</Text>
               </Text>
            }
          >
            <Table
              columns={[
                { 
                  title: '颜色', 
                  dataIndex: 'color', 
                  key: 'color', 
                  width: 120, 
                  fixed: 'left' as const 
                },
                ...orderSizes.map((size) => ({
                  title: size,
                  dataIndex: size,
                  key: size,
                  width: 100,
                  align: 'center' as const,
                  render: (_: any, record: { color: string }) => (
                    <SummaryCell
                      planned={plannedSupply[record.color]?.[size] || 0}
                      required={orderDemand[record.color]?.[size] || 0}
                    />
                  ),
                })),
                {
                  title: '合计',
                  key: 'total',
                  width: 120,
                  align: 'center' as const,
                  fixed: 'right' as const,
                  render: (_: any, record: { color: string }) => {
                    const totalPlanned = orderSizes.reduce(
                      (sum, size) => sum + (plannedSupply[record.color]?.[size] || 0),
                      0
                    );
                    const totalRequired = orderSizes.reduce(
                      (sum, size) => sum + (orderDemand[record.color]?.[size] || 0),
                      0
                    );
                    return (
                      <SummaryCell
                        planned={totalPlanned}
                        required={totalRequired}
                      />
                    );
                  },
                },
              ]}
              dataSource={orderColors.map((color) => ({ key: color, color }))}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 'max-content' }}
              summary={() => {
                // 计算合计行
                const totalPlannedBySize: Record<string, number> = {};
                const totalRequiredBySize: Record<string, number> = {};
                let totalPlannedAll = 0;
                let totalRequiredAll = 0;

                orderSizes.forEach((size) => {
                  totalPlannedBySize[size] = orderColors.reduce(
                    (sum, color) => sum + (plannedSupply[color]?.[size] || 0),
                    0
                  );
                  totalRequiredBySize[size] = orderColors.reduce(
                    (sum, color) => sum + (orderDemand[color]?.[size] || 0),
                    0
                  );
                  totalPlannedAll += totalPlannedBySize[size];
                  totalRequiredAll += totalRequiredBySize[size];
                });

                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <Text strong>合计</Text>
                      </Table.Summary.Cell>
                      {orderSizes.map((size) => (
                        <Table.Summary.Cell 
                          index={orderSizes.indexOf(size) + 1} 
                          key={size}
                          align="center"
                        >
                          <SummaryCell
                            planned={totalPlannedBySize[size]}
                            required={totalRequiredBySize[size]}
                          />
                        </Table.Summary.Cell>
                      ))}
                      <Table.Summary.Cell index={orderSizes.length + 1} align="center">
                        <SummaryCell
                          planned={totalPlannedAll}
                          required={totalRequiredAll}
                        />
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </>
      )}

      {/* 版型详细信息表格（类似Excel第二部分） */}
      {planLayouts.length === 0 ? (
        <Empty description="暂无版型" style={{ padding: 40 }} />
      ) : (
        <>
          <Divider orientation="left">版型详细信息</Divider>
          <Card size="small">
            <Table
              dataSource={layoutDetailData}
              rowKey="key"
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: '颜色',
                  dataIndex: 'color',
                  key: 'color',
                  width: 100,
                  fixed: 'left' as const,
                },
                {
                  title: '版长',
                  dataIndex: 'layout_name',
                  key: 'layout_name',
                  width: 120,
                  fixed: 'left' as const,
                },
                ...orderSizes.map((size) => ({
                  title: size,
                  dataIndex: size,
                  key: size,
                  width: 80,
                  align: 'center' as const,
                  render: (value: number) => value || 0,
                })),
                {
                  title: '合计',
                  dataIndex: 'total',
                  key: 'total',
                  width: 100,
                  align: 'center' as const,
                  render: (value: number) => <Text strong>{value || 0}</Text>,
                },
              ]}
            />
          </Card>
        </>
      )}
    </Modal>
  );
}

