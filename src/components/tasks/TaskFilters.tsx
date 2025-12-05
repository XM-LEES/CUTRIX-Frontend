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
}

export function TaskFilters({
  plans,
  selectedPlanId,
  selectedStatus,
  onPlanChange,
  onStatusChange,
  onRefresh,
}: TaskFiltersProps) {
  const planOptions = plans.map((p) => ({
    value: p.plan_id,
    label: p.plan_name,
  }));

  return (
    <Space>
      <Select
        placeholder="筛选计划"
        allowClear
        style={{ width: 200 }}
        value={selectedPlanId}
        onChange={onPlanChange}
        options={planOptions}
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

