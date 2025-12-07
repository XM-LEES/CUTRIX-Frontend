import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Typography, message, Card, Tag, Collapse, Empty } from 'antd';
import { LeftOutlined, HistoryOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { plansApi, layoutsApi, tasksApi, logsApi } from '@/api';
import NumberKeypad from '@/components/NumberKeypad';
import type { ProductionPlan, CuttingLayout, ProductionTask } from '@/types';
import { WorkerLogsDrawer } from '@/components/logs';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface PlanWithDetails extends ProductionPlan {
  layouts?: (CuttingLayout & { tasks?: ProductionTask[] })[];
}

export default function TaskOperation() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<PlanWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
  const [inputValue, setInputValue] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logsDrawerVisible, setLogsDrawerVisible] = useState(false);

  useEffect(() => {
    if (planId) {
      loadPlanData(Number(planId));
    }
  }, [planId]);

  const loadPlanData = async (id: number) => {
    try {
      setLoading(true);
      // 优化：并行批量获取数据，减少请求次数
      const [plan, layouts, allTasks] = await Promise.all([
        plansApi.get(id),
        layoutsApi.listByPlan(id),
        tasksApi.list(), // 一次性获取所有任务
      ]);
      
      // 按版型分组任务
      const tasksByLayout = new Map<number, ProductionTask[]>();
      allTasks.forEach((task) => {
        const layoutTasks = tasksByLayout.get(task.layout_id) || [];
        layoutTasks.push(task);
        tasksByLayout.set(task.layout_id, layoutTasks);
      });
      
      // 为每个版型关联任务
      const layoutsWithTasks = layouts.map((layout) => ({
        ...layout,
        tasks: tasksByLayout.get(layout.layout_id) || [],
      }));

      setCurrentPlan({
        ...plan,
        layouts: layoutsWithTasks,
      });

      // 自动选中第一个未完成的任务
      const firstUnfinishedTask = layoutsWithTasks
        .flatMap((l) => l.tasks || [])
        .find((t) => t.completed_layers < t.planned_layers);
      
      setSelectedTask(firstUnfinishedTask || null);
    } catch (error) {
      message.error('加载计划数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 找到第一个有未完成任务的版型
  const firstUnfinishedLayoutId = useMemo(() => {
    if (!currentPlan) return null;
    const layout = currentPlan.layouts?.find((l) =>
      l.tasks?.some((t) => t.completed_layers < t.planned_layers)
    );
    return layout?.layout_id;
  }, [currentPlan]);

  const handleKeyPress = (key: string) => {
    if (key === 'C') {
      setInputValue('0');
    } else if (key === 'Del') {
      setInputValue(inputValue.length > 1 ? inputValue.slice(0, -1) : '0');
    } else {
      // 限制输入长度
      if (inputValue.length >= 5) return;
      setInputValue(inputValue === '0' ? key : inputValue + key);
    }
  };

  const handleSubmit = async () => {
    const layers = parseInt(inputValue, 10);
    if (!layers || layers <= 0) {
      message.error('请输入有效的层数');
      return;
    }
    if (!selectedTask || !user) {
      message.error('未选择任务或用户信息丢失');
      return;
    }

    const userId = user.user_id || user.UserID;
    const userName = user.name || user.Name;

    if (!userId) {
      message.error('无法获取用户信息');
      return;
    }

    setIsSubmitting(true);
    try {
      await logsApi.create({
        task_id: selectedTask.task_id,
        layers_completed: layers,
        worker_id: userId,
        worker_name: userName || undefined,
      });
      message.success({
        content: '记录提交成功！点击右上角"我的记录"可查看所有提交记录',
        duration: 4,
      });
      setInputValue('0');
      // 刷新数据
      if (planId) {
        await loadPlanData(Number(planId));
      }
    } catch (error: any) {
      message.error(error.message || '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerStyle: React.CSSProperties = {
    background: '#fff',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f0f0f0',
    height: 64,
    flexShrink: 0,
  };

  if (loading || !currentPlan) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <header style={headerStyle}>
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => navigate('/worker-dashboard')}
          style={{ fontSize: 16 }}
        >
          返回工作台
        </Button>
        <div style={{ textAlign: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {currentPlan.plan_name}
          </Title>
          <Text type="secondary">计划 ID: {currentPlan.plan_id}</Text>
        </div>
        <Button
          type="text"
          icon={<HistoryOutlined />}
          onClick={() => setLogsDrawerVisible(true)}
          style={{ fontSize: 16 }}
        >
          我的记录
        </Button>
      </header>

      <main style={{ padding: 24, flexGrow: 1, display: 'flex', gap: 24, overflow: 'hidden' }}>
        {/* 左侧：任务列表 */}
        <Card
          title="选择任务"
          bodyStyle={{ padding: 0, overflowY: 'auto' }}
          style={{ width: 450, display: 'flex', flexDirection: 'column' }}
        >
          {!currentPlan.layouts || currentPlan.layouts.length === 0 ? (
            <Empty description="暂无任务" style={{ padding: 24 }} />
          ) : (
            <Collapse
              accordion
              defaultActiveKey={firstUnfinishedLayoutId ? String(firstUnfinishedLayoutId) : undefined}
              ghost
            >
              {currentPlan.layouts.map((layout) => (
                <Panel
                  header={
                    <Title level={5} style={{ margin: 0 }}>
                      {layout.layout_name}
                    </Title>
                  }
                  key={layout.layout_id}
                >
                  {!layout.tasks || layout.tasks.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center' }}>
                      <Text type="secondary">暂无任务</Text>
                    </div>
                  ) : (
                    layout.tasks.map((task) => {
                      const isSelected = selectedTask?.task_id === task.task_id;
                      const isCompleted = task.completed_layers >= task.planned_layers;
                      const remaining = task.planned_layers - task.completed_layers;

                      return (
                        <div
                          key={task.task_id}
                          onClick={() => {
                            setInputValue('0');
                            setSelectedTask(task);
                          }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#e6f4ff' : 'white',
                            borderRight: isSelected ? '4px solid #1677ff' : 'none',
                          }}
                        >
                          <Text style={{ fontSize: 18, fontWeight: 500 }}>{task.color}</Text>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: 4,
                            }}
                          >
                            <Text type="secondary">
                              {task.completed_layers} / {task.planned_layers} 层
                            </Text>
                            {isCompleted ? (
                              <Tag color="success">已完成</Tag>
                            ) : (
                              <Tag color="processing">还少 {remaining} 层</Tag>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </Panel>
              ))}
            </Collapse>
          )}
        </Card>

        {/* 右侧：录入界面 */}
        <Card style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedTask ? (
            <>
              <Title level={4} style={{ marginTop: 0 }}>
                正在为{' '}
                <Tag color="blue" style={{ fontSize: 18, padding: '4px 8px' }}>
                  {selectedTask.color}
                </Tag>{' '}
                录入本次完成层数
              </Title>
              <div style={{ flexGrow: 1, display: 'flex', gap: 24, alignItems: 'stretch' }}>
                <div
                  style={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#f0f2f5',
                      borderRadius: 8,
                      padding: 24,
                      textAlign: 'right',
                      fontSize: 80,
                      fontWeight: 'bold',
                      color: '#1677ff',
                      lineHeight: 1,
                      overflow: 'hidden',
                    }}
                  >
                    {inputValue}
                  </div>
                  <Button
                    type="primary"
                    style={{ width: '100%', height: 80, fontSize: 24 }}
                    onClick={handleSubmit}
                    loading={isSubmitting}
                  >
                    提交记录
                  </Button>
                </div>
                <NumberKeypad onKeyPress={handleKeyPress} />
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Text type="secondary">请从左侧选择一个任务开始操作</Text>
            </div>
          )}
        </Card>
      </main>

      <WorkerLogsDrawer
        open={logsDrawerVisible}
        onClose={() => setLogsDrawerVisible(false)}
      />
    </div>
  );
}

