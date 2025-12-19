import React from 'react';
import { Card, Table, Tag, Button, Space, Typography } from 'antd';
import styles from './OrdersPanel.module.css';

const { Title } = Typography;

const OrdersPanel = ({ customer }) => {
  // 添加防御性检查
  if (!customer) {
    return (
      <Card className={styles.ordersPanel} styles={{ body: { padding: '24px', textAlign: 'center' } }}>
        <h3>请选择一个客户</h3>
        <p>从左侧客户列表中选择一个客户查看 PI / 订单信息</p>
      </Card>
    );
  }

  const orderData = [
    {
      id: 'PI-2024-001',
      type: 'PI',
      customer: customer.name,
      date: '2024-01-10',
      amount: 50000,
      currency: 'USD',
      status: 'pending',
      items: 3
    },
    {
      id: 'ORDER-2023-123',
      type: 'Order',
      customer: customer.name,
      date: '2023-12-15',
      amount: 35000,
      currency: 'USD',
      status: 'shipped',
      items: 2
    },
    {
      id: 'PI-2023-098',
      type: 'PI',
      customer: customer.name,
      date: '2023-11-20',
      amount: 28000,
      currency: 'USD',
      status: 'accepted',
      items: 1
    },
    {
      id: 'ORDER-2023-076',
      type: 'Order',
      customer: customer.name,
      date: '2023-10-05',
      amount: 42000,
      currency: 'USD',
      status: 'delivered',
      items: 4
    }
  ];

  const getStatusTag = (status) => {
    switch (status) {
      case 'pending':
        return <Tag color="orange">待确认</Tag>;
      case 'accepted':
        return <Tag color="blue">已接受</Tag>;
      case 'processing':
        return <Tag color="purple">处理中</Tag>;
      case 'shipped':
        return <Tag color="green">已发货</Tag>;
      case 'delivered':
        return <Tag color="success">已交付</Tag>;
      case 'cancelled':
        return <Tag color="red">已取消</Tag>;
      default:
        return <Tag color="gray">未知</Tag>;
    }
  };

  const getTypeTag = (type) => {
    return type === 'PI' ? 
      <Tag color="blue">形式发票</Tag> : 
      <Tag color="green">正式订单</Tag>;
  };

  const columns = [
    {
      title: '单据编号',
      dataIndex: 'id',
      key: 'id',
      render: (text, record) => (
        <Space>
          {getTypeTag(record.type)}
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120
    },
    {
      title: '金额',
      dataIndex: ['amount', 'currency'],
      key: 'amount',
      render: (_, record) => (
        <strong>{record.currency} {record.amount.toLocaleString()}</strong>
      ),
      width: 150
    },
    {
      title: '商品数量',
      dataIndex: 'items',
      key: 'items',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
      width: 120
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="primary">查看</Button>
          <Button size="small">编辑</Button>
        </Space>
      ),
      width: 150
    }
  ];

  return (
    <Card className={styles.ordersPanel} styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}>
      <div className={styles.header}>
        <Title level={5} style={{ margin: 0 }}>
          {customer.name} 的 PI / 订单
        </Title>
        <Button type="primary" size="small">
          创建新 PI
        </Button>
      </div>
      <Table
        dataSource={orderData}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        className={styles.orderTable}
      />
    </Card>
  );
};

export default OrdersPanel;
