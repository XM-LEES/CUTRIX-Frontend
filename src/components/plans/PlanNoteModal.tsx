import { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { ProductionPlan } from '@/types';
import { plansApi } from '@/api';

const { TextArea } = Input;

interface PlanNoteModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  plan: ProductionPlan | null;
}

export default function PlanNoteModal({
  open,
  onCancel,
  onSuccess,
  plan,
}: PlanNoteModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && plan) {
      form.setFieldsValue({ note: plan.note || '' });
    }
  }, [open, plan, form]);

  const handleSave = async (values: any) => {
    if (!plan) return;
    setLoading(true);
    try {
      await plansApi.updateNote(plan.plan_id, values.note || null);
      message.success('备注更新成功');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '更新备注失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="修改计划备注"
      open={open}
      onOk={() => form.submit()}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      okText="保存"
      cancelText="取消"
      confirmLoading={loading}
    >
      {plan && (
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="计划名称">
            <span>{plan.plan_name}</span>
          </Form.Item>
          <Form.Item name="note" label="备注">
            <TextArea
              rows={4}
              placeholder="请输入备注信息（可为空）"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

