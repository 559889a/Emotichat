'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Message, MessageRole } from '@/types';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { getGlobalModelConfig, type GlobalModelConfig } from '@/components/settings/global-endpoint-selector';
import { getStoredApiKey } from '@/components/settings/api-keys';
import type { AIProviderType } from '@/lib/ai/models';
import { toast } from 'sonner';
import { useUIPreferences } from '@/stores/uiPreferences';
import { addThinkingBlockRenderedListener } from '@/lib/chat/thinking-tag-watcher';

const THINKING_ASSIST_DISABLED = true;

interface UseMessagesOptions {
  conversationId: string | null;
  autoFetch?: boolean;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  isStreaming: boolean;
  error: string | null;
  fetchMessages: (id?: string) => Promise<void>;
  sendMessage: (content: string, role?: MessageRole) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  editAssistantMessage: (messageId: string, content: string) => Promise<void>; // AI 消息编辑（不触发重新生成）
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

  // 获取思维链相关设置
  const {
    thinkingTags,
    thinkingLLMAssist,
    thinkingLLMProtocol,
    thinkingLLMEndpoint,
    thinkingLLMApiKey,
    thinkingLLMModel,
  } = useUIPreferences();

  // 使用 ref 存储最新的思维链配置，避免 onFinish 回调中的闭包问题
  const thinkingConfigRef = useRef({
    thinkingTags,
    thinkingLLMAssist,
    thinkingLLMProtocol,
    thinkingLLMEndpoint,
    thinkingLLMApiKey,
    thinkingLLMModel,
  });

  // 使用 ref 存储最新的 conversationId
  const conversationIdRef = useRef(conversationId);

