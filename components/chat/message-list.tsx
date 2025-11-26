'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Message } from '@/types';
import { MessageBubble } from './message-bubble';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  characterName?: string;
  characterAvatar?: string;
  loading?: boolean;
  isStreaming?: boolean; // 区分流式和非流式输出
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onEditAssistant?: (messageId: string, content: string) => void; // AI 消息编辑（不触发重新生成）
  onDelete?: (messageId: string) => void;
  onDeleteFollowing?: (messageId: string) => void;
  onVersionChange?: (messageId: string, versionId: string) => void;
}

/**
 * Claude 风格的旋转加载动画组件
 */
function SpinnerAnimation() {
  return (
    <div className="relative h-5 w-5">
      {/* 外圈 - 渐变旋转 */}
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-500 border-r-purple-500 animate-spin" />
      {/* 内圈 - 反向旋转 */}
      <div className="absolute inset-1 rounded-full border border-transparent border-b-indigo-400 border-l-pink-400 animate-spin [animation-direction:reverse] [animation-duration:0.8s]" />
      {/* 中心点 */}
      <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-pink-500 to-purple-500 animate-pulse" />
    </div>
  );
}

/**
 * 加载计时器组件 - 支持外部传入开始时间
 */
function LoadingTimer({
  isLoading,
  startTime
}: {
  isLoading: boolean;
  startTime: number | null;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading && startTime !== null) {
      // 立即计算一次
      setElapsedTime((performance.now() - startTime) / 1000);

      intervalRef.current = setInterval(() => {
        setElapsedTime((performance.now() - startTime) / 1000);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoading, startTime]);

  const formatTime = (seconds: number): string => {
    if (seconds < 0.1) return '0.0s';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs.toFixed(0)}s`;
  };

  return (
    <span className={cn("tabular-nums", isLoading && "animate-pulse")}>
      {formatTime(elapsedTime)}
    </span>
  );
}

export function MessageList({
  messages,
  characterName,
  characterAvatar,
  loading = false,
  isStreaming = false,
  onRetry,
  onEdit,
  onEditAssistant,
  onDelete,
  onDeleteFollowing,
  onVersionChange,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  // 记录 loading 开始的时间戳，用于跨 loading 容器和消息气泡共享计时
  // 使用 useState 确保组件能正确响应变化
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(
    loading ? performance.now() : null
  );

  // 记录最后一条流式消息的最终用时和 token 数
  // 使用消息索引而不是 ID，因为 ID 可能在服务器返回后变化
  const [lastStreamedMessageIndex, setLastStreamedMessageIndex] = useState<number | null>(null);
  const [lastStreamedTime, setLastStreamedTime] = useState<number | null>(null);
  const [lastStreamedTokenCount, setLastStreamedTokenCount] = useState<number | null>(null);

  // 当 loading 开始时记录时间
  useEffect(() => {
    if (loading && loadingStartTime === null) {
      setLoadingStartTime(performance.now());
    } else if (!loading && loadingStartTime !== null) {
      // loading 结束时，记录最后一条 AI 消息的用时和 token 估算
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        const finalTime = (performance.now() - loadingStartTime) / 1000;
        // 使用实际 tokenCount 或估算值
        const tokenCount = lastMessage.tokenCount || Math.ceil(lastMessage.content.length / 3);
        setLastStreamedMessageIndex(messages.length - 1);
        setLastStreamedTime(finalTime);
        setLastStreamedTokenCount(tokenCount);
      }
      setLoadingStartTime(null);
    }
  }, [loading, loadingStartTime, messages]);

  // 滚动到底部 - 使用 scrollIntoView 确保可靠
  const scrollToBottom = useCallback((smooth = false) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  }, []);

  // 检查是否在底部附近
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  // 监听用户滚动，判断是否主动向上滚动
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      // 如果用户向上滚动超过 50px，认为是主动滚动
      if (lastScrollTopRef.current - currentScrollTop > 50) {
        userScrolledRef.current = true;
      }
      // 如果滚动到底部附近，重置标记
      if (isNearBottom()) {
        userScrolledRef.current = false;
      }
      lastScrollTopRef.current = currentScrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  // 消息变化时滚动到底部 - 已禁用自动滚动
  // useEffect(() => {
  //   if (!userScrolledRef.current) {
  //     requestAnimationFrame(() => {
  //       requestAnimationFrame(() => {
  //         scrollToBottom(false);
  //       });
  //     });
  //   }
  // }, [messages, scrollToBottom]);

  // loading 变化时滚动到底部 - 已禁用自动滚动
  // useEffect(() => {
  //   if (loading && !userScrolledRef.current) {
  //     requestAnimationFrame(() => {
  //       scrollToBottom(false);
  //     });
  //   }
  // }, [loading, scrollToBottom]);

  if (messages.length === 0 && !loading) {
    return null;
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto overflow-x-hidden px-2 sm:px-3 md:px-4"
    >
      <div className="max-w-4xl mx-auto py-4 sm:py-6 space-y-1">
        {messages.map((message, index) => {
          // 第一条消息或 ID 为 'welcome-message' 的消息不显示操作按钮
          const isWelcomeMessage = index === 0 || message.id === 'welcome-message'
          // 判断是否是正在流式输出的最后一条 AI 消息
          const isLastMessage = index === messages.length - 1
          const isStreamingMessage = loading && isLastMessage && message.role === 'assistant'
          // 获取已记录的响应时间（用于已完成流式输出的消息）
          // 使用索引匹配，因为消息 ID 可能在服务器返回后变化
          const recordedResponseTime = (
            message.role === 'assistant' &&
            index === lastStreamedMessageIndex &&
            lastStreamedTime !== null
          ) ? lastStreamedTime : undefined

          // 获取已记录的 token 数（用于已完成流式输出的消息）
          const recordedTokenCount = (
            message.role === 'assistant' &&
            index === lastStreamedMessageIndex &&
            lastStreamedTokenCount !== null
          ) ? lastStreamedTokenCount : undefined

          return (
            <MessageBubble
              key={message.id}
              message={message}
              messageIndex={index}
              characterName={message.role === 'assistant' ? characterName : undefined}
              characterAvatar={message.role === 'assistant' ? characterAvatar : undefined}
              isStreaming={isStreamingMessage}
              streamingStartTime={isStreamingMessage ? loadingStartTime : null}
              recordedResponseTime={recordedResponseTime}
              recordedTokenCount={recordedTokenCount}
              onRegenerate={
                onRetry && !isWelcomeMessage
                  ? () => onRetry(message.id)
                  : undefined
              }
              onEdit={
                message.role === 'user' && onEdit && !isWelcomeMessage
                  ? (content: string) => onEdit(message.id, content)
                  : undefined
              }
              onEditAssistant={
                message.role === 'assistant' && onEditAssistant && !isWelcomeMessage
                  ? (content: string) => onEditAssistant(message.id, content)
                  : undefined
              }
              onDelete={
                onDelete && !isWelcomeMessage
                  ? () => onDelete(message.id)
                  : undefined
              }
              onDeleteFollowing={
                onDeleteFollowing && !isWelcomeMessage
                  ? () => onDeleteFollowing(message.id)
                  : undefined
              }
              onVersionChange={
                onVersionChange
                  ? (versionId: string) => onVersionChange(message.id, versionId)
                  : undefined
              }
            />
          )
        })}

        {/* 加载中容器 - 只在 AI 消息还没开始时显示 */}
        {loading && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant') && (
          <div className="group relative mb-3 pr-8 md:pr-16 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative rounded-2xl overflow-hidden border shadow-sm bg-card/80 border-border/50 dark:bg-zinc-900/80">
              {/* 顶部信息栏 */}
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs border-b bg-muted/30 border-border/30 dark:bg-zinc-800/30">
                <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  #{messages.length + 1}
                </span>
                <span className={cn(
                  "font-mono text-[10px] px-1.5 py-0.5 rounded",
                  "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-600 dark:text-pink-400"
                )}>
                  <LoadingTimer isLoading={loading} startTime={loadingStartTime} />
                </span>
                <span className={cn(
                  "font-mono text-[10px] px-1.5 py-0.5 rounded animate-pulse",
                  "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400"
                )}>
                  ~0t
                </span>
                <span className="text-border">·</span>
                <span className="font-medium text-foreground/90">{characterName || 'AI'}</span>
              </div>

              {/* 加载动画 */}
              <div className="px-3 py-3 sm:px-4">
                <div className="flex items-center gap-3">
                  <SpinnerAnimation />
                  <span className="text-sm text-muted-foreground">
                    {isStreaming ? '思考中...' : '等待响应...'}
                  </span>
                </div>
              </div>

              {/* 底部渐变指示器 */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-b-2xl animate-pulse" />
            </div>
          </div>
        )}

        {/* 滚动锚点 */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}