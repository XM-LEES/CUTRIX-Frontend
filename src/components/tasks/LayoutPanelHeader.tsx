import { Typography, Progress, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { CuttingLayout, ProductionTask } from '@/types';

const { Text } = Typography;

interface LayoutPanelHeaderProps {
  layout: CuttingLayout;
  tasks: ProductionTask[];
  progress: number;
  onViewDetail?: () => void;
}

export function LayoutPanelHeader({ layout, tasks, progress, onViewDetail }: LayoutPanelHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <Text strong>{layout.layout_name}</Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Text type="secondary">任务: {tasks.length} 个</Text>
        <Progress percent={Math.round(progress)} size="small" style={{ width: 100 }} />
        {onViewDetail && (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail();
            }}
          >
            查看详情
          </Button>
        )}
      </div>
    </div>
  );
}

