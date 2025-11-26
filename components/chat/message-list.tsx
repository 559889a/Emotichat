'use client';

import { useEffect, useRef, useState } from 'react';
import { Message } from '@/types';
import { MessageBubble } from './message-bubble';
import { cn } from '@/lib/utils';
import { useScrollControls, useStreamMetrics } from '@/hooks/useMessageListBehavior';

interface MessageListProps {
  messages: Message[];
  conversationId?: string;
  characterName?: string;
  characterAvatar?: string;
  loading?: boolean;
  isStreaming?: boolean;
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onEditAssistant?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onDeleteFollowing?: (messageId: string) => void;
  onVersionChange?: (messageId: string, versionId: string) => void;
}

function SpinnerAnimation() {
  return (
    <div className="relative h-5 w-5">
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-500 border-r-purple-500 animate-spin" />
      <div className="absolute inset-1 rounded-full border border-transparent border-b-indigo-400 border-l-pink-400 animate-spin [animation-direction:reverse] [animation-duration:0.8s]" />
      <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-pink-500 to-purple-500 animate-pulse" />
    </div>
  );
}

function LoadingTimer({
  isLoading,
  startTime,
}: {
  isLoading: boolean;
  startTime: number | null;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading && startTime !== null) {
      setElapsedTime((performance.now() - startTime) / 1000);

      intervalRef.current = setInterval(() => {
        setElapsedTime((performance.now() - startTime) / 1000);
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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

  return <span className={cn('tabular-nums', isLoading && 'animate-pulse')}>{formatTime(elapsedTime)}</span>;
}

export function MessageList({
  messages,
  conversationId,
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
  const { scrollContainerRef, bottomRef } = useScrollControls();
  const {
    loadingStartTime,
    lastStreamedMessageIndex,
    lastStreamedTime,
    lastStreamedTokenCount,
  } = useStreamMetrics(messages, loading);

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
          const isWelcomeMessage = index === 0 || message.id === 'welcome-message';
          const isLastMessage = index === messages.length - 1;
          const isStreamingMessage = loading && isLastMessage && message.role === 'assistant';

          const recordedResponseTime =
            message.role === 'assistant' &&
            index === lastStreamedMessageIndex &&
            lastStreamedTime !== null
              ? lastStreamedTime
              : undefined;

          const recordedTokenCount =
            message.role === 'assistant' &&
            index === lastStreamedMessageIndex &&
            lastStreamedTokenCount !== null
              ? lastStreamedTokenCount
              : undefined;

          return (
            <MessageBubble
              key={message.id}
              message={message}
              messageIndex={index}
              conversationId={conversationId}
              characterName={message.role === 'assistant' ? characterName : undefined}
              characterAvatar={message.role === 'assistant' ? characterAvatar : undefined}
              isStreaming={isStreamingMessage}
              streamingStartTime={isStreamingMessage ? loadingStartTime : null}
              recordedResponseTime={recordedResponseTime}
              recordedTokenCount={recordedTokenCount}
              onRegenerate={
                onRetry && !isWelcomeMessage ? () => onRetry(message.id) : undefined
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
                onDelete && !isWelcomeMessage ? () => onDelete(message.id) : undefined
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
          );
        })}

        {loading && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant') && (
          <div className="group relative mb-3 pr-8 md:pr-16 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative rounded-2xl overflow-hidden border shadow-sm bg-card/80 border-border/50 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs border-b bg-muted/30 border-border/30 dark:bg-zinc-800/30">
                <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  #{messages.length + 1}
                </span>
                <span
                  className={cn(
                    'font-mono text-[10px] px-1.5 py-0.5 rounded',
                    'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-600 dark:text-pink-400'
                  )}
                >
                  <LoadingTimer isLoading={loading} startTime={loadingStartTime} />
                </span>
                <span
                  className={cn(
                    'font-mono text-[10px] px-1.5 py-0.5 rounded animate-pulse',
                    'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400'
                  )}
                >
                  ~0t
                </span>
                <span className="text-border">|</span>
                <span className="font-medium text-foreground/90">{characterName || 'AI'}</span>
              </div>

              <div className="px-3 py-3 sm:px-4">
                <div className="flex items-center gap-3">
                  <SpinnerAnimation />
                  <span className="text-sm text-muted-foreground">
                    {isStreaming ? '思考中...' : '等待响应...'}
                  </span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-b-2xl animate-pulse" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
