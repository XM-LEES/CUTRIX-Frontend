import { useState, useEffect } from 'react';
import { Card, Typography, Descriptions, Button, Space, Alert, Divider } from 'antd';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { message } from 'antd';

const { Title, Text, Paragraph } = Typography;

// 全局错误日志存储
const errorLogs: Array<{ time: string; type: string; message: string; stack?: string }> = [];

// 捕获错误并存储
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    errorLogs.push({
      time: new Date().toLocaleString('zh-CN'),
      type: 'console.error',
      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '),
    });
    originalError.apply(console, args);
  };

  window.addEventListener('error', (event) => {
    errorLogs.push({
      time: new Date().toLocaleString('zh-CN'),
      type: 'window.error',
      message: event.message || '未知错误',
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorLogs.push({
      time: new Date().toLocaleString('zh-CN'),
      type: 'unhandledrejection',
      message: String(event.reason || 'Promise 被拒绝'),
      stack: event.reason?.stack,
    });
  });
}

export default function DebugPage() {
  const [browserInfo, setBrowserInfo] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState(errorLogs);

  useEffect(() => {
    // 收集浏览器信息
    const info: Record<string, any> = {
      'User Agent': navigator.userAgent,
      '平台': navigator.platform,
      '语言': navigator.language,
      '屏幕尺寸': `${window.screen.width}x${window.screen.height}`,
      '视口尺寸': `${window.innerWidth}x${window.innerHeight}`,
      '设备像素比': window.devicePixelRatio || '未知',
      'Cookie 启用': navigator.cookieEnabled ? '是' : '否',
      '在线状态': navigator.onLine ? '在线' : '离线',
    };

    // 检查 JavaScript 特性
    const features: Record<string, string> = {
      'Promise': typeof Promise !== 'undefined' ? '✓ 支持' : '✗ 不支持',
      'fetch': typeof fetch !== 'undefined' ? '✓ 支持' : '✗ 不支持',
      'Object.assign': typeof Object.assign !== 'undefined' ? '✓ 支持' : '✗ 不支持',
      'Symbol': typeof Symbol !== 'undefined' ? '✓ 支持' : '✗ 不支持',
      'Array.from': typeof Array.from !== 'undefined' ? '✓ 支持' : '✗ 不支持',
      'Map': typeof Map !== 'undefined' ? '✓ 支持' : '✗ 不支持',
      'Set': typeof Set !== 'undefined' ? '✓ 支持' : '✗ 不支持',
      'async/await': (async () => {}).constructor.name === 'AsyncFunction' ? '✓ 支持' : '✗ 不支持',
      '箭头函数': (() => {}).constructor.name === 'Function' ? '✓ 支持' : '✗ 不支持',
    };

    // 检查 ES Modules
    try {
      features['ES Modules'] = '✓ 支持';
    } catch (e) {
      features['ES Modules'] = '✗ 不支持';
    }

    // 检查 localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      features['localStorage'] = '✓ 支持';
    } catch (e) {
      features['localStorage'] = '✗ 不支持';
    }

    // 检查 sessionStorage
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      features['sessionStorage'] = '✓ 支持';
    } catch (e) {
      features['sessionStorage'] = '✗ 不支持';
    }

    // 解析 Chrome 版本
    const ua = navigator.userAgent;
    const chromeMatch = ua.match(/Chrome\/(\d+)/);
    if (chromeMatch) {
      info['Chrome 版本'] = chromeMatch[1];
    }

    const webkitMatch = ua.match(/WebKit\/(\d+)/);
    if (webkitMatch) {
      info['WebKit 版本'] = webkitMatch[1];
    }

    // 检查 React
    if ((window as any).React) {
      info['React'] = '已加载';
    }

    setBrowserInfo({ ...info, ...features });

    // 定期更新错误日志
    const interval = setInterval(() => {
      setErrors([...errorLogs]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        message.success('已复制到剪贴板');
      }).catch(() => {
        message.error('复制失败');
      });
    } else {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        message.success('已复制到剪贴板');
      } catch (e) {
        message.error('复制失败');
      }
      document.body.removeChild(textarea);
    }
  };

  const copyAllInfo = () => {
    const allInfo = {
      浏览器信息: browserInfo,
      错误日志: errors,
      时间: new Date().toLocaleString('zh-CN'),
    };
    copyToClipboard(JSON.stringify(allInfo, null, 2));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>调试信息</Title>
      
      <Alert
        message="调试页面"
        description="此页面显示浏览器信息和错误日志，用于排查兼容性问题"
        type="info"
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title="浏览器信息"
          extra={
            <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
              刷新
            </Button>
          }
        >
          <Descriptions column={2} bordered>
            {Object.entries(browserInfo).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                <Text code>{String(value)}</Text>
              </Descriptions.Item>
            ))}
          </Descriptions>
          <Divider />
          <Button type="primary" icon={<CopyOutlined />} onClick={copyAllInfo}>
            复制所有信息
          </Button>
        </Card>

        <Card
          title={`错误日志 (${errors.length})`}
          extra={
            <Space>
              <Button
                size="small"
                onClick={() => {
                  errorLogs.length = 0;
                  setErrors([]);
                  message.success('已清空日志');
                }}
              >
                清空日志
              </Button>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(JSON.stringify(errors, null, 2))}
              >
                复制日志
              </Button>
            </Space>
          }
        >
          {errors.length === 0 ? (
            <Alert message="暂无错误日志" type="success" />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {errors.slice().reverse().map((error, index) => (
                <Card
                  key={index}
                  size="small"
                  style={{
                    backgroundColor: error.type === 'window.error' ? '#fff2f0' : '#f6ffed',
                    borderColor: error.type === 'window.error' ? '#ffccc7' : '#b7eb8f',
                  }}
                >
                  <Paragraph style={{ margin: 0 }}>
                    <Text strong>[{error.time}]</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>{error.type}</Text>
                  </Paragraph>
                  <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    <Text>{error.message}</Text>
                  </Paragraph>
                  {error.stack && (
                    <pre
                      style={{
                        marginTop: 8,
                        padding: 8,
                        backgroundColor: '#f5f5f5',
                        borderRadius: 4,
                        fontSize: 12,
                        overflow: 'auto',
                        maxHeight: 200,
                      }}
                    >
                      {error.stack}
                    </pre>
                  )}
                </Card>
              ))}
            </Space>
          )}
        </Card>

        <Card title="如何查看控制台日志">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="方法 1: USB 调试（推荐）"
              description={
                <div>
                  <p>1. 在 Android 设备上启用 USB 调试</p>
                  <p>2. 用 USB 连接电脑</p>
                  <p>3. 在电脑 Chrome 浏览器打开: chrome://inspect</p>
                  <p>4. 点击设备下的 "inspect" 链接</p>
                </div>
              }
              type="info"
            />
            <Alert
              message="方法 2: 使用此调试页面"
              description="此页面会自动捕获并显示所有错误信息"
              type="info"
            />
            <Alert
              message="方法 3: Via 浏览器日志"
              description="Via 浏览器设置中可能有日志选项，或尝试长按页面查看源代码"
              type="info"
            />
          </Space>
        </Card>
      </Space>
    </div>
  );
}

