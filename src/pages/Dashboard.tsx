import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  FileTextOutlined,
  UnorderedListOutlined,
  BlockOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { plansApi, tasksApi, ordersApi, usersApi } from '@/api';
import { ProductionPlan, ProductionTask, ProductionOrder } from '@/types';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Dashboard() {
  const [stats, setStats] = useState({
    pendingPlans: 0,
    inProgressTasks: 0,
    todayLayers: 0,
    totalOrders: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // 每30秒刷新一次
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const [plans, tasks, orders, users] = await Promise.all([
        plansApi.list().catch(() => []),
        tasksApi.list().catch(() => []),
        ordersApi.list().catch(() => []),
        usersApi.list().catch(() => []),
      ]);

      // 待发布计划
      const pendingPlans = plans.filter((p: ProductionPlan) => p.status === 'pending').length;

      // 进行中任务
      const inProgressTasks = tasks.filter((t: ProductionTask) => t.status === 'in_progress').length;

      // 今日完成层数（简化处理，实际应该从日志统计）
      // 这里暂时使用所有任务的完成层数总和
      const todayLayers = tasks.reduce((sum: number, task: ProductionTask) => {
        return sum + task.completed_layers;
      }, 0);

      setStats({
        pendingPlans,
        inProgressTasks,
        todayLayers,
        totalOrders: orders.length,
        totalUsers: users.length,
      });
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>仪表板</Title>
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待发布计划"
              value={stats.pendingPlans}
              prefix={<UnorderedListOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中任务"
              value={stats.inProgressTasks}
              prefix={<BlockOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累计完成层数"
              value={stats.todayLayers}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={stats.totalOrders}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#13c2c2' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
