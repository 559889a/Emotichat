'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import { MessageBubble } from './message-bubble';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: Message[];
  characterName?: string;
  characterAvatar?: string;
  loading?: boolean;
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onDeleteFollowing?: (messageId: string) => void;
  onVersionChange?: (messageId: string, versionId: string) => void;
}

export function MessageList({
  messages,
  characterName,
  characterAvatar,
  loading = false,
  onRetry,
  onEdit,
  onDelete,
  onDeleteFollowing,
  onVersionChange,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(messages.length);

  // 自动滚动到底部（仅当有新消息时）
  useEffect(() => {
    const isNewMessage = messages.length > previousMessageCountRef.current;
    
    if (isNewMessage && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    previousMessageCountRef.current = messages.length;
  }, [messages.length]);

  // 初始加载时滚动到底部
  useEffect(() => {
    if (messages.length > 0 && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  if (messages.length === 0 && !loading) {
    return null;
  }

  return (
    <ScrollArea className="h-full px-2 sm:px-3 md:px-4">
      <div ref={scrollAreaRef} className="max-w-4xl mx-auto py-4 sm:py-6 space-y-1">
        {messages.map((message, index) => {
          // 第一条消息或 ID 为 'welcome-message' 的消息不显示操作按钮
          const isWelcomeMessage = index === 0 || message.id === 'welcome-message'
          
          return (
            <MessageBubble
              key={message.id}
              message={message}
              characterName={message.role === 'assistant' ? characterName : undefined}
              characterAvatar={message.role === 'assistant' ? characterAvatar : undefined}
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

        {loading && (
          <div className="flex gap-2 sm:gap-3 mb-3 md:mb-4">
            <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 mt-0.5 sm:mt-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-white animate-spin" />
            </div>
            <div className="flex-1 space-y-1">
              {characterName && (
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {characterName}
                </span>
              )}
              <div className="flex gap-1.5 items-center py-2">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {/* 滚动锚点 */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}