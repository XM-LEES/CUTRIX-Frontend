import { useMemo, useState, useRef } from 'react';
import { Modal, Descriptions, Divider, Table, Card, Button, Tooltip, message, Space } from 'antd';
import { CopyOutlined, CheckOutlined, PictureOutlined } from '@ant-design/icons';
import { ProductionOrder, OrderItem } from '@/types';
import dayjs from 'dayjs';

interface OrderDetailModalProps {
  open: boolean;
  onCancel: () => void;
  order: ProductionOrder | null;
  orderItems: OrderItem[];
}

export default function OrderDetailModal({
  open,
  onCancel,
  order,
  orderItems,
}: OrderDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // 将订单明细转换为矩阵表格格式（颜色×尺码）
  const { orderMatrix, colors, sizes, colorTotals, grandTotal } = useMemo(() => {
    if (!orderItems || orderItems.length === 0) {
      return {
        orderMatrix: {},
        colors: [],
        sizes: [],
        colorTotals: {},
        grandTotal: 0,
      };
    }

    // 构建颜色×尺码矩阵
    const matrix: Record<string, Record<string, number>> = {};
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    const totals: Record<string, number> = {};

    orderItems.forEach((item) => {
      if (!matrix[item.color]) {
        matrix[item.color] = {};
      }
      matrix[item.color][item.size] = item.quantity;
      colorSet.add(item.color);
      sizeSet.add(item.size);
      totals[item.color] = (totals[item.color] || 0) + item.quantity;
    });

    // 排序：颜色按字母顺序，尺码按数字顺序
    const sortedColors = Array.from(colorSet).sort();
    const sortedSizes = Array.from(sizeSet).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

    return {
      orderMatrix: matrix,
      colors: sortedColors,
      sizes: sortedSizes,
      colorTotals: totals,
      grandTotal,
    };
  }, [orderItems]);

  if (!order) return null;

  // 复制表格数据到剪贴板（Tab分隔，可直接粘贴到Excel）
  const handleCopyTable = async () => {
    try {
      // 构建表头
      const header = ['款号：' + order.style_number || '款号：' , ...sizes, '合计'].join('\t');
      
      // 构建数据行
      const rows = colors.map((color) => {
        const values = sizes.map((size) => orderMatrix[color]?.[size] || 0);
        const total = colorTotals[color] || 0;
        return [color, ...values, total].join('\t');
      });
      
      // 构建合计行
      const totalRow = [
        '合计',
        ...sizes.map((size) => {
          return colors.reduce((sum, color) => sum + (orderMatrix[color]?.[size] || 0), 0);
        }),
        grandTotal,
      ].join('\t');
      
      // 组合所有行
      const text = [header, ...rows, totalRow].join('\n');
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(text);
      setCopied(true);
      message.success('已复制到剪贴板，可直接粘贴到Excel', 2);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      message.error('复制失败，请检查浏览器权限');
    }
  };

  // 复制表格为图片
  const handleCopyImage = async () => {
    if (!tableRef.current) {
      message.error('无法获取表格内容');
      return;
    }

    try {
      setCopyingImage(true);
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) {
          message.error('图片生成失败');
          setCopyingImage(false);
          return;
        }

        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          message.success('图片已复制到剪贴板', 2);
        } catch (error) {
          message.error('复制失败，浏览器可能不支持此功能');
        } finally {
          setCopyingImage(false);
        }
      }, 'image/png');
    } catch (error) {
      message.error('复制图片失败');
      setCopyingImage(false);
    }
  };

  // 构建表格列
  const columns = [
    {
      title: '款号：' + order.style_number || '款号：',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      fixed: 'left' as const,
    },
    ...sizes.map((size) => ({
      title: size,
      dataIndex: size,
      key: size,
      width: 80,
      align: 'center' as const,
      render: (_: any, record: { color: string }) => orderMatrix[record.color]?.[size] || 0,
    })),
    {
      title: '合计',
      key: 'total',
      width: 100,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: { color: string }) => (
        <strong>{colorTotals[record.color] || 0}</strong>
      ),
    },
  ];

  return (
    <Modal
      title="订单详情"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1000}
    >
      <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="订单号">{order.order_number}</Descriptions.Item>
        <Descriptions.Item label="款号">{order.style_number}</Descriptions.Item>
        <Descriptions.Item label="客户名称">
          {order.customer_name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="下单日期">
          {order.order_start_date ? dayjs(order.order_start_date).format('YYYY-MM-DD') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="完成日期">
          {order.order_finish_date ? dayjs(order.order_finish_date).format('YYYY-MM-DD') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {order.note || '-'}
        </Descriptions.Item>
      </Descriptions>
      <Divider orientation="left">系统信息</Divider>
      <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="录入时间">
          {dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="最后更新时间">
          {dayjs(order.updated_at || order.created_at).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
      </Descriptions>
      <Divider orientation="left">订单明细</Divider>
      <Card 
        size="small"
        extra={
          <Space size="small">
            <Tooltip title="复制表格数据（可粘贴到Excel）">
              <Button
                type="text"
                size="small"
                icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                onClick={handleCopyTable}
                style={{ 
                  padding: '4px 8px',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {copied ? '已复制' : '复制'}
              </Button>
            </Tooltip>
            <Tooltip title="复制表格为图片">
              <Button
                type="text"
                size="small"
                icon={<PictureOutlined />}
                onClick={handleCopyImage}
                loading={copyingImage}
                style={{ 
                  padding: '4px 8px',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                复制图片
              </Button>
            </Tooltip>
          </Space>
        }
      >
        <div ref={tableRef}>
          <Table
          columns={columns}
          dataSource={colors.map((color) => ({ key: color, color }))}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>合计</strong>
                </Table.Summary.Cell>
                {sizes.map((size) => {
                  const sizeTotal = colors.reduce(
                    (sum, color) => sum + (orderMatrix[color]?.[size] || 0),
                    0
                  );
                  return (
                    <Table.Summary.Cell index={sizes.indexOf(size) + 1} key={size} align="center">
                      <strong>{sizeTotal}</strong>
                    </Table.Summary.Cell>
                  );
                })}
                <Table.Summary.Cell index={sizes.length + 1} align="center">
                  <strong>{grandTotal}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
        </div>
      </Card>
    </Modal>
  );
}

