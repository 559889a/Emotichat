'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  className?: string;
  placeholder?: string;
}

export function MessageEditor({
  initialContent,
  onSave,
  onCancel,
  className,
  placeholder = '编辑消息...',
}: MessageEditorProps) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // 将光标移到文本末尾
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []);

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSave = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return; // 不保存空消息
    }
    if (trimmedContent === initialContent.trim()) {
      onCancel(); // 内容未变化，直接取消
      return;
    }
    onSave(trimmedContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape 取消
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[60px] resize-none"
        rows={1}
      />
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8"
        >
          <X className="h-4 w-4 mr-1" />
          取消
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!content.trim() || content.trim() === initialContent.trim()}
          className="h-8"
        >
          <Check className="h-4 w-4 mr-1" />
          保存
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        提示：Ctrl+Enter 保存，Esc 取消
      </div>
    </div>
  );
}