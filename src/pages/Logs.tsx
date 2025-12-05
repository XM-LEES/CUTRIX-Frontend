import { useState, useEffect, useCallback, useRef } from 'react';
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
  const loadingRef = useRef(false); // 防止重复请求

  // 兼容大小写字段名
  const userRole = (user?.role || user?.Role) as any;
  const canCreate = hasPermission(userRole, 'log:create');

  useEffect(() => {
    loadData();
  }, []);

  // 合并加载任务和日志，避免重复请求
  const loadData = async () => {
    if (!user) return;
    if (loadingRef.current) return; // 防止重复请求
    
    loadingRef.current = true;
    setLoading(true);
    try {
      // 1. 并发加载任务列表和我的日志（使用新的 API 接口）
      const [allTasks, myLogs] = await Promise.all([
        tasksApi.list(),
        logsApi.listMy().catch(() => []), // 如果接口不存在，返回空数组（向后兼容）
      ]);
      
      // 2. 过滤出进行中的任务（用于提交日志表单）
      const inProgressTasks = allTasks.filter((task) => task.status === 'in_progress');
      setTasks(inProgressTasks);
      
      // 3. 设置我的日志（后端已按时间倒序排列）
      setMyLogs(myLogs);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // 保留单独的函数用于刷新任务列表（用于提交日志后刷新）
  const loadInProgressTasks = async () => {
    try {
      const allTasks = await tasksApi.list();
      const inProgressTasks = allTasks.filter((task) => task.status === 'in_progress');
      setTasks(inProgressTasks);
    } catch (error) {
      message.error('加载任务列表失败');
    }
  };

  // 保留单独的函数用于刷新日志（用于作废日志后刷新）
  const loadMyLogs = async () => {
    if (!user) return;
    if (loadingRef.current) return; // 防止重复请求
    
    loadingRef.current = true;
    setLoading(true);
    try {
      // 使用新的 API 接口直接获取我的日志
      const myLogs = await logsApi.listMy();
      setMyLogs(myLogs);
    } catch (error) {
      message.error('加载日志列表失败');
    } finally {
      setLoading(false);
      loadingRef.current = false;
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
      // 提交后只需要刷新任务列表和日志
      await Promise.all([loadInProgressTasks(), loadMyLogs()]);
    } catch (error: any) {
      message.error(error.message || '提交日志失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleVoid = useCallback((log: ProductionLog) => {
    setSelectedLog(log);
    setVoidModalVisible(true);
  }, []);

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

