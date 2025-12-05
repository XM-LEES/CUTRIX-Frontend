import { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  message,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Popconfirm,
  Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { ordersApi } from '@/api';

const { TextArea } = Input;
const { Text } = Typography;

// 常规尺码列表（用于矩阵录入）
const REGULAR_SIZES = ['90', '100', '110', '120', '130', '140', '150', '160'];

interface OrderCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function OrderCreateModal({
  open,
  onCancel,
  onSuccess,
}: OrderCreateModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      // 从矩阵中提取有效数据
      const matrixItems = (values.matrix || [])
        .flatMap((row: { color: string; sizes: Record<string, number> }) => {
          if (!row || !row.color) return [];
          return Object.entries(row.sizes || {})
            .filter(([, quantity]) => quantity && quantity > 0)
            .map(([size, quantity]) => ({
              color: row.color,
              size,
              quantity: Number(quantity),
            }));
        });

      // 合并特殊尺码
      const specialItems = (values.special_items || [])
        .filter((item: any) => item && item.color && item.size && item.quantity > 0)
        .map((item: any) => ({
          color: item.color,
          size: item.size,
          quantity: Number(item.quantity),
        }));

      // 组合所有明细
      const allItems = [...matrixItems, ...specialItems];

      if (allItems.length === 0) {
        message.error('请至少输入一个有效的订单明细项');
        return;
      }

      const request = {
        order_number: values.order_number,
        style_number: values.style_number,
        customer_name: values.customer_name || undefined,
        order_start_date: values.order_start_date ? values.order_start_date.format('YYYY-MM-DD') : undefined,
        order_finish_date: values.order_finish_date ? values.order_finish_date.format('YYYY-MM-DD') : undefined,
        note: values.note || undefined,
        items: allItems,
      };
      
      await ordersApi.create(request);
      message.success('创建订单成功');
      form.resetFields();
      form.setFieldsValue({ matrix: [{}], special_items: [] });
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="创建订单"
      open={open}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
      width={1100}
      destroyOnHidden
      afterClose={() => {
        form.resetFields();
        form.setFieldsValue({ matrix: [{}], special_items: [] });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ matrix: [{}], special_items: [] }}
      >
        <Form.Item
          name="order_number"
          label="订单号"
          rules={[{ required: true, message: '请输入订单号' }]}
        >
          <Input placeholder="例如：ORD-20250101-001" />
        </Form.Item>
        <Form.Item
          name="style_number"
          label="款号"
          rules={[{ required: true, message: '请输入款号' }]}
        >
          <Input placeholder="款号" />
        </Form.Item>
        <Form.Item name="customer_name" label="客户名称">
          <Input placeholder="客户名称" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="order_start_date" 
              label="下单日期"
              tooltip="客户下单的日期（业务时间）"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              name="order_finish_date" 
              label="完成日期"
              tooltip="订单计划完成的日期（业务时间）"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="note" label="备注">
          <TextArea rows={3} placeholder="备注信息" />
        </Form.Item>

        <Divider orientation="left">常规尺码批量录入</Divider>
        <Form.List name="matrix">
          {(fields, { add, remove }) => (
            <>
              <Row gutter={8} style={{ marginBottom: 8, color: 'gray' }}>
                <Col span={4}><Text strong>颜色</Text></Col>
                {REGULAR_SIZES.map(size => (
                  <Col span={2} key={size} style={{ textAlign: 'center' }}>
                    <Text strong>{size}</Text>
                  </Col>
                ))}
                <Col span={2}></Col>
              </Row>
              {fields.map(({ key, name, ...restField }) => (
                <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                  <Col span={4}>
                    <Form.Item
                      {...restField}
                      name={[name, 'color']}
                      rules={[{ required: true, message: '输入颜色' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="颜色" />
                    </Form.Item>
                  </Col>
                  {REGULAR_SIZES.map(size => (
                    <Col span={2} key={size}>
                      <Form.Item
                        {...restField}
                        name={[name, 'sizes', size]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                      </Form.Item>
                    </Col>
                  ))}
                  <Col span={2}>
                    {fields.length > 1 && (
                      <Popconfirm title="确认删除此行?" onConfirm={() => remove(name)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )}
                  </Col>
                </Row>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
                style={{ marginBottom: 16 }}
              >
                添加颜色行
              </Button>
            </>
          )}
        </Form.List>

        <Divider orientation="left" style={{ marginTop: 24 }}>添加特殊尺码（可选）</Divider>
        <Form.List name="special_items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'color']}
                    rules={[{ required: true, message: '颜色' }]}
                  >
                    <Input placeholder="颜色" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'size']}
                    rules={[{ required: true, message: '尺码' }]}
                  >
                    <Input placeholder="特殊尺码" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'quantity']}
                    rules={[{ required: true, message: '数量' }]}
                  >
                    <InputNumber min={1} placeholder="数量" />
                  </Form.Item>
                  <DeleteOutlined onClick={() => remove(name)} style={{ cursor: 'pointer', color: '#ff4d4f' }} />
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                添加特殊尺码明细
              </Button>
            </>
          )}
        </Form.List>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              创建
            </Button>
            <Button onClick={() => {
              onCancel();
              form.resetFields();
            }}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

