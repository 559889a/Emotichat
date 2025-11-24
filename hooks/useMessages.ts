'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Message, MessageRole } from '@/types';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { getGlobalModelConfig, type GlobalModelConfig } from '@/components/settings/global-endpoint-selector';
import { getStoredApiKey } from '@/components/settings/api-keys';
import type { AIProviderType } from '@/lib/ai/models';
import { toast } from 'sonner';

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
  // 使用 lazy initialization，在组件初始化时立即读取 localStorage
  const [globalConfig, setGlobalConfig] = useState<GlobalModelConfig | null>(() =>
    getGlobalModelConfig()
  );

  // 监听全局模型配置的变化
  useEffect(() => {
    // 监听配置变化（当在设置页面修改配置时）
    const handleConfigChange = () => {
      setGlobalConfig(getGlobalModelConfig());
    };

    // 监听 storage 事件（跨标签页同步）
    window.addEventListener('storage', handleConfigChange);
    // 监听自定义事件（同一页面内的配置更新）
    window.addEventListener('globalConfigChanged', handleConfigChange);

    return () => {
      window.removeEventListener('storage', handleConfigChange);
      window.removeEventListener('globalConfigChanged', handleConfigChange);
    };
  }, []);

  // 使用 useMemo 创建 transport，确保全局配置变化时重新创建
  const transport = useMemo(() => {
    // 如果是官方端点，读取对应的 API Key
    let apiKey: string | null = null;
    if (globalConfig && !globalConfig.isCustom) {
      // 从 localStorage 获取官方提供商的 API Key
      apiKey = getStoredApiKey(globalConfig.providerType as AIProviderType);
    }

    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        conversationId,
        globalModelConfig: globalConfig,
        apiKey, // 传递 API Key 到服务端
      },
    });
  }, [conversationId, globalConfig]);

  // 使用 Vercel AI SDK useChat hook (v5.x)
  const {
    messages: chatMessages,
    setMessages: setChatMessages,
    sendMessage: sendChatMessage,
    status,
    stop,
    error: chatError,
  } = useChat({
    transport,
    id: conversationId || undefined,
    onError: (err: Error) => {
      const errorMessage = err.message || '发生未知错误';
      setError(errorMessage);
      toast.error('对话出错', {
        description: errorMessage,
        duration: 6000,
      });
      console.error('Chat error:', err);
    },
    onFinish: ({ response }: any) => {
      // 从响应头中读取服务端构建的实际请求体
      try {
        if (response && response.headers) {
          const actualRequestBodyHeader = response.headers.get('X-Actual-Request-Body');
          if (actualRequestBodyHeader) {
            // 从 Base64 解码
            const requestBodyJson = atob(actualRequestBodyHeader);
            const actualRequestBody = JSON.parse(requestBodyJson);
            console.log('[Dev Mode] Actual request body:', {
              model: actualRequestBody.model,
              messagesCount: actualRequestBody.messages?.length || 0,
              parameters: Object.keys(actualRequestBody).filter(k => k !== 'model' && k !== 'messages')
            });
            // 触发自定义事件，通知 chat page 更新 devmode 数据
            window.dispatchEvent(new CustomEvent('actualRequestBody', {
              detail: {
                requestBody: actualRequestBody,
                conversationId
              }
            }));
          }
        }
      } catch (err) {
        console.error('Failed to parse actual request body:', err);
      }
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
      toast.error('获取消息失败', {
        description: errorMessage,
        duration: 5000,
      });
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

      // 检查是否已配置全局端点
      if (!globalConfig) {
        const errorMsg = '未配置全局端点，请在设置页面选择一个模型端点';
        setError(errorMsg);
        toast.error('配置错误', {
          description: errorMsg,
          duration: 5000,
        });
        throw new Error(errorMsg);
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
    [conversationId, globalConfig, sendChatMessage]
  );

  /**
   * 重试消息（重新生成 AI 回复或重新发送用户消息）
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

      try {
        if (message.role === 'assistant') {
          // AI 消息：删除当前 AI 消息及之后的所有消息，重新发送最后一条用户消息
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
        } else if (message.role === 'user') {
          // 用户消息：删除该消息之后的所有消息，重新发送该用户消息
          const messagesBeforeUser = chatMessages.slice(0, messageIndex);
          setChatMessages(messagesBeforeUser);

          // 重新发送该用户消息
          if (message.content) {
            await sendChatMessage({
              role: 'user',
              parts: [{ type: 'text', text: message.content }],
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
        toast.error('编辑消息失败', {
          description: errorMessage,
          duration: 5000,
        });
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
        toast.error('删除消息失败', {
          description: errorMessage,
          duration: 5000,
        });
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
        toast.error('切换版本失败', {
          description: errorMessage,
          duration: 5000,
        });
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