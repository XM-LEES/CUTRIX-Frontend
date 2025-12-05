import { Typography, Tag, Progress } from 'antd';
import { ProductionPlan } from '@/types';
import { getStatusLabel } from '@/utils/format';

const { Text } = Typography;

interface PlanPanelHeaderProps {
  plan: ProductionPlan;
  totalTasks: number;
  totalPlanned: number;
  totalCompleted: number;
  progress: number;
}

export function PlanPanelHeader({
  plan,
  totalTasks,
  totalPlanned,
  totalCompleted,
  progress,
}: PlanPanelHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div>
        <Text strong>{plan.plan_name}</Text>
        <Tag
          color={
            plan.status === 'pending'
              ? 'default'
              : plan.status === 'in_progress'
              ? 'processing'
              : plan.status === 'completed'
              ? 'success'
              : 'warning'
          }
          style={{ marginLeft: 8 }}
        >
          {getStatusLabel(plan.status).text}
        </Tag>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Text type="secondary">任务: {totalTasks} 个</Text>
        <Text type="secondary">
          进度: {totalCompleted} / {totalPlanned} 层
        </Text>
        <Progress percent={Math.round(progress)} size="small" style={{ width: 100 }} />
      </div>
    </div>
  );
}

