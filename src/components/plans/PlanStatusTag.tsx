import { Tag } from 'antd';

interface PlanStatusTagProps {
  status: string;
}

export function PlanStatusTag({ status }: PlanStatusTagProps) {
  const statusMap: Record<string, { color: string; text: string }> = {
    pending: { color: 'default', text: '待发布' },
    in_progress: { color: 'processing', text: '进行中' },
    completed: { color: 'success', text: '已完成' },
    frozen: { color: 'warning', text: '已冻结' },
  };
  const config = statusMap[status] || { color: 'default', text: status };
  return <Tag color={config.color}>{config.text}</Tag>;
}

