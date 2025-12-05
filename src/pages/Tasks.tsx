// 前端更新
// 使用 layoutsApi.list() 一次性获取所有版型
// 将请求从 1+N+1 次减少到 1+1+1 = 3 次请求（并行执行）
// 性能提升
// 优化前：
// 1 次获取所有计划
// N 次获取每个计划的版型（N = 计划数量）
// M 次获取每个版型的任务（M = 版型数量）
// 总计：1 + N + M 次请求
// 优化后：
// 1 次获取所有计划
// 1 次获取所有版型
// 1 次获取所有任务
// 总计：3 次请求（并行执行）
// 示例（10 个计划，每个 5 个版型）：
// 优化前：1 + 10 + 50 = 61 次请求
// 优化后：3 次请求
// 性能提升约 20 倍，可支持更大数据量。

import { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  message,
  Row,
  Col,
  Collapse,
  Table,
  Empty,
  Tag,
  Progress,
} from 'antd';
import { plansApi, layoutsApi, tasksApi } from '@/api';
import { ProductionPlan, CuttingLayout, ProductionTask } from '@/types';
import {
  PlanPanelHeader,
  LayoutPanelHeader,
  TaskFilters,
  calculatePlanProgress,
  calculateLayoutProgress,
} from '@/components/tasks';

const { Title } = Typography;
const { Panel } = Collapse;

interface PlanWithTasks extends ProductionPlan {
  layouts: Array<CuttingLayout & { tasks: ProductionTask[] }>;
}

export default function TasksPage() {
  const [plansWithTasks, setPlansWithTasks] = useState<PlanWithTasks[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [planFilter, setPlanFilter] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadTasks();
  }, [statusFilter, planFilter]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      // 优化：并行加载所有数据，减少请求次数到 3 次
      // 1. 并行加载所有计划、所有版型、所有任务（一次性获取，避免 N+1 查询）
      const [plans, allLayouts, allTasks] = await Promise.all([
        plansApi.list(),
        layoutsApi.list(), // 一次性获取所有版型
        tasksApi.list(), // 一次性获取所有任务
      ]);

      // 2. 构建版型ID到版型的映射，并按计划分组版型
      const layoutsByPlan = new Map<number, CuttingLayout[]>();
      allLayouts.forEach((layout) => {
        const planLayouts = layoutsByPlan.get(layout.plan_id) || [];
        planLayouts.push(layout);
        layoutsByPlan.set(layout.plan_id, planLayouts);
      });

      // 3. 按版型分组任务
      const tasksByLayout = new Map<number, ProductionTask[]>();
      allTasks.forEach((task) => {
        const layoutTasks = tasksByLayout.get(task.layout_id) || [];
        layoutTasks.push(task);
        tasksByLayout.set(task.layout_id, layoutTasks);
      });

      // 4. 组织数据结构：计划 -> 版型 -> 任务
      const plansData = plans.map((plan) => {
        const planLayouts = layoutsByPlan.get(plan.plan_id) || [];
        const layoutsWithTasks = planLayouts.map((layout) => ({
          ...layout,
          tasks: tasksByLayout.get(layout.layout_id) || [],
        }));

        return {
          ...plan,
          layouts: layoutsWithTasks,
        };
      });

      // 7. 应用筛选
      let filtered = plansData;
      
      if (planFilter) {
        filtered = filtered.filter((p) => p.plan_id === planFilter);
      }

      if (statusFilter) {
        filtered = filtered.map((plan) => ({
          ...plan,
          layouts: plan.layouts.map((layout) => ({
            ...layout,
            tasks: layout.tasks.filter((task) => task.status === statusFilter),
          })).filter((layout) => layout.tasks.length > 0), // 只保留有任务的版型
        })).filter((plan) => plan.layouts.length > 0); // 只保留有版型的计划
      }

      setPlansWithTasks(filtered);
    } catch (error) {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 任务表格列定义
  const taskColumns = [
    {
      title: '任务ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 100,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
    },
    {
      title: '计划层数',
      dataIndex: 'planned_layers',
      key: 'planned_layers',
      width: 100,
    },
    {
      title: '完成层数',
      dataIndex: 'completed_layers',
      key: 'completed_layers',
      width: 100,
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_: any, record: ProductionTask) => {
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
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: '待开始' },
          in_progress: { color: 'processing', text: '进行中' },
          completed: { color: 'success', text: '已完成' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>任务管理</Title>
        </Col>
        <Col>
          <TaskFilters
            plans={plansWithTasks}
            selectedPlanId={planFilter}
            selectedStatus={statusFilter}
            onPlanChange={setPlanFilter}
            onStatusChange={setStatusFilter}
            onRefresh={loadTasks}
          />
        </Col>
      </Row>

      <Card loading={loading}>
        {plansWithTasks.length === 0 ? (
          <Empty description="暂无任务数据" />
        ) : (
          <Collapse>
            {plansWithTasks.map((plan) => {
              const { totalPlanned, totalCompleted, progress } = calculatePlanProgress(plan);
              const totalTasks = plan.layouts.reduce((sum, layout) => sum + layout.tasks.length, 0);

              return (
                <Panel
                  key={plan.plan_id}
                  header={
                    <PlanPanelHeader
                      plan={plan}
                      totalTasks={totalTasks}
                      totalPlanned={totalPlanned}
                      totalCompleted={totalCompleted}
                      progress={progress}
                    />
                  }
                >
                  {plan.layouts.length === 0 ? (
                    <Empty description="该计划暂无版型和任务" />
                  ) : (
                    <Collapse ghost>
                      {plan.layouts.map((layout) => {
                        const layoutProgress = calculateLayoutProgress(layout.tasks);

                        return (
                          <Panel
                            key={layout.layout_id}
                            header={
                              <LayoutPanelHeader
                                layout={layout}
                                tasks={layout.tasks}
                                progress={layoutProgress}
                              />
                            }
                          >
                            {layout.tasks.length === 0 ? (
                              <Empty description="该版型暂无任务" />
                            ) : (
                              <Table
                                columns={taskColumns}
                                dataSource={layout.tasks}
                                rowKey="task_id"
                                pagination={false}
                                size="small"
                              />
                            )}
                          </Panel>
                        );
                      })}
                    </Collapse>
                  )}
                </Panel>
              );
            })}
          </Collapse>
        )}
      </Card>
    </div>
  );
}
