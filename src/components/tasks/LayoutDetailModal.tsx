import { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Descriptions, Tag, Empty, Typography, message, Collapse, Divider } from 'antd';
import { logsApi } from '@/api';
import { CuttingLayout, ProductionTask, ProductionLog } from '@/types';
import { useLogTableColumns } from '@/components/logs/useLogTableColumns';
import { useAuth } from '@/hooks/useAuth';
import { LogVoidModal } from '@/components/logs';

const { Text } = Typography;
const { Panel } = Collapse;

interface LayoutDetailModalProps {
  open: boolean;
  onCancel: () => void;
  layout: CuttingLayout | null;
  tasks: ProductionTask[];
}

export default function LayoutDetailModal({ open, onCancel, layout, tasks }: LayoutDetailModalProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);

  const userRole = (user?.role || user?.Role) as any;

  useEffect(() => {
    if (open && layout) {
      loadLogs();
    } else {
      setLogs([]);
    }
  }, [open, layout]);

  const loadLogs = async () => {
    if (!layout) return;
    setLoading(true);
    try {
      const data = await logsApi.listByLayout(layout.layout_id);
      setLogs(data);
    } catch (error) {
      message.error('加载版型日志失败');
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

  // 按任务（颜色）分组日志
  const logsByTask = useMemo(() => {
    const grouped: Record<number, ProductionLog[]> = {};
    tasks.forEach((task) => {
      grouped[task.task_id] = [];
    });
    logs.forEach((log) => {
      if (grouped[log.task_id]) {
        grouped[log.task_id].push(log);
      }
    });
    return grouped;
  }, [logs, tasks]);

  // 计算每个任务的累计完成层数
  const taskStats = useMemo(() => {
    return tasks.map((task) => {
      const taskLogs = logsByTask[task.task_id] || [];
      const totalCompleted = taskLogs
        .filter((log) => !log.voided)
        .reduce((sum, log) => sum + log.layers_completed, 0);
      return {
        task,
        totalCompleted,
        logCount: taskLogs.length,
      };
    });
  }, [tasks, logsByTask]);

  if (!layout) return null;

  // 计算版型总累计完成层数
  const layoutTotalCompleted = taskStats.reduce((sum, stat) => sum + stat.totalCompleted, 0);
  const layoutTotalPlanned = tasks.reduce((sum, task) => sum + task.planned_layers, 0);

  return (
    <>
      <Modal
        title="版型详情"
        open={open}
        onCancel={onCancel}
        footer={null}
        width={1000}
      >
        <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="版型ID">{layout.layout_id}</Descriptions.Item>
          <Descriptions.Item label="版型名称">{layout.layout_name}</Descriptions.Item>
          <Descriptions.Item label="任务数量">{tasks.length} 个</Descriptions.Item>
          <Descriptions.Item label="总计划层数">{layoutTotalPlanned}</Descriptions.Item>
          <Descriptions.Item label="总完成层数">
            <Text strong>{tasks.reduce((sum, task) => sum + task.completed_layers, 0)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="累计提交层数">
            <Text strong>{layoutTotalCompleted}</Text>
          </Descriptions.Item>
          {layout.note && (
            <Descriptions.Item label="备注" span={2}>
              {layout.note}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientation="left">任务概览</Divider>
        <Table
          dataSource={taskStats}
          rowKey={(record) => String(record.task.task_id)}
          pagination={false}
          size="small"
          bordered
          columns={[
            {
              title: '任务ID',
              dataIndex: ['task', 'task_id'],
              key: 'task_id',
              width: 100,
            },
            {
              title: '颜色',
              dataIndex: ['task', 'color'],
              key: 'color',
              width: 100,
              render: (color: string) => <Tag color="purple">{color}</Tag>,
            },
            {
              title: '计划层数',
              dataIndex: ['task', 'planned_layers'],
              key: 'planned_layers',
              width: 100,
              align: 'center' as const,
            },
            {
              title: '完成层数',
              dataIndex: ['task', 'completed_layers'],
              key: 'completed_layers',
              width: 100,
              align: 'center' as const,
            },
            {
              title: '提交记录数',
              dataIndex: 'logCount',
              key: 'logCount',
              width: 100,
              align: 'center' as const,
            },
            {
              title: '累计提交层数',
              dataIndex: 'totalCompleted',
              key: 'totalCompleted',
              width: 120,
              align: 'center' as const,
              render: (value: number, record: any) => (
                <Text strong={value !== record.task.completed_layers}>
                  {value}
                  {value !== record.task.completed_layers && (
                    <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                      (含已作废)
                    </Text>
                  )}
                </Text>
              ),
            },
          ]}
        />

        <Divider orientation="left" style={{ marginTop: 24 }}>
          提交记录详情 ({logs.length} 条)
        </Divider>
        {logs.length === 0 ? (
          <Empty description="暂无提交记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Collapse defaultActiveKey={tasks.map((t) => String(t.task_id))}>
            {taskStats.map((stat) => {
              const taskLogs = logsByTask[stat.task.task_id] || [];
              if (taskLogs.length === 0) return null;

              return (
                <Panel
                  key={stat.task.task_id}
                  header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <Tag color="purple">{stat.task.color}</Tag>
                        <Text strong>任务 #{stat.task.task_id}</Text>
                      </span>
                      <Text type="secondary">
                        {taskLogs.length} 条记录 | 累计 {stat.totalCompleted} 层
                      </Text>
                    </div>
                  }
                >
                  <Table
                    columns={columns}
                    dataSource={taskLogs}
                    loading={loading}
                    rowKey="log_id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                    }}
                    size="small"
                  />
                </Panel>
              );
            })}
          </Collapse>
        )}
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

