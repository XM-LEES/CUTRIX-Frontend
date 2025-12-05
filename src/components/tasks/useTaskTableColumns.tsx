import { Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ProductionTask } from '@/types';
import { Tag, Progress } from 'antd';

interface UseTaskTableColumnsProps {
  onViewDetail: (task: ProductionTask) => void;
}

const getStatusTag = (status: string) => {
  const statusMap: Record<string, { color: string; text: string }> = {
    pending: { color: 'default', text: '待开始' },
    in_progress: { color: 'processing', text: '进行中' },
    completed: { color: 'success', text: '已完成' },
  };
  const config = statusMap[status] || { color: 'default', text: status };
  return <Tag color={config.color}>{config.text}</Tag>;
};

export function useTaskTableColumns({
  onViewDetail,
}: UseTaskTableColumnsProps): ColumnsType<ProductionTask> {
  return [
    {
      title: '任务ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 100,
    },
    {
      title: '版型ID',
      dataIndex: 'layout_id',
      key: 'layout_id',
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
      render: (_, record) => {
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
      render: (status) => getStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => onViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];
}

