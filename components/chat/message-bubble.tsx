'use client';

import { memo, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './markdown-renderer';
import { MessageEditor } from './message-editor';
import { VersionSelector } from './version-selector';
import { emitThinkingBlockRendered } from '@/lib/chat/thinking-tag-watcher';
import { SmoothStreamingContent } from './message-streaming';
import { MessageMeta } from './message-meta';
import { useMessageEditing } from '@/hooks/messages/useMessageEditing';

interface MessageBubbleProps {
  message: Message;
  messageIndex?: number;
  conversationId?: string;
  characterName?: string;
  characterAvatar?: string;
  isStreaming?: boolean;
  streamingStartTime?: number | null;
  recordedResponseTime?: number;
  recordedTokenCount?: number;
  onEdit?: (content: string) => void;
  onEditAssistant?: (content: string) => void;
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
  conversationId,
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
  const isUser = message.role === 'user';
  const floorNumber = (messageIndex ?? 0) + 1;

  const savedStartTimeRef = useRef<number | null>(streamingStartTime);

  useEffect(() => {
    if (streamingStartTime !== null && savedStartTimeRef.current === null) {
      savedStartTimeRef.current = streamingStartTime;
    }
  }, [streamingStartTime]);

  const { isEditing, beginEdit, saveEdit, cancelEdit } = useMessageEditing({
    isUser,
    onEdit,
    onEditAssistant,
  });

  const handleVersionChange = (versionId: string) => onVersionChange?.(versionId);

  const currentVersionId =
    message.versions?.find((v) => v.isActive)?.id ||
    (message.versions && message.versions.length > 0
      ? message.versions[message.versions.length - 1].id
      : '');

  const handleThinkingBlockRender = useCallback(() => {
    if (isUser) return;
    emitThinkingBlockRendered({
      messageId: message.id,
      conversationId,
    });
  }, [conversationId, isUser, message.id]);

  return (
    <div
      className={cn(
        'group relative mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'pl-8 md:pl-16' : 'pr-8 md:pr-16'
      )}
    >
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden',
          'border shadow-sm transition-shadow duration-200',
          isUser
            ? 'bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20 dark:from-primary/10 dark:via-primary/5'
            : 'bg-card/80 border-border/50 dark:bg-zinc-900/80 hover:shadow-md'
        )}
      >
        <MessageMeta
          message={message}
          floorNumber={floorNumber}
          isUser={isUser}
          isStreaming={isStreaming}
          recordedResponseTime={recordedResponseTime}
          recordedTokenCount={recordedTokenCount}
          savedStartTime={savedStartTimeRef.current}
          characterName={characterName}
          onEdit={isUser && onEdit ? beginEdit : undefined}
          onEditAssistant={!isUser && onEditAssistant ? beginEdit : undefined}
          onRegenerate={onRegenerate}
          onDelete={onDelete}
          onDeleteFollowing={onDeleteFollowing}
          onCopy={onCopy}
          onCreateBranch={onCreateBranch}
        />

        <div className="px-3 py-2.5 sm:px-4 sm:py-3">
          {isEditing ? (
            <MessageEditor
              initialContent={message.content}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          ) : (
            <div className="overflow-hidden text-sm leading-relaxed">
              {isStreaming ? (
                <SmoothStreamingContent
                  content={message.content}
                  isStreaming={isStreaming}
                  thinkingTagPrepend={!isUser ? message.thinkingTagPrepend : undefined}
                  thinkingTagAppend={!isUser ? message.thinkingTagAppend : undefined}
                  disableThinkingBlocks={isUser}
                  messageId={message.id}
                  onThinkingBlockRender={!isUser ? handleThinkingBlockRender : undefined}
                />
              ) : (
                <MarkdownRenderer
                  content={message.content}
                  thinkingTagPrepend={!isUser ? message.thinkingTagPrepend : undefined}
                  thinkingTagAppend={!isUser ? message.thinkingTagAppend : undefined}
                  disableThinkingBlocks={isUser}
                  messageId={message.id}
                  onThinkingBlockRender={!isUser ? handleThinkingBlockRender : undefined}
                />
              )}
            </div>
          )}

          {message.isEdited && !isEditing && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-2 pt-2 border-t border-border/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              已编辑
            </div>
          )}

          {message.versions && message.versions.length > 1 && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <VersionSelector
                versions={message.versions}
                currentVersionId={currentVersionId}
                onVersionChange={handleVersionChange}
              />
            </div>
          )}

          {!isUser && message.regenerationCount && message.regenerationCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-2 pt-2 border-t border-border/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              已重新生成 {message.regenerationCount} 次
            </div>
          )}
        </div>
      </div>

      {isStreaming && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-b-2xl animate-pulse" />
      )}
    </div>
  );
});
