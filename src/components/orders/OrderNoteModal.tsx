import { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { ProductionOrder } from '@/types';
import { ordersApi } from '@/api';

const { TextArea } = Input;

interface OrderNoteModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  order: ProductionOrder | null;
}

export default function OrderNoteModal({
  open,
  onCancel,
  onSuccess,
  order,
}: OrderNoteModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && order) {
      form.setFieldsValue({ note: order.note || '' });
    }
  }, [open, order, form]);

  const handleSave = async (values: any) => {
    if (!order) return;
    setLoading(true);
    try {
      await ordersApi.updateNote(order.order_id, values.note || null);
      message.success('更新备注成功');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="编辑备注"
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
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item name="note" label="备注">
          <TextArea rows={4} placeholder="备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