  // 更新 refs
  useEffect(() => {
    thinkingConfigRef.current = {
      thinkingTags,
      thinkingLLMAssist,
      thinkingLLMProtocol,
      thinkingLLMEndpoint,
      thinkingLLMApiKey,
      thinkingLLMModel,
    };
  }, [thinkingTags, thinkingLLMAssist, thinkingLLMProtocol, thinkingLLMEndpoint, thinkingLLMApiKey, thinkingLLMModel]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // 存储服务端消息的元数据（包括 thinkingTagPrepend）
  const serverMessagesRef = useRef<Map<string, Message>>(new Map());
  const thinkingBlockRenderedRef = useRef<Set<string>>(new Set());
  const thinkingPatchInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    thinkingBlockRenderedRef.current.clear();
    thinkingPatchInFlightRef.current.clear();
  }, [conversationId]);

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

    // 自定义fetch函数以拦截流并提取DevMode数据
    const customFetch = async (url: string, options: any) => {
      console.log('[useMessages] Custom fetch called for URL:', url);
      const response = await fetch(url, options);

      // 如果没有响应体，直接返回
      if (!response.body) {
        console.log('[useMessages] No response body, returning original response');
        return response;
      }

      // 创建一个 TransformStream 来拦截流数据
      const decoder = new TextDecoder();
      let buffer = '';
      let devModeDataExtracted = false;

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          // 将原始数据传递给下游
          controller.enqueue(chunk);

          // 同时解析数据以提取 DevMode 信息
          if (!devModeDataExtracted) {
            try {
              const text = decoder.decode(chunk, { stream: true });
              buffer += text;

              // 查找以 2: 开头的行（DevMode 数据）
              const lines = buffer.split('\n');
              for (const line of lines) {
                if (line.startsWith('2:')) {
                  try {
                    const jsonStr = line.substring(2);
                    const dataArray = JSON.parse(jsonStr);

                    // 查找 devmode_request_body 类型的数据
                    for (const item of dataArray) {
                      if (item.type === 'devmode_request_body' && item.data) {
                        console.log('[useMessages] Found DevMode data in stream, messages count:', item.data.messages?.length);

                        // 触发事件
                        window.dispatchEvent(new CustomEvent('actualRequestBody', {
                          detail: {
                            requestBody: item.data,
                            conversationId
                          }
                        }));

                        devModeDataExtracted = true;
                        break;
                      }
                    }
                  } catch (parseErr) {
                    // 解析失败，可能是不完整的数据，继续等待
                    console.log('[useMessages] Failed to parse 2: line, might be incomplete');
                  }
                }
              }

              // 只保留最后一行（可能不完整）
              if (lines.length > 1) {
                buffer = lines[lines.length - 1];
              }
            } catch (err) {
              console.error('[useMessages] Error processing stream chunk:', err);
            }
          }
        },
        flush() {
          // 流结束时的处理
          if (!devModeDataExtracted) {
            console.warn('[useMessages] Stream ended without extracting DevMode data');
          }
        }
      });

      // 通过 TransformStream 处理原始流
      const transformedStream = response.body.pipeThrough(transformStream);

      // 创建新的 Response 对象，保留原始的 headers 和 status
      return new Response(transformedStream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    };

    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        conversationId,
        globalModelConfig: globalConfig,
        apiKey, // 传递 API Key 到服务端
      },
      fetch: customFetch as any,
    });
  }, [conversationId, globalConfig]);

  const persistThinkingTagState = useCallback(
    async (message: Message, updates?: { prependTag?: string; appendTag?: string }) => {
      const currentConversationId = conversationIdRef.current;
      if (!currentConversationId) return;

      const targetMsg = serverMessagesRef.current.get(message.id) || message;

      if (targetMsg.role !== 'assistant') {
        return;
      }

      if (targetMsg.thinkingTagProcessed && !updates?.prependTag && !updates?.appendTag) {
        thinkingBlockRenderedRef.current.add(message.id);
        return;
      }

      if (thinkingPatchInFlightRef.current.has(message.id)) {
        return;
      }

      thinkingPatchInFlightRef.current.add(message.id);

      try {
        const patchResponse = await fetch(
          `/api/conversations/${currentConversationId}/messages/${message.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'set_thinking_tag',
              thinkingTagPrepend: updates?.prependTag ?? targetMsg.thinkingTagPrepend ?? '',
              thinkingTagAppend: updates?.appendTag ?? targetMsg.thinkingTagAppend ?? '',
              thinkingTagProcessed: true,
            }),
          }
        );

        if (!patchResponse.ok) {
          console.warn('[useMessages] Failed to persist thinking tag state:', patchResponse.status);
        } else {
          const updatedMsg: Message = {
            ...targetMsg,
            thinkingTagPrepend: updates?.prependTag ?? targetMsg.thinkingTagPrepend ?? '',
            thinkingTagAppend: updates?.appendTag ?? targetMsg.thinkingTagAppend ?? '',
            thinkingTagProcessed: true,
          };
          serverMessagesRef.current.set(message.id, updatedMsg);
          thinkingBlockRenderedRef.current.add(message.id);
        }
      } catch (err) {
        console.error('[useMessages] Failed to save thinking tag state:', err);
      } finally {
        thinkingPatchInFlightRef.current.delete(message.id);
      }
    },
    []
  );

  useEffect(() => {
    if (THINKING_ASSIST_DISABLED) {
      return;
    }

    const unsubscribe = addThinkingBlockRenderedListener(
      ({ messageId, conversationId: eventConversationId }) => {
        const currentConversationId = conversationIdRef.current;
        if (!messageId) return;
        if (
          eventConversationId &&
          currentConversationId &&
          eventConversationId !== currentConversationId
        ) {
          return;
        }
        const targetMsg = serverMessagesRef.current.get(messageId);
        if (!targetMsg || targetMsg.role !== 'assistant') {
          return;
        }

        thinkingBlockRenderedRef.current.add(messageId);

        if (!targetMsg.thinkingTagProcessed) {
          persistThinkingTagState(targetMsg);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [persistThinkingTagState]);

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
    onFinish: async ({ message, finishReason }: any) => {
      // 使用 ref 获取最新的值，避免闭包问题
      const currentConversationId = conversationIdRef.current;
      const currentConfig = thinkingConfigRef.current;

      console.log('[useMessages] onFinish called:', {
        hasMessage: !!message,
        finishReason,
        messageContent: message?.content?.substring(0, 50),
        conversationId: currentConversationId,
        thinkingTagsCount: currentConfig.thinkingTags?.length,
      });

      // 重新获取消息列表，确保非流式传输的消息也能正确显示
      // 这对于非流式传输特别重要，因为 useChat 可能无法自动更新 UI
      if (currentConversationId) {
        console.log('[useMessages] onFinish: Scheduling message refetch to ensure UI is up to date');
        // 使用 setTimeout 确保服务端已经完成了消息的保存
        setTimeout(async () => {
          try {
            console.log('[useMessages] Refetching messages from server...');
            const fetchResponse = await fetch(`/api/conversations/${currentConversationId}/messages`);
            const result = await fetchResponse.json();

            if (fetchResponse.ok && result.success) {
              const serverMessages: Message[] = result.data || [];

              // 更新服务端消息引用（包括 thinkingTagPrepend 等元数据）
              serverMessages.forEach((m) => serverMessagesRef.current.set(m.id, m));

              // 转换后端消息格式为 AI SDK v5 格式
              const loadedMessages = serverMessages.map((m: Message) => ({
                id: m.id,
                role: m.role,
                parts: [{ type: 'text' as const, text: m.content }],
              }));

              console.log('[useMessages] Fetched messages:', loadedMessages.length);
              // 直接更新消息列表，确保 UI 显示最新内容
              setChatMessages(loadedMessages);

              // 处理思维链标签（对话结束后检测）
              // 只处理 assistant 消息，且只处理未处理过的消息
              const lastAssistantMsg = serverMessages
                .slice()
                .reverse()
                .find((m) => m.role === 'assistant');

              console.log('[useMessages] Last assistant message:', {
                id: lastAssistantMsg?.id,
                thinkingTagProcessed: lastAssistantMsg?.thinkingTagProcessed,
                contentLength: lastAssistantMsg?.content?.length,
              });


              if (
                lastAssistantMsg &&
                !lastAssistantMsg.thinkingTagProcessed
              ) {
                console.warn('[useMessages] Thinking LLM assist is disabled, marking message as processed without changes');
                await persistThinkingTagState(lastAssistantMsg, {
                  prependTag: '',
                  appendTag: '',
                });
              }
            }
          } catch (err) {
            console.error('[useMessages] Failed to refetch messages in onFinish:', err);
          }
        }, 100); // 延迟100ms以确保服务端已保存消息
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

    // 从服务端消息引用获取元数据
    const serverMsg = serverMessagesRef.current.get(m.id);

    return {
      id: m.id,
      role: m.role as MessageRole,
      content,
      createdAt: serverMsg?.createdAt || new Date().toISOString(),
      thinkingTagPrepend: serverMsg?.thinkingTagPrepend,
      thinkingTagAppend: serverMsg?.thinkingTagAppend,
      thinkingTagProcessed: serverMsg?.thinkingTagProcessed,
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

      const serverMessages: Message[] = result.data || [];

      // 更新服务端消息引用（包括 thinkingTagPrepend 等元数据）
      serverMessages.forEach((m) => serverMessagesRef.current.set(m.id, m));

      // 转换后端消息格式为 AI SDK v5 格式
      const loadedMessages = serverMessages.map((m: Message) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: 'text' as const, text: m.content }],
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
   * 重试消息（重新生成 AI 回复）
   * 正确逻辑：删除 AI 消息，然后基于现有用户消息重新生成
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
          // AI 消息：删除当前 AI 消息，重新生成
          // 1. 先在后端删除
          const url = new URL(
            `/api/conversations/${conversationId}/messages/${messageId}`,
            window.location.origin
          );
          url.searchParams.set('deleteFollowing', 'true');

          const deleteResponse = await fetch(url.toString(), { method: 'DELETE' });
          if (!deleteResponse.ok) {
            throw new Error('删除消息失败');
          }

          // 2. 找到最后一条用户消息的内容
          const messagesBeforeAssistant = chatMessages.slice(0, messageIndex);
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
              // 3. 更新本地消息列表（移除 AI 消息和最后一条用户消息）
              // 这样 sendChatMessage 添加用户消息后不会重复
              const messagesWithoutLastUser = messagesBeforeAssistant.slice(0, -1);
              setChatMessages(messagesWithoutLastUser);

              // 4. 使用 sendChatMessage 触发新的 AI 回复
              await sendChatMessage({
                role: 'user',
                parts: [{ type: 'text', text }],
              });
            }
          }
        } else if (message.role === 'user') {
          // 用户消息重试：删除该用户消息之后的所有消息（包括AI回复），重新发送
          // 1. 先在后端删除后续消息
          const url = new URL(
            `/api/conversations/${conversationId}/messages/${messageId}`,
            window.location.origin
          );
          url.searchParams.set('deleteFollowing', 'true');
          url.searchParams.set('keepSelf', 'true');

          const deleteResponse = await fetch(url.toString(), { method: 'DELETE' });
          if (!deleteResponse.ok) {
            throw new Error('删除消息失败');
          }

          // 2. 更新本地消息列表（不包括该用户消息，因为 sendChatMessage 会添加）
          const messagesBeforeUser = chatMessages.slice(0, messageIndex);
          setChatMessages(messagesBeforeUser);

          // 3. 重新发送该用户消息触发 AI 回复
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
   * 正确逻辑：更新消息内容，删除后续消息，重新触发 AI 回复
   * 不会新建楼层，而是原地更新用户消息
   */
  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!conversationId) {
        throw new Error('没有活动对话');
      }

      const messageIndex = messages.findIndex((m: Message) => m.id === messageId);
      if (messageIndex === -1) {
        throw new Error('消息不存在');
      }

      setLoading(true);
      setError(null);

      try {
        // 1. 在服务端更新消息内容
        const editResponse = await fetch(
          `/api/conversations/${conversationId}/messages/${messageId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'edit', content }),
          }
        );

        const editResult = await editResponse.json();
        if (!editResponse.ok || !editResult.success) {
          throw new Error(editResult.error || '编辑消息失败');
        }

        // 2. 删除该消息之后的所有消息（在服务端）
        const deleteUrl = new URL(
          `/api/conversations/${conversationId}/messages/${messageId}`,
          window.location.origin
        );
        deleteUrl.searchParams.set('deleteFollowing', 'true');
        deleteUrl.searchParams.set('keepSelf', 'true');

        const deleteResponse = await fetch(deleteUrl.toString(), { method: 'DELETE' });
        if (!deleteResponse.ok) {
          console.warn('删除后续消息失败，但继续执行');
        }

        // 3. 更新本地消息列表：保留到编辑消息之前的所有消息（不包括编辑的消息本身）
        // 因为 sendChatMessage 会添加新的用户消息
        const messagesBeforeEdit = chatMessages.slice(0, messageIndex);
        setChatMessages(messagesBeforeEdit);

        // 4. 使用 sendChatMessage 发送编辑后的内容，这会添加用户消息并触发 AI 回复
        await sendChatMessage({
          role: 'user',
          parts: [{ type: 'text', text: content }],
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '编辑消息失败';
        setError(errorMessage);
        toast.error('编辑消息失败', {
          description: errorMessage,
          duration: 5000,
        });
        console.error('Failed to edit message:', err);
        // 出错时重新获取消息以恢复正确状态
        await fetchMessages();
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [conversationId, messages, chatMessages, setChatMessages, sendChatMessage, fetchMessages]
  );

  /**
   * 编辑 AI 消息（不触发重新生成）
   * 仅更新消息内容，不会删除后续消息或触发 AI 回复
   */
  const editAssistantMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!conversationId) {
        throw new Error('没有活动对话');
      }

      setLoading(true);
      setError(null);

      try {
        // 使用 edit_assistant action 更新消息
        const response = await fetch(
          `/api/conversations/${conversationId}/messages/${messageId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'edit_assistant', content }),
          }
        );

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || '编辑消息失败');
        }

        // 重新获取消息列表以更新 UI
        await fetchMessages();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '编辑消息失败';
        setError(errorMessage);
        toast.error('编辑消息失败', {
          description: errorMessage,
          duration: 5000,
        });
        console.error('Failed to edit assistant message:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [conversationId, fetchMessages]
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

  /**
   * 监听 AI 响应状态变化
   * 注意：onFinish 回调已经处理了消息重新获取，这里不再重复调用
   * 以避免多次 setChatMessages 导致的滚动位置重置问题
   */
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    // 仅记录状态变化，不重复获取消息
    if (prevStatus === 'streaming' && status !== 'streaming' && conversationId) {
      console.log('[useMessages] Streaming finished, onFinish will handle message update');
    }
  }, [status, conversationId]);

  // 判断是否正在加载（包括流式和非流式）
  // status: 'ready' | 'submitted' | 'streaming' | 'error'
  // 'submitted' 表示非流式请求已发送，正在等待响应
  // 'streaming' 表示正在流式输出
  const isLoading = loading || status === 'streaming' || status === 'submitted';
  const isStreamingStatus = status === 'streaming';

  return {
    messages,
    loading: isLoading,
    isStreaming: isStreamingStatus,
    error: error || (chatError ? chatError.message : null),
    fetchMessages,
    sendMessage,
    retryMessage,
    editMessage,
    editAssistantMessage,
    deleteMessage,
    switchVersion,
    clearMessages,
    stop,
  };
}