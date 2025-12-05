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
      // 1. 加载所有计划
      const plans = await plansApi.list();
      
      // 2. 为每个计划加载版型和任务
      const plansData = await Promise.all(
        plans.map(async (plan) => {
          // 加载版型
          const layouts = await layoutsApi.listByPlan(plan.plan_id);
          
          // 为每个版型加载任务
          const layoutsWithTasks = await Promise.all(
            layouts.map(async (layout) => {
              const tasks = await tasksApi.listByLayout(layout.layout_id);
              return { ...layout, tasks };
            })
          );

          return {
            ...plan,
            layouts: layoutsWithTasks,
          };
        })
      );

      // 3. 应用筛选
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
