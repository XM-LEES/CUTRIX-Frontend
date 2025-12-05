import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Table,
  Typography,
  message,
  Select,
  Row,
  Col,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { logsApi, tasksApi } from '@/api';
import { ProductionLog, ProductionTask, CreateLogRequest } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';
import { LogVoidModal, useLogTableColumns } from '@/components/logs';

const { Title } = Typography;
const { TextArea } = Input;

export default function LogsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [myLogs, setMyLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);
  const [form] = Form.useForm();

  // 兼容大小写字段名
  const userRole = (user?.role || user?.Role) as any;
  const canCreate = hasPermission(userRole, 'log:create');
  const canVoid = hasPermission(userRole, 'log:void');

  useEffect(() => {
    loadInProgressTasks();
    loadMyLogs();
  }, []);

  const loadInProgressTasks = async () => {
    try {
      const allTasks = await tasksApi.list();
      // 只显示进行中的任务
      const inProgressTasks = allTasks.filter((task) => task.status === 'in_progress');
      setTasks(inProgressTasks);
    } catch (error) {
      message.error('加载任务列表失败');
    }
  };

  const loadMyLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 获取当前用户的所有日志（通过任务）
      const userId = user.user_id || user.UserID;
      const userName = user.name || user.Name;
      const allTasks = await tasksApi.list();
      const allLogs: ProductionLog[] = [];
      
      for (const task of allTasks) {
        try {
          const logs = await logsApi.list(task.task_id);
          // 过滤出当前用户的日志
          const myTaskLogs = logs.filter(
            (log) => log.worker_id === userId || log.worker_name === userName
          );
          allLogs.push(...myTaskLogs);
        } catch (error) {
          // 静默失败
        }
      }
      
      // 按时间倒序排列
      allLogs.sort((a, b) => new Date(b.log_time).getTime() - new Date(a.log_time).getTime());
      setMyLogs(allLogs);
    } catch (error) {
      message.error('加载日志列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitLoading(true);
    try {
      const request: CreateLogRequest = {
        task_id: values.task_id,
        layers_completed: values.layers_completed,
        worker_id: user?.user_id || user?.UserID,
        worker_name: user?.name || user?.Name,
        note: values.note || undefined,
      };
      await logsApi.create(request);
      message.success('提交日志成功');
      form.resetFields();
      loadInProgressTasks();
      loadMyLogs();
    } catch (error: any) {
      message.error(error.message || '提交日志失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleVoid = (log: ProductionLog) => {
    setSelectedLog(log);
    setVoidModalVisible(true);
  };

  const handleVoidSuccess = () => {
    setVoidModalVisible(false);
    setSelectedLog(null);
    loadMyLogs();
  };

  const columns = useLogTableColumns({
    userRole,
    onVoid: handleVoid,
  });

  return (
    <div>
      <Title level={2}>日志记录</Title>
      
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="提交日志" extra={<Button icon={<ReloadOutlined />} onClick={loadInProgressTasks}>刷新任务</Button>}>
            {canCreate ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
              >
                <Form.Item
                  name="task_id"
                  label="选择任务"
                  rules={[{ required: true, message: '请选择任务' }]}
                >
                  <Select placeholder="选择进行中的任务">
                    {tasks.map((task) => (
                      <Select.Option key={task.task_id} value={task.task_id}>
                        任务 #{task.task_id} - {task.color} (计划: {task.planned_layers}层, 已完成: {task.completed_layers}层)
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="layers_completed"
                  label="完成层数"
                  rules={[
                    { required: true, message: '请输入完成层数' },
                    { type: 'number', min: 1, message: '完成层数必须大于0' },
                  ]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="完成层数" />
                </Form.Item>
                <Form.Item name="note" label="备注">
                  <TextArea rows={3} placeholder="备注信息（可选）" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={submitLoading} block>
                    提交日志
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <div style={{ textAlign: 'center', color: '#999' }}>
                您没有提交日志的权限
              </div>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="我的日志" extra={<Button icon={<ReloadOutlined />} onClick={loadMyLogs}>刷新</Button>}>
            <Table
              columns={columns}
              dataSource={myLogs}
              loading={loading}
              rowKey="log_id"
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
              }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <LogVoidModal
        open={voidModalVisible}
        onCancel={() => {
          setVoidModalVisible(false);
          setSelectedLog(null);
        }}
        onSuccess={handleVoidSuccess}
        log={selectedLog}
      />
    </div>
  );
}

