import { Modal, Descriptions, Table, Tag, Progress, Typography } from 'antd';
import { ProductionTask, ProductionLog } from '@/types';
import dayjs from 'dayjs';

const { Title } = Typography;

interface TaskDetailModalProps {
  open: boolean;
  onCancel: () => void;
  task: ProductionTask | null;
  taskLogs: ProductionLog[];
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

export default function TaskDetailModal({
  open,
  onCancel,
  task,
  taskLogs,
}: TaskDetailModalProps) {
  if (!task) return null;

  return (
    <Modal
      title="任务详情"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="任务ID">{task.task_id}</Descriptions.Item>
        <Descriptions.Item label="版型ID">{task.layout_id}</Descriptions.Item>
        <Descriptions.Item label="颜色">{task.color}</Descriptions.Item>
        <Descriptions.Item label="状态">
          {getStatusTag(task.status)}
        </Descriptions.Item>
        <Descriptions.Item label="计划层数">{task.planned_layers}</Descriptions.Item>
        <Descriptions.Item label="完成层数">{task.completed_layers}</Descriptions.Item>
        <Descriptions.Item label="进度" span={2}>
          <Progress
            percent={
              task.planned_layers > 0
                ? Math.round((task.completed_layers / task.planned_layers) * 100)
                : 0
            }
            status={task.status === 'completed' ? 'success' : 'active'}
          />
        </Descriptions.Item>
      </Descriptions>
      <Title level={5}>任务日志</Title>
      <Table
        dataSource={taskLogs}
        rowKey="log_id"
        pagination={false}
        columns={[
          {
            title: '时间',
            dataIndex: 'log_time',
            key: 'log_time',
            render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            title: '工人',
            key: 'worker',
            render: (_, record) => record.worker_name || `ID: ${record.worker_id || '-'}`,
          },
          {
            title: '完成层数',
            dataIndex: 'layers_completed',
            key: 'layers_completed',
          },
          {
            title: '备注',
            dataIndex: 'note',
            key: 'note',
            render: (text) => text || '-',
          },
          {
            title: '状态',
            dataIndex: 'voided',
            key: 'voided',
            render: (voided) => (
              <Tag color={voided ? 'error' : 'success'}>
                {voided ? '已作废' : '正常'}
              </Tag>
            ),
          },
        ]}
      />
    </Modal>
  );
}

