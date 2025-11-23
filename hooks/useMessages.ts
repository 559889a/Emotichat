'use client';

import { useState, useCallback, useEffect } from 'react';
import { Message, MessageRole } from '@/types';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

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

  // 使用 Vercel AI SDK useChat hook (v5.x)
  const {
    messages: chatMessages,
    setMessages: setChatMessages,
    sendMessage: sendChatMessage,
    status,
    stop,
    error: chatError,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        conversationId,
      },
    }),
    id: conversationId || undefined,
    onError: (err: Error) => {
      setError(err.message);
      console.error('Chat error:', err);
    },
  });

  // 将 AI SDK 的消息转换为我们的 Message 类型
  const messages: Message[] = chatMessages.map((m) => {
    // 从 parts 中提取文本内容
    let content = '';
    if (m.parts && Array.isArray(m.parts)) {
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

      // 转换后端消息格式为 AI SDK v5 格式
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
   * 发送消息 - 使用 useChat 的 sendMessage 方法
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
        // 使用 useChat 的 sendMessage 方法发送消息
        // sendMessage 会自动处理流式响应
        await sendChatMessage({
          role,
          parts: [{ type: 'text', text: content.trim() }],
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '发送消息失败';
        setError(errorMessage);
        console.error('Failed to send message:', err);
        throw err;
      }
    },
    [conversationId, sendChatMessage]
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
        // 删除当前 AI 消息及之后的所有消息
        const messagesBeforeAssistant = chatMessages.slice(0, messageIndex);
        setChatMessages(messagesBeforeAssistant);
        
        // 重新发送最后一条用户消息
        const lastUserMessage = messagesBeforeAssistant
          .slice()
          .reverse()
          .find((m: any) => m.role === 'user');
        
        if (lastUserMessage && lastUserMessage.parts) {
          const text = lastUserMessage.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('');
          
          if (text) {
            await sendChatMessage({
              role: 'user',
              parts: [{ type: 'text', text }],
            });
          }
        }
      } catch (err) {
        console.error('Failed to retry message:', err);
        throw err;
      }
    },
    [conversationId, messages, chatMessages, setChatMessages, sendChatMessage]
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
    loading: loading || status === 'streaming',
    error: error || (chatError ? chatError.message : null),
    fetchMessages,
    sendMessage,
    retryMessage,
    clearMessages,
    stop,
  };
}