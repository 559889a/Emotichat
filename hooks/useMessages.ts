'use client';

import { useState, useCallback, useEffect } from 'react';
import { Message, MessageRole } from '@/types';
import { useChat } from '@ai-sdk/react';

interface UseMessagesOptions {
  conversationId: string | null;
  autoFetch?: boolean;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  fetchMessages: (id?: string) => Promise<void>;
  sendMessage: (content: string, role?: MessageRole) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  clearMessages: () => void;
  stop: () => void;
}

export function useMessages({
  conversationId,
  autoFetch = true,
}: UseMessagesOptions): UseMessagesReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 集成 Vercel AI SDK useChat (v5.x 使用简化配置)
  const chat = useChat({
    id: conversationId || undefined,
    onError: (err: Error) => {
      setError(err.message);
      console.error('Chat error:', err);
    },
  });

  const { messages: chatMessages, setMessages: setChatMessages, status, stop, regenerate } = chat;

  // 将 AI SDK 的消息转换为我们的 Message 类型
  const messages = chatMessages.map((m: any) => {
    // 提取文本内容
    let content = '';
    if (typeof m.content === 'string') {
      content = m.content;
    } else if (Array.isArray(m.parts)) {
      // 从 parts 中提取文本
      content = m.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    }

    return {
      id: m.id,
      role: m.role as MessageRole,
      content,
      createdAt: new Date().toISOString(),
    };
  });

  /**
   * 获取消息列表
   */
  const fetchMessages = useCallback(async (id?: string) => {
    const targetId = id || conversationId;
    if (!targetId) {
      setChatMessages([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${targetId}/messages`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '获取消息失败');
      }

      // 转换后端消息格式为 AI SDK 格式
      const loadedMessages = (result.data || []).map((m: Message) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: 'text', text: m.content }],
      }));

      setChatMessages(loadedMessages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取消息失败';
      setError(errorMessage);
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, setChatMessages]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (content: string, role: MessageRole = 'user') => {
      if (!conversationId) {
        throw new Error('没有活动对话');
      }

      if (!content.trim()) {
        throw new Error('消息内容不能为空');
      }

      setError(null);

      try {
        // 添加用户消息到本地状态
        const userMessage = {
          id: crypto.randomUUID(),
          role: role,
          parts: [{ type: 'text' as const, text: content.trim() }],
        };
        
        setChatMessages([...chatMessages, userMessage] as any);

        // 直接调用 API，传递 conversationId
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...chatMessages, userMessage].map(m => ({
              role: m.role,
              content: m.parts?.map((p: any) => p.type === 'text' ? p.text : '').join('') || '',
            })),
            conversationId: conversationId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || '发送消息失败');
        }

        // 处理流式响应
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        if (reader) {
          const assistantMessageId = crypto.randomUUID();
          
          // 添加初始空的 assistant 消息作为占位符
          setChatMessages(prev => [
            ...prev,
            {
              id: assistantMessageId,
              role: 'assistant',
              parts: [{ type: 'text' as const, text: '' }],
            },
          ] as any);
          
          // 读取并累积流式响应
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 直接解码为文本（Vercel AI SDK 返回纯文本流）
            const chunk = decoder.decode(value, { stream: true });
            
            if (chunk) {
              assistantMessage += chunk;
              
              // 实时更新消息列表以显示累积的内容
              setChatMessages(prev => {
                const withoutLast = prev.slice(0, -1);
                return [
                  ...withoutLast,
                  {
                    id: assistantMessageId,
                    role: 'assistant',
                    parts: [{ type: 'text' as const, text: assistantMessage }],
                  },
                ] as any;
              });
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '发送消息失败';
        setError(errorMessage);
        console.error('Failed to send message:', err);
        throw err;
      }
    },
    [conversationId, chatMessages, setChatMessages]
  );

  /**
   * 重试消息（重新生成 AI 回复）
   */
  const retryMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) {
        throw new Error('没有活动对话');
      }

      // 找到要重试的消息
      const messageIndex = messages.findIndex((m: Message) => m.id === messageId);
      if (messageIndex === -1) {
        throw new Error('消息不存在');
      }

      const message = messages[messageIndex];
      if (message.role !== 'assistant') {
        throw new Error('只能重试 AI 消息');
      }

      try {
        // 使用新的 regenerate API
        await regenerate({ messageId });
      } catch (err) {
        console.error('Failed to retry message:', err);
        throw err;
      }
    },
    [conversationId, messages, regenerate]
  );

  /**
   * 清空消息列表
   */
  const clearMessages = useCallback(() => {
    setChatMessages([]);
    setError(null);
  }, [setChatMessages]);

  /**
   * 自动获取消息
   */
  useEffect(() => {
    if (autoFetch && conversationId) {
      fetchMessages();
    }
  }, [conversationId, autoFetch, fetchMessages]);

  return {
    messages,
    loading: loading || status === 'submitted' || status === 'streaming',
    error: error || (chat.error ? chat.error.message : null),
    fetchMessages,
    sendMessage,
    retryMessage,
    clearMessages,
    stop,
  };
}