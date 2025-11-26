'use client';

import { memo } from 'react';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { ResponseTimer } from './message-streaming';
import { MessageActions } from './message-actions';

interface MessageMetaProps {
  message: Message;
  floorNumber: number;
  isUser: boolean;
  isStreaming: boolean;
  recordedResponseTime?: number;
  recordedTokenCount?: number;
  savedStartTime: number | null;
  characterName?: string;
  onEdit?: () => void;
  onEditAssistant?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onDeleteFollowing?: () => void;
  onCopy?: () => void;
  onCreateBranch?: () => void;
}

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

export const MessageMeta = memo(function MessageMeta({
  message,
  floorNumber,
  isUser,
  isStreaming,
  recordedResponseTime,
  recordedTokenCount,
  savedStartTime,
  characterName,
  onEdit,
  onEditAssistant,
  onRegenerate,
  onDelete,
  onDeleteFollowing,
  onCopy,
  onCreateBranch,
}: MessageMetaProps) {
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-xs',
        'border-b transition-colors',
        isUser ? 'bg-primary/5 border-primary/10 dark:bg-primary/10' : 'bg-muted/30 border-border/30 dark:bg-zinc-800/30'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span
          className={cn(
            'font-mono text-[10px] font-medium px-1.5 py-0.5 rounded',
            isUser ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-muted text-muted-foreground'
          )}
        >
          #{floorNumber}
        </span>

        {!isUser && (isStreaming || recordedResponseTime !== undefined) && (
          <ResponseTimer
            key={`timer-${message.id}`}
            isStreaming={isStreaming}
            startTime={savedStartTime}
            recordedTime={recordedResponseTime}
          />
        )}

        {!isUser && (message.tokenCount || isStreaming || recordedTokenCount !== undefined) && (
          <span
            className={cn(
              'font-mono text-[10px] px-1.5 py-0.5 rounded',
              isStreaming
                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 animate-pulse'
                : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400'
            )}
          >
            {isStreaming ? `~${Math.ceil(message.content.length / 3)}t` : `${message.tokenCount ?? recordedTokenCount}t`}
          </span>
        )}

        <span className="text-border">|</span>

        <span className={cn('font-medium truncate', isUser ? 'text-primary dark:text-primary' : 'text-foreground/90')}>
          {isUser ? '我' : characterName || 'AI'}
        </span>

        {!isUser && message.model && (
          <span
            className={cn(
              'hidden sm:inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              'bg-gradient-to-r from-pink-500/10 to-purple-500/10',
              'text-pink-600 dark:text-pink-400',
              'border border-pink-500/20'
            )}
          >
            {getModelBadge(message.model)}
          </span>
        )}

        {message.createdAt && (
          <span className="text-muted-foreground/60 hidden sm:inline">
            {formatTimestamp(message.createdAt)}
          </span>
        )}
      </div>

      <div className="flex items-center shrink-0">
        <MessageActions
          message={message}
          onEdit={isUser ? onEdit : undefined}
          onEditAssistant={!isUser ? onEditAssistant : undefined}
          onRegenerate={onRegenerate}
          onDelete={onDelete}
          onDeleteFollowing={onDeleteFollowing}
          onCopy={onCopy}
          onCreateBranch={onCreateBranch}
        />
      </div>
    </div>
  );
});
