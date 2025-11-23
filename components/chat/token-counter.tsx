'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Hash, AlertCircle, AlertTriangle, XCircle, Trash2, Info } from 'lucide-react';
import {
  calculateTokenUsage,
  getWarningMessage,
  getWarningColorClass,
  getProgressColorClass,
  formatTokenCount,
  type TokenUsage,
  type TokenCountConfig,
} from '@/lib/utils/token-counter';
import { cn } from '@/lib/utils';

/**
 * TokenCounter 组件 Props
 */
interface TokenCounterProps {
  /** 已使用的 token 数量 */
  usedTokens: number;
  /** Token 配置 */
  config?: TokenCountConfig;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 是否显示警告信息 */
  showWarning?: boolean;
  /** 是否显示清理建议 */
  showCleanupSuggestion?: boolean;
  /** 清理回调（删除旧消息） */
  onCleanup?: () => void;
  /** 额外的类名 */
  className?: string;
  /** 紧凑模式 */
  compact?: boolean;
}

/**
 * 警告图标组件
 */
function WarningIcon({ level }: { level: TokenUsage['warningLevel'] }) {
  switch (level) {
    case 'exceeded':
      return <XCircle className="h-4 w-4" />;
    case 'critical':
      return <AlertTriangle className="h-4 w-4" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

/**
 * Token 计数器组件
 * 
 * 显示当前对话的 token 使用情况，包括：
 * - 总 token 数和限制
 * - 使用百分比
 * - 进度条
 * - 警告信息（当接近或超过限制时）
 * - 清理建议
 */
export function TokenCounter({
  usedTokens,
  config,
  showDetails = true,
  showWarning = true,
  showCleanupSuggestion = true,
  onCleanup,
  className,
  compact = false,
}: TokenCounterProps) {
  // 计算 token 使用情况
  const usage = useMemo(
    () => calculateTokenUsage(usedTokens, config),
    [usedTokens, config]
  );

  // 获取警告消息
  const warningMessage = useMemo(
    () => getWarningMessage(usage),
    [usage]
  );

  // 是否显示清理按钮
  const shouldShowCleanup = showCleanupSuggestion && 
    onCleanup && 
    (usage.warningLevel === 'warning' || 
     usage.warningLevel === 'critical' || 
     usage.warningLevel === 'exceeded');

  // 紧凑模式渲染
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2', className)}>
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className={cn('text-sm font-medium', getWarningColorClass(usage.warningLevel))}>
                {formatTokenCount(usage.used)} / {formatTokenCount(usage.limit)}
              </span>
              {usage.warningLevel !== 'safe' && (
                <WarningIcon level={usage.warningLevel} />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">Token 使用情况</p>
              <p className="text-xs">已使用: {usage.used.toLocaleString()}</p>
              <p className="text-xs">限制: {usage.limit.toLocaleString()}</p>
              <p className="text-xs">剩余: {usage.remaining.toLocaleString()}</p>
              <p className="text-xs">使用率: {usage.percentage.toFixed(1)}%</p>
              {warningMessage && (
                <p className="text-xs text-amber-500 mt-2">{warningMessage}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 完整模式渲染
  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        {/* 标题和统计 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Token 使用</span>
          </div>
          <Badge
            variant={usage.warningLevel === 'safe' ? 'default' : 'destructive'}
            className={cn(
              usage.warningLevel === 'warning' && 'bg-yellow-500 hover:bg-yellow-600',
              usage.warningLevel === 'critical' && 'bg-orange-500 hover:bg-orange-600'
            )}
          >
            {usage.percentage.toFixed(1)}%
          </Badge>
        </div>

        {/* 进度条 */}
        <div className="space-y-1">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                getProgressColorClass(usage.warningLevel)
              )}
              style={{ width: `${Math.min(100, usage.percentage)}%` }}
            />
          </div>
          
          {showDetails && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTokenCount(usage.used)} 已使用</span>
              <span>{formatTokenCount(usage.remaining)} 剩余</span>
            </div>
          )}
        </div>

        {/* 详细信息 */}
        {showDetails && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-muted-foreground">已使用</div>
              <div className="font-medium">{usage.used.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">限制</div>
              <div className="font-medium">{usage.limit.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">剩余</div>
              <div className="font-medium">{usage.remaining.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* 警告信息 */}
        {showWarning && warningMessage && (
          <Alert
            variant={usage.warningLevel === 'exceeded' ? 'destructive' : 'default'}
            className={cn(
              usage.warningLevel === 'warning' && 'border-yellow-500 text-yellow-700 dark:text-yellow-400',
              usage.warningLevel === 'critical' && 'border-orange-500 text-orange-700 dark:text-orange-400'
            )}
          >
            <WarningIcon level={usage.warningLevel} />
            <AlertDescription className="text-sm">
              {warningMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* 清理建议 */}
        {shouldShowCleanup && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onCleanup}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清理旧消息
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 内联 Token 计数器组件
 * 用于在输入框或消息气泡中显示 token 数
 */
interface InlineTokenCounterProps {
  tokenCount: number;
  className?: string;
  showIcon?: boolean;
}

export function InlineTokenCounter({
  tokenCount,
  className,
  showIcon = true,
}: InlineTokenCounterProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      {showIcon && <Hash className="h-3 w-3" />}
      {formatTokenCount(tokenCount)} tokens
    </span>
  );
}

/**
 * Token 使用情况摘要组件
 * 用于在页面顶部或侧边栏显示简要信息
 */
interface TokenUsageSummaryProps {
  usedTokens: number;
  config?: TokenCountConfig;
  onClick?: () => void;
  className?: string;
}

export function TokenUsageSummary({
  usedTokens,
  config,
  onClick,
  className,
}: TokenUsageSummaryProps) {
  const usage = useMemo(
    () => calculateTokenUsage(usedTokens, config),
    [usedTokens, config]
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md',
        'hover:bg-accent transition-colors',
        'text-sm',
        className
      )}
    >
      <Hash className="h-4 w-4 text-muted-foreground" />
      <span className={getWarningColorClass(usage.warningLevel)}>
        {formatTokenCount(usage.used)}
      </span>
      <span className="text-muted-foreground">/</span>
      <span className="text-muted-foreground">
        {formatTokenCount(usage.limit)}
      </span>
      {usage.warningLevel !== 'safe' && (
        <WarningIcon level={usage.warningLevel} />
      )}
    </button>
  );
}