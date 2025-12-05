import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  message,
  Row,
  Col,
  Select,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { tasksApi, logsApi } from '@/api';
import { ProductionTask, ProductionLog } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { TaskDetailModal, useTaskTableColumns } from '@/components/tasks';

const { Title } = Typography;

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
  const [taskLogs, setTaskLogs] = useState<ProductionLog[]>([]);
  const [layoutFilter, setLayoutFilter] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadTasks();
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

  const columns = useTaskTableColumns({
    onViewDetail: handleViewDetail,
  });

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

      <TaskDetailModal
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        task={selectedTask}
        taskLogs={taskLogs}
      />
    </div>
  );
}
