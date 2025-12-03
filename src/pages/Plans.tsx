import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Tag,
  Descriptions,
  Row,
  Col,
  Tabs,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { plansApi, layoutsApi, tasksApi, ordersApi } from '@/api';
import { ProductionPlan, CuttingLayout, ProductionTask, ProductionOrder } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

export default function PlansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
  const [planLayouts, setPlanLayouts] = useState<CuttingLayout[]>([]);
  const [planTasks, setPlanTasks] = useState<ProductionTask[]>([]);
  const [createForm] = Form.useForm();

  // 兼容大小写字段名
  const userRole = (user?.role || user?.Role) as any;
  const canCreate = hasPermission(userRole, 'plan:create');
  const canPublish = hasPermission(userRole, 'plan:publish');
  const canFreeze = hasPermission(userRole, 'plan:freeze');
  const canDelete = hasPermission(userRole, 'plan:delete');

  useEffect(() => {
    loadPlans();
    loadOrders();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await plansApi.list();
      setPlans(data);
    } catch (error) {
      message.error('加载计划列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await ordersApi.list();
      setOrders(data);
    } catch (error) {
      // 静默失败
    }
  };

  const handleCreate = async (values: any) => {
    try {
      await plansApi.create({
        plan_name: values.plan_name,
        order_id: values.order_id,
        note: values.note || undefined,
        planned_finish_date: values.planned_finish_date
          ? values.planned_finish_date.format('YYYY-MM-DD')
          : undefined,
      });
      message.success('创建计划成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadPlans();
    } catch (error: any) {
      message.error(error.message || '创建计划失败');
    }
  };

  const handleViewDetail = async (plan: ProductionPlan) => {
    try {
      const [planDetail, layouts, allTasks] = await Promise.all([
        plansApi.get(plan.plan_id),
        layoutsApi.list(plan.plan_id),
        tasksApi.list(),
      ]);
      setSelectedPlan(planDetail);
      setPlanLayouts(layouts);
      // 过滤出属于该计划版型的任务
      const tasks = allTasks.filter((task) =>
        layouts.some((layout) => layout.layout_id === task.layout_id)
      );
      setPlanTasks(tasks);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('加载计划详情失败');
    }
  };

  const handlePublish = async (plan: ProductionPlan) => {
    try {
      await plansApi.publish(plan.plan_id);
      message.success('发布计划成功');
      loadPlans();
    } catch (error: any) {
      message.error(error.message || '发布计划失败');
    }
  };

  const handleFreeze = async (plan: ProductionPlan) => {
    try {
      await plansApi.freeze(plan.plan_id);
      message.success('冻结计划成功');
      loadPlans();
    } catch (error: any) {
      message.error(error.message || '冻结计划失败');
    }
  };

  const handleDelete = async (plan: ProductionPlan) => {
    try {
      await plansApi.delete(plan.plan_id);
      message.success('删除计划成功');
      loadPlans();
    } catch (error: any) {
      message.error(error.message || '删除计划失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待发布' },
      in_progress: { color: 'processing', text: '进行中' },
      completed: { color: 'success', text: '已完成' },
      frozen: { color: 'warning', text: '已冻结' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<ProductionPlan> = [
    {
      title: '计划名称',
      dataIndex: 'plan_name',
      key: 'plan_name',
    },
    {
      title: '订单ID',
      dataIndex: 'order_id',
      key: 'order_id',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '计划发布时间',
      dataIndex: 'planned_publish_date',
      key: 'planned_publish_date',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '计划完成日期',
      dataIndex: 'planned_finish_date',
      key: 'planned_finish_date',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {canPublish && record.status === 'pending' && (
            <Popconfirm
              title="确定要发布这个计划吗？"
              onConfirm={() => handlePublish(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<PlayCircleOutlined />}>
                发布
              </Button>
            </Popconfirm>
          )}
          {canFreeze && record.status === 'completed' && (
            <Popconfirm
              title="确定要冻结这个计划吗？"
              onConfirm={() => handleFreeze(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<StopOutlined />}>
                冻结
              </Button>
            </Popconfirm>
          )}
          {canDelete && (
            <Popconfirm
              title="确定要删除这个计划吗？"
              onConfirm={() => handleDelete(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
      <Title level={2}>生产计划</Title>
        </Col>
        <Col>
          <Space>
            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/plans/create')}
              >
                制定新计划（高级）
              </Button>
            )}
            {canCreate && (
              <Button
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                快速创建
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={plans}
          loading={loading}
          rowKey="plan_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建计划模态框 */}
      <Modal
        title="创建计划"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="plan_name"
            label="计划名称"
            rules={[{ required: true, message: '请输入计划名称' }]}
          >
            <Input placeholder="计划名称" />
          </Form.Item>
          <Form.Item
            name="order_id"
            label="关联订单"
            rules={[{ required: true, message: '请选择关联订单' }]}
          >
            <Select placeholder="选择订单">
              {orders.map((order) => (
                <Select.Option key={order.order_id} value={order.order_id}>
                  {order.order_number} - {order.style_number}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="planned_finish_date" label="计划完成日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false);
                createForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 计划详情模态框 */}
      <Modal
        title="计划详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={1000}
      >
        {selectedPlan && (
          <>
            <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="计划名称">{selectedPlan.plan_name}</Descriptions.Item>
              <Descriptions.Item label="订单ID">{selectedPlan.order_id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedPlan.status)}
              </Descriptions.Item>
              <Descriptions.Item label="计划发布时间">
                {selectedPlan.planned_publish_date
                  ? dayjs(selectedPlan.planned_publish_date).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="计划完成日期">
                {selectedPlan.planned_finish_date
                  ? dayjs(selectedPlan.planned_finish_date).format('YYYY-MM-DD')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {selectedPlan.note || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Tabs
              items={[
                {
                  key: 'layouts',
                  label: '版型列表',
                  children: (
                    <Table
                      dataSource={planLayouts}
                      rowKey="layout_id"
                      pagination={false}
                      columns={[
                        { title: '版型名称', dataIndex: 'layout_name', key: 'layout_name' },
                        { title: '备注', dataIndex: 'note', key: 'note', render: (text) => text || '-' },
                      ]}
                    />
                  ),
                },
                {
                  key: 'tasks',
                  label: '任务列表',
                  children: (
                    <Table
                      dataSource={planTasks}
                      rowKey="task_id"
                      pagination={false}
                      columns={[
                        { title: '颜色', dataIndex: 'color', key: 'color' },
                        { title: '计划层数', dataIndex: 'planned_layers', key: 'planned_layers' },
                        { title: '完成层数', dataIndex: 'completed_layers', key: 'completed_layers' },
                        {
                          title: '进度',
                          key: 'progress',
                          render: (_, record) => {
                            const progress = record.planned_layers > 0
                              ? Math.round((record.completed_layers / record.planned_layers) * 100)
                              : 0;
                            return `${progress}%`;
                          },
                        },
                        {
                          title: '状态',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status) => getStatusTag(status),
                        },
                      ]}
                    />
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
