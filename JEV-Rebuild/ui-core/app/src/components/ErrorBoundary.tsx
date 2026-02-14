import React, { Component, type ReactNode } from 'react';
import { Card, Typography, Button } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat module error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error info:', errorInfo);
    console.error('Error component stack:', errorInfo.componentStack);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <WarningOutlined className="text-red-500 text-3xl mb-4" />
            <Title level={4} className="mb-2">聊天模块异常</Title>
            <Text className="text-gray-600 mb-4">
              聊天模块出现错误，已自动隔离，不影响其他功能
            </Text>
            {this.state.error && (
              <div className="mb-4 p-3 bg-gray-50 rounded text-left text-sm text-gray-700 max-h-40 overflow-y-auto">
                <Text className="font-medium block mb-1">错误详情：</Text>
                <pre className="whitespace-pre-wrap">{this.state.error.message}</pre>
              </div>
            )}
            <Button type="primary" onClick={this.resetErrorBoundary}>
              重试
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;