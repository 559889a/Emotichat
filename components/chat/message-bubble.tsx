'use client';

import { Message } from '@/types';
import { useState, memo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './markdown-renderer';
import { MessageActions } from './message-actions';
import { MessageEditor } from './message-editor';
import { VersionSelector } from './version-selector';

/**
 * 响应计时器组件
 * 接收外部传入的开始时间，确保计时器在 loading 容器和消息气泡之间连续
 * 也可以直接显示已记录的最终时间
 */
const ResponseTimer = memo(function ResponseTimer({
  isStreaming,
  startTime,
  recordedTime,
}: {
  isStreaming: boolean;
  startTime: number | null;
  recordedTime?: number;
}) {
  const [elapsedTime, setElapsedTime] = useState(recordedTime ?? 0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // 使用传入的 startTime 或者组件挂载时间作为备用
  const effectiveStartTime = useRef<number>(startTime ?? performance.now());

  // 如果传入了 startTime，更新 effectiveStartTime
  useEffect(() => {
    if (startTime !== null) {
      effectiveStartTime.current = startTime;
    }
  }, [startTime]);

  useEffect(() => {
    // 如果有已记录的时间，直接显示
    if (recordedTime !== undefined) {
      setElapsedTime(recordedTime);
      return;
    }

    if (isStreaming) {
      // 立即计算一次
      setElapsedTime((performance.now() - effectiveStartTime.current) / 1000);

      // 流式进行中，持续更新时间
      intervalRef.current = setInterval(() => {
        const elapsed = (performance.now() - effectiveStartTime.current) / 1000;
        setElapsedTime(elapsed);
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isStreaming, recordedTime]);

  const formatTime = (seconds: number): string => {
    if (seconds < 0.1) return '0.0s';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs.toFixed(0)}s`;
  };

  return (
    <span className={cn(
      "font-mono text-[10px] px-1.5 py-0.5 rounded",
      isStreaming
        ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-600 dark:text-pink-400"
        : "bg-muted/50 text-muted-foreground"
    )}>
      {formatTime(elapsedTime)}
    </span>
  );
});

/**
 * 平滑流式内容组件
 */
const SmoothStreamingContent = memo(function SmoothStreamingContent({
  content,
  isStreaming,
  className,
  thinkingTagPrepend,
  thinkingTagAppend,
  disableThinkingBlocks,
}: {
  content: string;
  isStreaming?: boolean;
  className?: string;
  thinkingTagPrepend?: string;
  thinkingTagAppend?: string;
  disableThinkingBlocks?: boolean;
}) {
  const [displayedContent, setDisplayedContent] = useState(content);
  const bufferRef = useRef<string[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const prevContentLengthRef = useRef<number>(0);

  const MIN_INTERVAL = 20;
  const CHARS_PER_FRAME = 5;

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      bufferRef.current = [];
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const newContentStart = prevContentLengthRef.current;
    const newContent = content.slice(newContentStart);
    prevContentLengthRef.current = content.length;

    if (newContent.length > 0) {
      bufferRef.current.push(...newContent.split(''));
    }

    if (animationRef.current !== null) return;

    const processBuffer = () => {
      const now = performance.now();

      if (now - lastUpdateRef.current < MIN_INTERVAL) {
        animationRef.current = requestAnimationFrame(processBuffer);
        return;
      }

      if (bufferRef.current.length > 0) {
        const adaptiveChars = Math.max(
          CHARS_PER_FRAME,
          Math.floor(bufferRef.current.length / 3)
        );
        const charsToAdd = Math.min(adaptiveChars, bufferRef.current.length);
        const newChars = bufferRef.current.splice(0, charsToAdd).join('');

        setDisplayedContent((prev) => prev + newChars);
        lastUpdateRef.current = now;

        if (bufferRef.current.length > 0) {
          animationRef.current = requestAnimationFrame(processBuffer);
        } else {
          animationRef.current = null;
        }
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(processBuffer);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [content, isStreaming]);

  useEffect(() => {
    if (!isStreaming && displayedContent !== content) {
      bufferRef.current = [];
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setDisplayedContent(content);
      prevContentLengthRef.current = content.length;
    }
  }, [isStreaming, content, displayedContent]);

  useEffect(() => {
    if (content.length < displayedContent.length) {
      bufferRef.current = [];
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setDisplayedContent(content);
      prevContentLengthRef.current = content.length;
    }
  }, [content, displayedContent]);

  return (
    <div className={cn("transition-opacity duration-100", className)}>
      <MarkdownRenderer
        content={displayedContent}
        thinkingTagPrepend={thinkingTagPrepend}
        thinkingTagAppend={thinkingTagAppend}
        disableThinkingBlocks={disableThinkingBlocks}
      />
      {isStreaming && displayedContent.length > 0 && (
        <span className="inline-block w-0.5 h-4 bg-gradient-to-b from-pink-500 to-purple-500 animate-pulse ml-0.5 align-middle rounded-full" />
      )}
    </div>
  );
});

interface MessageBubbleProps {
  message: Message;
  messageIndex?: number;
  characterName?: string;
  characterAvatar?: string;
  isStreaming?: boolean;
  streamingStartTime?: number | null; // 流式输出开始时间，用于计时器
  recordedResponseTime?: number; // 已记录的响应时间（用于已完成的消息）
  recordedTokenCount?: number; // 已记录的 token 数（用于已完成的消息）
  onEdit?: (content: string) => void;           // 用户消息编辑（触发重新生成）
  onEditAssistant?: (content: string) => void;  // AI 消息编辑（不触发重新生成）
  onRegenerate?: () => void;
  onDelete?: () => void;
  onDeleteFollowing?: () => void;
  onCopy?: () => void;
  onVersionChange?: (versionId: string) => void;
  onCreateBranch?: () => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  messageIndex,
  characterName,
  characterAvatar,
  isStreaming = false,
  streamingStartTime = null,
  recordedResponseTime,
  recordedTokenCount,
  onEdit,
  onEditAssistant,
  onRegenerate,
  onDelete,
  onDeleteFollowing,
  onCopy,
  onVersionChange,
  onCreateBranch,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  // 保存流式开始时间，即使 prop 后来变为 null 也保持
  const savedStartTimeRef = useRef<number | null>(streamingStartTime);

  // 当流式开始时保存开始时间
  useEffect(() => {
    if (streamingStartTime !== null && savedStartTimeRef.current === null) {
      savedStartTimeRef.current = streamingStartTime;
    }
  }, [streamingStartTime]);

  // 判断是否应该显示计时器：正在流式 或 有已记录的响应时间
  const shouldShowTimer = isStreaming || recordedResponseTime !== undefined;

  const handleEdit = () => setIsEditing(true);
  const handleEditAssistant = () => setIsEditing(true);
  const handleSaveEdit = (content: string) => {
    if (isUser) {
      // 用户消息编辑（触发重新生成）
      onEdit?.(content);
    } else {
      // AI 消息编辑（不触发重新生成）
      onEditAssistant?.(content);
    }
    setIsEditing(false);
  };
  const handleCancelEdit = () => setIsEditing(false);
  const handleVersionChange = (versionId: string) => onVersionChange?.(versionId);

  const currentVersionId = message.versions?.find(v => v.isActive)?.id ||
    (message.versions && message.versions.length > 0 ? message.versions[message.versions.length - 1].id : '');

  // 格式化时间戳
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const isUser = message.role === 'user';
  const floorNumber = (messageIndex ?? 0) + 1;

  // 获取模型简称
  const getModelBadge = (model: string) => {
    if (model.includes('gpt-4')) return 'GPT-4';
    if (model.includes('gpt-3')) return 'GPT-3.5';
    if (model.includes('claude-3-opus')) return 'Opus';
    if (model.includes('claude-3-sonnet')) return 'Sonnet';
    if (model.includes('claude-3-haiku')) return 'Haiku';
    if (model.includes('claude')) return 'Claude';
    if (model.includes('gemini-pro')) return 'Gemini';
    if (model.includes('gemini')) return 'Gemini';
    return model.split('/').pop()?.split('-')[0] || 'AI';
  };

  return (
    <div className={cn(
      "group relative mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isUser ? "pl-8 md:pl-16" : "pr-8 md:pr-16"
    )}>
      {/* 消息主体 */}
      <div className={cn(
        "relative rounded-2xl overflow-hidden",
        "border shadow-sm transition-shadow duration-200",
        isUser
          ? "bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20 dark:from-primary/10 dark:via-primary/5"
          : "bg-card/80 border-border/50 dark:bg-zinc-900/80 hover:shadow-md"
      )}>
        {/* 顶部信息栏 */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-xs",
          "border-b transition-colors",
          isUser
            ? "bg-primary/5 border-primary/10 dark:bg-primary/10"
            : "bg-muted/30 border-border/30 dark:bg-zinc-800/30"
        )}>
          {/* 左侧信息 */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* 楼层号 */}
            <span className={cn(
              "font-mono text-[10px] font-medium px-1.5 py-0.5 rounded",
              isUser
                ? "bg-primary/10 text-primary dark:bg-primary/20"
                : "bg-muted text-muted-foreground"
            )}>
              #{floorNumber}
            </span>

            {/* AI消息显示计时器 - 流式输出中或有记录的响应时间时显示 */}
            {!isUser && shouldShowTimer && (
              <ResponseTimer
                key={`timer-${message.id}`}
                isStreaming={isStreaming}
                startTime={savedStartTimeRef.current}
                recordedTime={recordedResponseTime}
              />
            )}

            {/* Token数 - 与计时器保持一致的视觉风格 */}
            {!isUser && (message.tokenCount || isStreaming || recordedTokenCount !== undefined) && (
              <span className={cn(
                "font-mono text-[10px] px-1.5 py-0.5 rounded",
                isStreaming
                  ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 animate-pulse"
                  : "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400"
              )}>
                {isStreaming
                  ? `~${Math.ceil(message.content.length / 3)}t`
                  : `${message.tokenCount ?? recordedTokenCount}t`
                }
              </span>
            )}

            {/* 分隔符 */}
            <span className="text-border">·</span>

            {/* 角色名/用户标识 */}
            <span className={cn(
              "font-medium truncate",
              isUser
                ? "text-primary dark:text-primary"
                : "text-foreground/90"
            )}>
              {isUser ? '你' : (characterName || 'AI')}
            </span>

            {/* 模型标签 */}
            {!isUser && message.model && (
              <span className={cn(
                "hidden sm:inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                "bg-gradient-to-r from-pink-500/10 to-purple-500/10",
                "text-pink-600 dark:text-pink-400",
                "border border-pink-500/20"
              )}>
                {getModelBadge(message.model)}
              </span>
            )}

            {/* 时间戳 */}
            {message.createdAt && (
              <span className="text-muted-foreground/60 hidden sm:inline">
                {formatTimestamp(message.createdAt)}
              </span>
            )}
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex items-center shrink-0">
            <MessageActions
              message={message}
              onEdit={isUser && onEdit ? handleEdit : undefined}
              onEditAssistant={!isUser && onEditAssistant ? handleEditAssistant : undefined}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              onDeleteFollowing={onDeleteFollowing}
              onCopy={onCopy}
              onCreateBranch={onCreateBranch}
            />
          </div>
        </div>

        {/* 消息内容 */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3">
          {isEditing ? (
            <MessageEditor
              initialContent={message.content}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          ) : (
            <div className="overflow-hidden text-sm leading-relaxed">
              {isStreaming ? (
                <SmoothStreamingContent
                  content={message.content}
                  isStreaming={isStreaming}
                  // 思维链标签和折叠功能只对 AI 消息生效
                  thinkingTagPrepend={!isUser ? message.thinkingTagPrepend : undefined}
                  thinkingTagAppend={!isUser ? message.thinkingTagAppend : undefined}
                  disableThinkingBlocks={isUser}
                />
              ) : (
                <MarkdownRenderer
                  content={message.content}
                  // 思维链标签和折叠功能只对 AI 消息生效
                  thinkingTagPrepend={!isUser ? message.thinkingTagPrepend : undefined}
                  thinkingTagAppend={!isUser ? message.thinkingTagAppend : undefined}
                  disableThinkingBlocks={isUser}
                />
              )}
            </div>
          )}

          {/* 编辑标记 */}
          {message.isEdited && !isEditing && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-2 pt-2 border-t border-border/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              已编辑
            </div>
          )}

          {/* 版本选择器 */}
          {message.versions && message.versions.length > 1 && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <VersionSelector
                versions={message.versions}
                currentVersionId={currentVersionId}
                onVersionChange={handleVersionChange}
              />
            </div>
          )}

          {/* 重新生成次数 */}
          {!isUser && message.regenerationCount && message.regenerationCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-2 pt-2 border-t border-border/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              已重新生成 {message.regenerationCount} 次
            </div>
          )}
        </div>
      </div>

      {/* 流式输出时的底部渐变指示器 */}
      {isStreaming && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-b-2xl animate-pulse" />
      )}
    </div>
  );
});
