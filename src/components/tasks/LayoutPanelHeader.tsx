import { Typography, Progress } from 'antd';
import { CuttingLayout, ProductionTask } from '@/types';

const { Text } = Typography;

interface LayoutPanelHeaderProps {
  layout: CuttingLayout;
  tasks: ProductionTask[];
  progress: number;
}

export function LayoutPanelHeader({ layout, tasks, progress }: LayoutPanelHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <Text strong>{layout.layout_name}</Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Text type="secondary">任务: {tasks.length} 个</Text>
        <Progress percent={Math.round(progress)} size="small" style={{ width: 100 }} />
      </div>
    </div>
  );
}

