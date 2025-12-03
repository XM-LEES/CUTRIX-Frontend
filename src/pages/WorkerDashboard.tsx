import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Progress, Spin, Typography, Row, Tag, Button, Space, Empty } from 'antd';
import { LogoutOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { plansApi, tasksApi } from '@/api';
import type { ProductionPlan, ProductionTask } from '@/types';

const { Title, Text } = Typography;

interface TaskGroup {
  plan_id: number;
  plan_name: string;
  order_id: number;
  total_planned: number;
  total_completed: number;
  status: string;
}

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaskGroups();
    // 每30秒刷新一次
    const interval = setInterval(loadTaskGroups, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTaskGroups = async () => {
    try {
      // 获取所有进行中的计划和任务
      const [plans, tasks] = await Promise.all([
        plansApi.list(),
        tasksApi.list(),
      ]);

      // 只显示进行中的计划
      const activePlans = (plans as ProductionPlan[]).filter(
        (p) => p.status === 'in_progress'
      );

      // 为每个计划聚合任务数据
      const groups: TaskGroup[] = activePlans.map((plan) => {
        // 找到属于这个计划的所有任务
        const planTasks = (tasks as ProductionTask[]).filter(
          (t) => {
            // 这里需要通过 layout_id 关联到 plan
            // 由于我们没有直接关联，先简化处理
            return true; // 后面会优化
          }
        );

        const total_planned = planTasks.reduce((sum, t) => sum + t.planned_layers, 0);
        const total_completed = planTasks.reduce((sum, t) => sum + t.completed_layers, 0);

        return {
          plan_id: plan.plan_id,
          plan_name: plan.plan_name,
          order_id: plan.order_id,
          total_planned,
          total_completed,
          status: plan.status,
        };
      });

      setTaskGroups(groups);
    } catch (error) {
      console.error('加载任务失败', error);
    } finally {
      setLoading(false);
    }
  };

  const urgentPlans = taskGroups.filter((p) => 
    p.plan_name.includes('紧急') || p.plan_name.includes('加急')
  ).length;

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <header style={headerStyle}>
        <Title level={3} style={{ margin: 0 }}>
          CUTRIX 工人工作台
        </Title>
        <Space size="large">
          <div style={{ textAlign: 'right' }}>
            <Text strong style={{ fontSize: 16 }}>
              {user?.name || user?.Name || '未知用户'}
            </Text>
            <br />
            <Text type="secondary">
              {user?.user_group || user?.UserGroup || '默认组'}
            </Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={loadTaskGroups}>
            刷新
          </Button>
          <Button danger icon={<LogoutOutlined />} onClick={logout}>
            退出登录
          </Button>
        </Space>
      </header>

      <main style={{ padding: '24px', flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: '20px', flexShrink: 0 }}>
          <Title level={3} style={{ margin: 0 }}>
            我的任务
          </Title>
          <Space>
            <Tag color="blue">共 {taskGroups.length} 项</Tag>
            {urgentPlans > 0 && <Tag color="red">{urgentPlans} 项紧急</Tag>}
          </Space>
        </Row>

        {taskGroups.length === 0 ? (
          <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Empty description="暂无进行中的生产任务" />
          </div>
        ) : (
          <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '8px' }}>
            {taskGroups.map((group) => {
              const progress =
                group.total_planned > 0
                  ? Math.round((group.total_completed / group.total_planned) * 100)
                  : 0;

              const isUrgent =
                group.plan_name.includes('紧急') || group.plan_name.includes('加急');

              return (
                <Card
                  key={group.plan_id}
                  hoverable
                  style={{
                    marginBottom: 16,
                    borderLeft: isUrgent ? '4px solid #cf1322' : '4px solid #1677ff',
                  }}
                  onClick={() => navigate(`/task-operation/${group.plan_id}`)}
                >
                  <Title level={4} style={{ marginTop: 0 }}>
                    {group.plan_name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    计划 ID: {group.plan_id}
                  </Text>
                  <Progress
                    percent={progress}
                    strokeWidth={16}
                    style={{ marginTop: 16, marginBottom: 8 }}
                  />
                  <Text style={{ fontSize: 18, marginTop: 8, display: 'block', fontWeight: 500 }}>
                    {group.total_completed} / {group.total_planned} 层
                  </Text>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

