'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary 组件
 * 用于优雅地处理 UI 错误，防止整个应用崩溃
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary 捕获到错误:', error);
      console.error('错误详情:', errorInfo);
    }

    // 生产环境仅记录基本信息
    console.error('应用错误:', error.message);

    // 更新 state 以存储错误信息
    this.setState({
      errorInfo,
    });

    // TODO: 可选 - 将错误发送到服务端日志系统
    // this.logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    const { onReset } = this.props;
    
    // 重置错误状态
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // 调用自定义重置回调
    if (onReset) {
      onReset();
    }
  };

  handleGoHome = (): void => {
    // 重置状态并导航到首页
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      // 如果提供了自定义 fallback，使用它
      if (fallback) {
        return fallback;
      }

      // 默认错误 UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card p-8 shadow-lg">
            {/* 错误图标 */}
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>

            {/* 错误标题 */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">
                糟糕，出错了
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                应用遇到了一个意外错误
              </p>
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  错误详情：
                </p>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-mono text-foreground break-words">
                    {error.message}
                  </p>
                </div>
              </div>
            )}

            {/* 开发环境显示详细堆栈信息 */}
            {(showDetails || process.env.NODE_ENV === 'development') && errorInfo && (
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  查看技术详情
                </summary>
                <div className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3">
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                重试
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            </div>

            {/* 帮助提示 */}
            <p className="text-center text-xs text-muted-foreground">
              如果问题持续存在，请尝试刷新页面或联系技术支持
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;