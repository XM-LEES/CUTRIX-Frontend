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
  Tag,
  Space,
} from 'antd';
import { ReloadOutlined, WarningOutlined, FilterOutlined } from '@ant-design/icons';
import { logsApi, tasksApi, usersApi } from '@/api';
import { ProductionLog, ProductionTask, CreateLogRequest, User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';
import { LogVoidModal, useLogTableColumns } from '@/components/logs';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

export default function LogsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [allTasks, setAllTasks] = useState<ProductionTask[]>([]);
  const [myLogs, setMyLogs] = useState<ProductionLog[]>([]);
  const [allLogs, setAllLogs] = useState<ProductionLog[]>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);
  const [recentVoided, setRecentVoided] = useState<ProductionLog[]>([]);
  const [loadingVoided, setLoadingVoided] = useState(false);
  const [voidedPagination, setVoidedPagination] = useState({
    current: 1,
    pageSize: 20,
  });
  const [workers, setWorkers] = useState<User[]>([]);
  const [filterForm] = Form.useForm();
  const [form] = Form.useForm();
  const loadingRef = useRef(false); // 防止重复请求

  // 筛选和分页状态
  const [filters, setFilters] = useState<{
    task_id?: number;
    worker_id?: number;
    voided?: boolean;
  }>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });

  // 兼容大小写字段名
  const userRole = (user?.role || user?.Role) as any;
  const canCreate = hasPermission(userRole, 'log:create');
  const isManager = userRole === 'manager' || userRole === 'admin';

  useEffect(() => {
    loadData();
    if (isManager) {
      loadRecentVoided();
      loadAllTasks();
      loadWorkers();
    }
  }, [isManager]);

  useEffect(() => {
    if (isManager) {
      loadAllLogs();
    }
  }, [isManager, filters, pagination.current, pagination.pageSize]);

  // 合并加载任务和日志，避免重复请求
  const loadData = async () => {
    if (!user) return;
    if (loadingRef.current) return; // 防止重复请求
    
    loadingRef.current = true;
    setLoading(true);
    try {
      // Worker: 加载任务列表和我的日志
      if (!isManager) {
        const [allTasks, myLogs] = await Promise.all([
          tasksApi.list(),
          logsApi.listMy().catch(() => []),
        ]);
        
        const inProgressTasks = allTasks.filter((task) => task.status === 'in_progress');
        setTasks(inProgressTasks);
        setMyLogs(myLogs);
      } else {
        // Manager: 只加载进行中的任务（用于提交日志表单）
        const allTasks = await tasksApi.list();
        const inProgressTasks = allTasks.filter((task) => task.status === 'in_progress');
        setTasks(inProgressTasks);
      }
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const loadAllTasks = async () => {
    try {
      const tasks = await tasksApi.list();
      setAllTasks(tasks);
    } catch (error) {
      console.error('加载所有任务失败', error);
    }
  };

  const loadWorkers = async () => {
    try {
      // 加载所有活跃的工人、管理员和经理
      const users = await usersApi.list({ active: true });
      const relevantUsers = users.filter(
        (u) => u.role === 'worker' || u.role === 'admin' || u.role === 'manager' || u.Role === 'worker' || u.Role === 'admin' || u.Role === 'manager'
      );
      setWorkers(relevantUsers);
    } catch (error) {
      console.error('加载用户列表失败', error);
    }
  };

  const loadAllLogs = async () => {
    setLoading(true);
    try {
      const offset = (pagination.current - 1) * pagination.pageSize;
      const result = await logsApi.listAll({
        task_id: filters.task_id,
        worker_id: filters.worker_id,
        voided: filters.voided,
        limit: pagination.pageSize,
        offset,
      });
      setAllLogs(result.logs);
      setAllLogsTotal(result.total);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载日志列表失败');
    } finally {
      setLoading(false);
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
      // 提交后刷新任务列表和日志
      await loadInProgressTasks();
      if (isManager) {
        await loadAllLogs();
      } else {
        await loadMyLogs();
      }
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
    if (isManager) {
      loadAllLogs();
      loadRecentVoided();
    } else {
      loadMyLogs();
    }
  };

  const handleFilterChange = (values: any) => {
    setFilters({
      task_id: values.task_id,
      worker_id: values.worker_id,
      voided: values.voided,
    });
    setPagination({ ...pagination, current: 1 }); // 重置到第一页
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({});
    setPagination({ ...pagination, current: 1 });
  };

  const loadRecentVoided = async () => {
    setLoadingVoided(true);
    try {
      // 加载更多数据以支持分页（前端分页）
      const voided = await logsApi.listRecentVoided(1000); // 加载足够多的数据
      setRecentVoided(voided);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载最近作废记录失败');
    } finally {
      setLoadingVoided(false);
    }
  };

  const columns = useLogTableColumns({
    userRole,
    onVoid: handleVoid,
  });

  return (
    <div>
      <Title level={2}>日志记录</Title>
      
      {/* 管理员优先显示：最近作废记录 */}
      {isManager && (
        <Card
          title={
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <span>最近作废记录（通知）</span>
            </Space>
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={loadRecentVoided} size="small">
              刷新
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Table
            dataSource={recentVoided}
            loading={loadingVoided}
            rowKey="log_id"
            size="small"
            pagination={{
              current: voidedPagination.current,
              pageSize: voidedPagination.pageSize,
              total: recentVoided.length,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (page, pageSize) => {
                setVoidedPagination({ current: page, pageSize });
              },
            }}
            columns={[
              {
                title: '日志ID',
                dataIndex: 'log_id',
                width: 80,
              },
              {
                title: '工人',
                dataIndex: 'worker_name',
                key: 'worker_name',
                render: (text) => text || '-',
              },
              {
                title: '完成层数',
                dataIndex: 'layers_completed',
                width: 100,
              },
              {
                title: '提交时间',
                dataIndex: 'log_time',
                width: 180,
                render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
              },
              {
                title: '作废时间',
                dataIndex: 'voided_at',
                width: 180,
                render: (time: string | null) =>
                  time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
              },
              {
                title: '作废原因',
                dataIndex: 'void_reason',
                ellipsis: true,
                render: (text: string) => text || '-',
              },
              {
                title: '作废人',
                dataIndex: 'voided_by_name',
                width: 100,
                render: (text: string) => text || '-',
              },
              {
                title: '状态',
                key: 'voided',
                width: 80,
                render: () => <Tag color="red">已作废</Tag>,
              },
            ]}
          />
        </Card>
      )}

      {/* 提交日志 */}
      <Card 
        title="提交日志" 
        extra={<Button icon={<ReloadOutlined />} onClick={loadInProgressTasks}>刷新任务</Button>}
        style={{ marginBottom: 16 }}
      >
        {canCreate ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Row gutter={16}>
              <Col span={8}>
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
              </Col>
              <Col span={8}>
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
              </Col>
              <Col span={8}>
                <Form.Item name="note" label="备注">
                  <TextArea rows={3} placeholder="备注信息（可选）" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitLoading}>
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

      {/* 所有日志（管理员）或我的日志（Worker） */}
      {isManager ? (
        <Card
          title="所有日志"
          extra={
            <Button icon={<ReloadOutlined />} onClick={loadAllLogs} size="small">
              刷新
            </Button>
          }
        >
          <Form
            form={filterForm}
            layout="inline"
            onFinish={handleFilterChange}
            style={{ marginBottom: 16 }}
          >
            <Form.Item name="task_id" label="任务">
              <Select
                placeholder="选择任务"
                allowClear
                style={{ width: 150 }}
              >
                {allTasks.map((task) => (
                  <Select.Option key={task.task_id} value={task.task_id}>
                    #{task.task_id} - {task.color}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="worker_id" label="操作人">
              <Select
                placeholder="选择操作人"
                allowClear
                style={{ width: 120 }}
                showSearch
                optionFilterProp="children"
              >
                {workers.map((worker) => (
                  <Select.Option key={worker.user_id || worker.UserID} value={worker.user_id || worker.UserID}>
                    {worker.name || worker.Name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="voided" label="状态">
              <Select placeholder="全部" allowClear style={{ width: 100 }}>
                <Select.Option value={false}>正常</Select.Option>
                <Select.Option value={true}>已作废</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<FilterOutlined />} size="small">
                  筛选
                </Button>
                <Button onClick={handleResetFilters} size="small">
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
          <Table
            columns={columns}
            dataSource={allLogs}
            loading={loading}
            rowKey="log_id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: allLogsTotal,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPagination({ current: page, pageSize });
              },
            }}
            size="small"
          />
        </Card>
      ) : (
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
      )}

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

