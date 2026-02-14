import React from 'react';
import { Card, Typography, Tag, Statistic, Row, Col, Switch, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DatabaseOutlined, CloudOutlined, AlertOutlined, TranslationOutlined } from '@ant-design/icons';
import SystemStatus from '../../components/SystemStatus';
import { PresencePanel } from '../../components/PresencePanel';
import { useSystemStore } from '../../store/systemStore';

const { Title } = Typography;

const SystemModule: React.FC = () => {
  // 占位系统状态数据
  const systemStatus = {
    workerOnline: true,
    kvStatus: 'healthy',
    r2Status: 'healthy',
    recentErrors: 0,
    workerVersion: 'v1.0.0',
    uptime: '24h 30m',
  };

  // 获取自动翻译状态和设置方法
  const { autoTranslate, setAutoTranslate } = useSystemStore();

  return (
    <div className="h-full bg-white p-4 rounded-lg shadow">
      <Title level={4} className="mb-4">系统状态</Title>
      
      <SystemStatus />
      
      <Row gutter={[16, 16]} className="mt-4">
        <Col span={12}>
          <Card>
            <Statistic
              title="Worker 状态"
              value={systemStatus.workerOnline ? '在线' : '离线'}
              valueStyle={{ color: systemStatus.workerOnline ? '#52c41a' : '#ff4d4f' }}
              prefix={systemStatus.workerOnline ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
            <div className="mt-2 text-sm text-gray-500">
              版本: {systemStatus.workerVersion}
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card>
            <Statistic
              title="运行时间"
              value={systemStatus.uptime}
              prefix={<CloudOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} className="mt-4">
        <Col span={12}>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">KV 存储</div>
                <div className="mt-1">
                  <Tag color={systemStatus.kvStatus === 'healthy' ? 'green' : 'red'}>
                    {systemStatus.kvStatus}
                  </Tag>
                </div>
              </div>
              <DatabaseOutlined className="text-2xl text-gray-400" />
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">R2 存储</div>
                <div className="mt-1">
                  <Tag color={systemStatus.r2Status === 'healthy' ? 'green' : 'red'}>
                    {systemStatus.r2Status}
                  </Tag>
                </div>
              </div>
              <CloudOutlined className="text-2xl text-gray-400" />
            </div>
          </Card>
        </Col>
      </Row>
      
      <Card className="mt-4">
        <Statistic
          title="最近错误数"
          value={systemStatus.recentErrors}
          prefix={<AlertOutlined />}
          valueStyle={{ color: systemStatus.recentErrors > 0 ? '#faad14' : '#52c41a' }}
        />
      </Card>
      
      {/* 自动翻译开关 */}
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <TranslationOutlined className="mr-2 text-blue-500" />
              <span className="text-sm font-medium">自动翻译客户消息</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">使用 DeepSeek 自动翻译客户发送的消息</div>
          </div>
          <Tooltip title={autoTranslate ? '已开启自动翻译' : '点击开启自动翻译'}>
            <Switch
              checked={autoTranslate}
              onChange={setAutoTranslate}
              checkedChildren={<CheckCircleOutlined />}
              unCheckedChildren={<CloseCircleOutlined />}
              size="default"
            />
          </Tooltip>
        </div>
      </Card>
      
      {/* Presence Radar */}
      <Card className="mt-4">
        <PresencePanel />
      </Card>
    </div>
  );
};

export default SystemModule;
