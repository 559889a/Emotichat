'use client';

import { useState, useRef, KeyboardEvent, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Send, Loader2, Square } from 'lucide-react';
import { InlineTokenCounter } from './token-counter';
import { countTokens } from '@/lib/utils/token-counter';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  onStop,
  placeholder = '输入消息...',
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || disabled || isSending) return;

    setIsSending(true);
    try {
      await onSend(trimmedContent);
      setContent('');
      
      // 重置 textarea 高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
      // 发送后重新聚焦到输入框
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // 自动调整高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const isDisabled = disabled || isSending;
  const canSend = content.trim().length > 0 && !isDisabled;
  
  // 计算当前输入的 token 数
  const inputTokens = useMemo(() => {
    return content.trim() ? countTokens(content, { estimateMode: true }) : 0;
  }, [content]);

  return (
    <div className="w-full border rounded-2xl bg-background shadow-sm hover:shadow-md transition-shadow">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        aria-label="消息输入框"
        aria-describedby="chat-input-help"
        className="w-full border-0 focus-visible:ring-0 resize-none min-h-[52px] sm:min-h-[56px] max-h-[160px] sm:max-h-[200px] px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 text-sm sm:text-base"
        style={{ height: 'auto' }}
      />
      <div id="chat-input-help" className="sr-only">
        按 Enter 发送消息，Shift+Enter 换行
      </div>
      
      <div className="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2 border-t">
        <div className="flex items-center gap-1 sm:gap-2">
          {inputTokens > 0 && (
            <InlineTokenCounter tokenCount={inputTokens} />
          )}
          <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
            disabled={isDisabled}
            aria-label="添加附件"
            title="添加附件（即将推出）"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="sr-only">添加附件</span>
          </Button>
          </div>
        </div>

        {isSending && onStop ? (
          <Button
            onClick={onStop}
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-destructive hover:bg-destructive/90 transition-all flex-shrink-0"
            aria-label="停止生成"
            title="停止生成"
          >
            <Square className="h-3 w-3 fill-current" />
            <span className="sr-only">停止生成</span>
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
            aria-label={isSending ? '发送中' : canSend ? '发送消息' : '请输入消息'}
            aria-disabled={!canSend}
            title={canSend ? '发送消息 (Enter)' : '请输入消息'}
          >
            {isSending ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                <span className="sr-only">发送中</span>
              </>
            ) : (
              <>
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="sr-only">发送消息</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}