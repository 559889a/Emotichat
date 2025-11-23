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
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteFollowing?: boolean) => Promise<void>;
  switchVersion: (messageId: string, versionId: string) => Promise<void>;
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
   * 编辑消息
   */
  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!conversationId) {
        throw new Error('没有活动对话');
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages/${messageId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'edit', content }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || '编辑消息失败');
        }

        // 编辑后需要删除该消息之后的所有消息，然后重新生成
        const messageIndex = messages.findIndex((m: Message) => m.id === messageId);
        if (messageIndex !== -1) {
          // 保留到编辑的消息（含编辑后的内容）
          const messagesBeforeEdit = chatMessages.slice(0, messageIndex + 1);
          
          // 更新编辑后的消息内容
          messagesBeforeEdit[messageIndex] = {
            ...messagesBeforeEdit[messageIndex],
            parts: [{ type: 'text', text: content }],
          };
          
          setChatMessages(messagesBeforeEdit);
          
          // 重新发送以触发 AI 响应
          await sendChatMessage({
            role: 'user',
            parts: [{ type: 'text', text: content }],
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '编辑消息失败';
        setError(errorMessage);
        console.error('Failed to edit message:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [conversationId, messages, chatMessages, setChatMessages, sendChatMessage]
  );

  /**
   * 删除消息
   */
  const deleteMessage = useCallback(
    async (messageId: string, deleteFollowing: boolean = false) => {
      if (!conversationId) {
        throw new Error('没有活动对话');
      }

      setLoading(true);
      setError(null);

      try {
        const url = new URL(
          `/api/conversations/${conversationId}/messages/${messageId}`,
          window.location.origin
        );
        if (deleteFollowing) {
          url.searchParams.set('deleteFollowing', 'true');
        }

        const response = await fetch(url.toString(), {
          method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || '删除消息失败');
        }

        // 重新获取消息列表
        await fetchMessages();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '删除消息失败';
        setError(errorMessage);
        console.error('Failed to delete message:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [conversationId, fetchMessages]
  );

  /**
   * 切换消息版本
   */
  const switchVersion = useCallback(
    async (messageId: string, versionId: string) => {
      if (!conversationId) {
        throw new Error('没有活动对话');
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages/${messageId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'switch_version', versionId }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || '切换版本失败');
        }

        // 重新获取消息列表以更新UI
        await fetchMessages();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '切换版本失败';
        setError(errorMessage);
        console.error('Failed to switch version:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [conversationId, fetchMessages]
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
    editMessage,
    deleteMessage,
    switchVersion,
    clearMessages,
    stop,
  };
}