import { useState, useEffect } from 'react';
import { Modal, Table, Descriptions, Tag, Empty, Typography, message } from 'antd';
import { logsApi } from '@/api';
import { ProductionTask, ProductionLog } from '@/types';
import { useLogTableColumns } from '@/components/logs/useLogTableColumns';
import { useAuth } from '@/hooks/useAuth';
import { LogVoidModal } from '@/components/logs';

const { Text } = Typography;

interface TaskDetailModalProps {
  open: boolean;
  onCancel: () => void;
  task: ProductionTask | null;
}

export default function TaskDetailModal({ open, onCancel, task }: TaskDetailModalProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);

  const userRole = (user?.role || user?.Role) as any;

  useEffect(() => {
    if (open && task) {
      loadLogs();
    } else {
      setLogs([]);
    }
  }, [open, task]);

  const loadLogs = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const data = await logsApi.list(task.task_id);
      setLogs(data);
    } catch (error) {
      message.error('加载任务日志失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = (log: ProductionLog) => {
    setSelectedLog(log);
    setVoidModalVisible(true);
  };

  const handleVoidSuccess = () => {
    setVoidModalVisible(false);
    setSelectedLog(null);
    loadLogs();
  };

  const columns = useLogTableColumns({
    userRole,
    onVoid: handleVoid,
  });

  if (!task) return null;

  // 计算累计完成层数（只统计未作废的日志）
  const totalCompleted = logs
    .filter((log) => !log.voided)
    .reduce((sum, log) => sum + log.layers_completed, 0);

  return (
    <>
      <Modal
        title="任务详情"
        open={open}
        onCancel={onCancel}
        footer={null}
        width={900}
      >
        <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="任务ID">{task.task_id}</Descriptions.Item>
          <Descriptions.Item label="颜色">{task.color}</Descriptions.Item>
          <Descriptions.Item label="计划层数">{task.planned_layers}</Descriptions.Item>
          <Descriptions.Item label="完成层数">
            <Text strong>{task.completed_layers}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag
              color={
                task.status === 'completed'
                  ? 'success'
                  : task.status === 'in_progress'
                  ? 'processing'
                  : 'default'
              }
            >
              {task.status === 'completed'
                ? '已完成'
                : task.status === 'in_progress'
                ? '进行中'
                : '待开始'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="累计提交层数">
            <Text strong>{totalCompleted}</Text>
            {totalCompleted !== task.completed_layers && (
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                (包含已作废记录)
              </Text>
            )}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 16 }}>
          <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 12 }}>
            提交记录 ({logs.length} 条)
          </Text>
          {logs.length === 0 ? (
            <Empty description="暂无提交记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              columns={columns}
              dataSource={logs}
              loading={loading}
              rowKey="log_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
              size="small"
            />
          )}
        </div>
      </Modal>

      <LogVoidModal
        open={voidModalVisible}
        onCancel={() => {
          setVoidModalVisible(false);
          setSelectedLog(null);
        }}
        onSuccess={handleVoidSuccess}
        log={selectedLog}
      />
    </>
  );
}

