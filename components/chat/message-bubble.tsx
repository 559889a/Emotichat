'use client';

import { Message } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, RotateCcw, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './markdown-renderer';

interface MessageBubbleProps {
  message: Message;
  characterName?: string;
  characterAvatar?: string;
  onRetry?: () => void;
  onCopy?: () => void;
}

export function MessageBubble({
  message,
  characterName,
  characterAvatar,
  onRetry,
  onCopy,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
    } else {
      await navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // 用户消息
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl max-w-[80%] break-words">
          <MarkdownRenderer content={message.content} className="text-primary-foreground" />
        </div>
      </div>
    );
  }

  // AI 消息
  return (
    <div className="flex gap-3 group mb-4">
      <Avatar className="h-8 w-8 shrink-0 mt-1">
        <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium">
          {characterAvatar || 'AI'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1 min-w-0">
        {characterName && (
          <span className="text-xs text-muted-foreground font-medium">
            {characterName}
          </span>
        )}
        
        <MarkdownRenderer content={message.content} />

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-accent"
            onClick={handleCopy}
            title={copied ? '已复制' : '复制消息'}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          
          {onRetry && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-accent"
              onClick={handleRetry}
              title="重新生成"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {message.model && (
          <div className="text-xs text-muted-foreground/60 pt-1">
            {message.model}
          </div>
        )}
      </div>
    </div>
  );
}