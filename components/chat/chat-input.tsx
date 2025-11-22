'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Send, Loader2, Square } from 'lucide-react';

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

  return (
    <div className="border rounded-2xl bg-background shadow-sm hover:shadow-md transition-shadow">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        className="border-0 focus-visible:ring-0 resize-none min-h-[56px] max-h-[200px] px-4 py-3"
        style={{ height: 'auto' }}
      />
      
      <div className="flex items-center justify-between px-3 py-2 border-t">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={isDisabled}
            title="添加附件（即将推出）"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isSending && onStop ? (
          <Button
            onClick={onStop}
            size="icon"
            className="h-8 w-8 rounded-full bg-destructive hover:bg-destructive/90 transition-all"
            title="停止生成"
          >
            <Square className="h-3 w-3 fill-current" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="icon"
            className="h-8 w-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={canSend ? '发送消息 (Enter)' : '请输入消息'}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}