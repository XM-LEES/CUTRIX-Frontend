import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  Modal,
  message,
  Tag,
  Descriptions,
  Row,
  Col,
  Progress,
  Select,
  Input,
} from 'antd';
import {
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { tasksApi, logsApi, layoutsApi } from '@/api';
import { ProductionTask, ProductionLog, CuttingLayout } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Search } = Input;

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [layouts, setLayouts] = useState<CuttingLayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
  const [taskLogs, setTaskLogs] = useState<ProductionLog[]>([]);
  const [layoutFilter, setLayoutFilter] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadTasks();
    loadLayouts();
  }, [layoutFilter, statusFilter]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const allTasks = await tasksApi.list();
      let filtered = allTasks;
      
      if (layoutFilter) {
        filtered = filtered.filter((task) => task.layout_id === layoutFilter);
      }
      
      if (statusFilter) {
        filtered = filtered.filter((task) => task.status === statusFilter);
      }
      
      setTasks(filtered);
    } catch (error) {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadLayouts = async () => {
    try {
      // 获取所有版型（这里简化处理，实际应该从计划获取）
      // 由于没有直接获取所有版型的接口，这里先留空
      // 实际使用时可以通过计划列表获取版型
    } catch (error) {
      // 静默失败
    }
  };

  const handleViewDetail = async (task: ProductionTask) => {
    try {
      const [taskDetail, logs] = await Promise.all([
        tasksApi.get(task.task_id),
        logsApi.list(task.task_id),
      ]);
      setSelectedTask(taskDetail);
      setTaskLogs(logs);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('加载任务详情失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待开始' },
      in_progress: { color: 'processing', text: '进行中' },
      completed: { color: 'success', text: '已完成' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<ProductionTask> = [
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
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>任务管理</Title>
        </Col>
        <Col>
          <Space>
            <Select
              placeholder="筛选版型"
              allowClear
              style={{ width: 200 }}
              onChange={(value) => setLayoutFilter(value)}
            >
              {/* 版型选项需要从计划获取，这里先留空 */}
            </Select>
            <Select
              placeholder="筛选状态"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setStatusFilter(value)}
            >
              <Select.Option value="pending">待开始</Select.Option>
              <Select.Option value="in_progress">进行中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadTasks}>
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={tasks}
          loading={loading}
          rowKey="task_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 任务详情模态框 */}
      <Modal
        title="任务详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedTask && (
          <>
            <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="任务ID">{selectedTask.task_id}</Descriptions.Item>
              <Descriptions.Item label="版型ID">{selectedTask.layout_id}</Descriptions.Item>
              <Descriptions.Item label="颜色">{selectedTask.color}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedTask.status)}
              </Descriptions.Item>
              <Descriptions.Item label="计划层数">{selectedTask.planned_layers}</Descriptions.Item>
              <Descriptions.Item label="完成层数">{selectedTask.completed_layers}</Descriptions.Item>
              <Descriptions.Item label="进度" span={2}>
                <Progress
                  percent={
                    selectedTask.planned_layers > 0
                      ? Math.round((selectedTask.completed_layers / selectedTask.planned_layers) * 100)
                      : 0
                  }
                  status={selectedTask.status === 'completed' ? 'success' : 'active'}
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
          </>
        )}
      </Modal>
    </div>
  );
}
