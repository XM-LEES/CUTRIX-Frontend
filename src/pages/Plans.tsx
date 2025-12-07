import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Typography,
  Card,
  message,
  Row,
  Col,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { plansApi, layoutsApi, tasksApi, ordersApi } from '@/api';
import { ProductionPlan, CuttingLayout, ProductionTask, OrderItem } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';
import { PlanDetailModal, PlanNoteModal, usePlanTableColumns } from '@/components/plans';

const { Title } = Typography;

export default function PlansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
  const [planLayouts, setPlanLayouts] = useState<CuttingLayout[]>([]);
  const [planTasks, setPlanTasks] = useState<ProductionTask[]>([]);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ProductionPlan | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [layoutRatios, setLayoutRatios] = useState<Record<number, Record<string, number>>>({});

  // 兼容大小写字段名
  const userRole = (user?.role || user?.Role) as any;
  const canCreate = hasPermission(userRole, 'plan:create');

  useEffect(() => {
    loadPlans();
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


  const handleViewDetail = async (plan: ProductionPlan) => {
    try {
      const [planDetail, layouts, allTasks, orderDetail, fullOrder] = await Promise.all([
        plansApi.get(plan.plan_id),
        layoutsApi.listByPlan(plan.plan_id),
        tasksApi.list(),
        ordersApi.get(plan.order_id).catch(() => null), // 订单可能不存在，静默失败
        ordersApi.getFull(plan.order_id).catch(() => null), // 获取订单和订单项
      ]);
      setPlanLayouts(layouts);
      // 过滤出属于该计划版型的任务
      const tasks = allTasks.filter((task) =>
        layouts.some((layout) => layout.layout_id === task.layout_id)
      );
      setPlanTasks(tasks);
      // 保存订单信息到 selectedPlan（用于显示）
      if (orderDetail) {
        setSelectedPlan({ ...planDetail, order: orderDetail } as any);
      } else {
        setSelectedPlan(planDetail);
      }
      // 保存订单项
      if (fullOrder && fullOrder.items) {
        setOrderItems(fullOrder.items);
      } else {
        setOrderItems([]);
      }
      // 优化：批量加载所有版型的尺码比例
      const layoutIds = layouts.map((l) => l.layout_id);
      const ratiosBatch = await layoutsApi.getRatiosBatch(layoutIds).catch(() => ({}));
      const ratiosMap: Record<number, Record<string, number>> = {};
      layouts.forEach((layout) => {
        const ratios = ratiosBatch[layout.layout_id] || [];
        const ratiosObj: Record<string, number> = {};
        ratios.forEach((r) => {
          ratiosObj[r.size] = r.ratio;
        });
        ratiosMap[layout.layout_id] = ratiosObj;
      });
      setLayoutRatios(ratiosMap);
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

  const handleEditNote = (plan: ProductionPlan) => {
    setEditingPlan(plan);
    setNoteModalVisible(true);
  };

  const handleNoteSuccess = () => {
      setNoteModalVisible(false);
      setEditingPlan(null);
      loadPlans();
      // 如果当前正在查看详情，刷新详情数据
    if (selectedPlan && editingPlan && selectedPlan.plan_id === editingPlan.plan_id) {
      plansApi.get(editingPlan.plan_id).then((updatedPlan) => {
        setSelectedPlan(updatedPlan);
      });
    }
  };

  const columns = usePlanTableColumns({
    userRole,
    onViewDetail: handleViewDetail,
    onPublish: handlePublish,
    onFreeze: handleFreeze,
    onDelete: handleDelete,
    onEditNote: handleEditNote,
  });

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
      <Title level={2}>生产计划</Title>
        </Col>
        <Col>
          {canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/plans/create')}
            >
              创建计划
            </Button>
          )}
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

      <PlanDetailModal
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        plan={selectedPlan}
        orderItems={orderItems}
        planLayouts={planLayouts}
        planTasks={planTasks}
        layoutRatios={layoutRatios}
        userRole={userRole}
      />

      <PlanNoteModal
        open={noteModalVisible}
        onCancel={() => {
          setNoteModalVisible(false);
          setEditingPlan(null);
        }}
        onSuccess={handleNoteSuccess}
        plan={editingPlan}
      />
    </div>
  );
}
