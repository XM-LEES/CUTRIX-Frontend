import { Select, Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ProductionPlan } from '@/types';

interface TaskFiltersProps {
  plans: ProductionPlan[];
  selectedPlanId?: number;
  selectedStatus?: string;
  onPlanChange: (planId?: number) => void;
  onStatusChange: (status?: string) => void;
  onRefresh: () => void;
  initialPlanName?: string; // 从跳转传递的计划名称
}

export function TaskFilters({
  plans,
  selectedPlanId,
  selectedStatus,
  onPlanChange,
  onStatusChange,
  onRefresh,
  initialPlanName,
}: TaskFiltersProps) {
  // 构建计划选项，如果计划名称还没加载但有初始名称，使用初始名称
  const planOptions = plans.map((p) => ({
    value: p.plan_id,
    label: p.plan_name,
  }));

  // 如果选中了planId但找不到对应的计划名称，使用初始名称或显示加载状态
  const selectedPlan = plans.find((p) => p.plan_id === selectedPlanId);
  const notFound = selectedPlanId && !selectedPlan;
  
  // 如果有初始计划名称但计划列表还没加载，添加临时选项
  if (notFound && initialPlanName && selectedPlanId) {
    planOptions.push({
      value: selectedPlanId,
      label: initialPlanName,
    });
  }

  return (
    <Space>
      <Select
        placeholder="筛选计划"
        allowClear
        style={{ width: 200 }}
        value={selectedPlanId}
        onChange={onPlanChange}
        options={planOptions}
        loading={notFound && !initialPlanName}
        notFoundContent={notFound && !initialPlanName ? '加载中...' : undefined}
      />
      <Select
        placeholder="筛选状态"
        allowClear
        style={{ width: 150 }}
        value={selectedStatus}
        onChange={onStatusChange}
      >
        <Select.Option value="pending">待开始</Select.Option>
        <Select.Option value="in_progress">进行中</Select.Option>
        <Select.Option value="completed">已完成</Select.Option>
      </Select>
      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        刷新
      </Button>
    </Space>
  );
}

