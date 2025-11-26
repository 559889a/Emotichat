'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { toast } from 'sonner';
import { useUIPreferences } from '@/stores/uiPreferences';
import { Message, MessageRole } from '@/types';
import { useMessageTransport } from './messages/useMessageTransport';
import { useMessageMetadata } from './messages/useMessageMetadata';
import { useThinkingBlockPersistence } from './messages/useThinkingBlockPersistence';
import { useRegexRules } from '@/hooks/useRegexRules';
import { applyRegexRules } from '@/lib/regex/engine';

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
  editAssistantMessage: (messageId: string, content: string) => Promise<void>;
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

  const { transport, globalConfig } = useMessageTransport(conversationId);
  const { thinkingTags, thinkingLLMAssist, thinkingLLMProtocol, thinkingLLMEndpoint, thinkingLLMApiKey, thinkingLLMModel } =
    useUIPreferences();
  const { rules: regexRules } = useRegexRules();

  const thinkingConfigRef = useRef({
    thinkingTags,
    thinkingLLMAssist,
    thinkingLLMProtocol,
    thinkingLLMEndpoint,
    thinkingLLMApiKey,
    thinkingLLMModel,
  });

  const conversationIdRef = useRef(conversationId);

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

  const { serverMessagesRef, thinkingBlockRenderedRef, thinkingPatchInFlightRef, syncServerMessages } =
    useMessageMetadata(conversationId);

  const { persistThinkingTagState } = useThinkingBlockPersistence({
    conversationIdRef,
    serverMessagesRef,
    thinkingBlockRenderedRef,
    thinkingPatchInFlightRef,
    thinkingAssistDisabled: THINKING_ASSIST_DISABLED,
  });

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
    onFinish: async () => {
      const currentConversationId = conversationIdRef.current;

      if (currentConversationId) {
        setTimeout(async () => {
          try {
            const fetchResponse = await fetch(`/api/conversations/${currentConversationId}/messages`);
            const result = await fetchResponse.json();

            if (fetchResponse.ok && result.success) {
              const serverMessages: Message[] = result.data || [];
              syncServerMessages(serverMessages);

              const loadedMessages = serverMessages.map((m: Message) => ({
                id: m.id,
                role: m.role,
                parts: [{ type: 'text' as const, text: m.content }],
              }));

              setChatMessages(loadedMessages);

              const lastAssistantMsg = serverMessages
                .slice()
                .reverse()
                .find((m) => m.role === 'assistant');

              if (lastAssistantMsg && !lastAssistantMsg.thinkingTagProcessed) {
                await persistThinkingTagState(lastAssistantMsg, {
                  prependTag: '',
                  appendTag: '',
                });
              }
            }
          } catch (err) {
            console.error('[useMessages] Failed to refetch messages in onFinish:', err);
          }
        }, 100);
      }
    },
  });

  const messages: Message[] = chatMessages.map((m, index) => {
    let content = '';
    if (m.parts && Array.isArray(m.parts)) {
      content = m.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    }

    const serverMsg = serverMessagesRef.current.get(m.id);
    const scope = m.role === 'user' ? 'user_input' : m.role === 'assistant' ? 'ai_output' : null;
    let displayContent: string | undefined;
    if (scope && regexRules.length > 0) {
      const applied = applyRegexRules(content, regexRules, { scope, layer: index });
      content = applied.content;
      displayContent = applied.displayContent;
    }

    return {
      id: m.id,
      role: m.role as MessageRole,
      content,
      displayContent,
      createdAt: serverMsg?.createdAt || new Date().toISOString(),
      thinkingTagPrepend: serverMsg?.thinkingTagPrepend,
      thinkingTagAppend: serverMsg?.thinkingTagAppend,
      thinkingTagProcessed: serverMsg?.thinkingTagProcessed,
    };
  });

  const fetchMessages = useCallback(
    async (id?: string) => {
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

        if (response.status === 404 || result.error === '对话不存在') {
          setChatMessages([]);
          setError(null);
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(result.error || '获取消息失败');
        }

        const serverMessages: Message[] = result.data || [];
        syncServerMessages(serverMessages);

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
    },
    [conversationId, setChatMessages, syncServerMessages]
  );

  const sendMessage = useCallback(
    async (content: string, role: MessageRole = 'user') => {
      if (!conversationId) {
        throw new Error('没有活动对话');
      }

      if (!content.trim()) {
        throw new Error('消息内容不能为空');
      }

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
        const payload = content.trim();

        await sendChatMessage({
          role,
          parts: [{ type: 'text', text: payload }],
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

  const retryMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) {
        throw new Error('没有活动对话');
      }

      const messageIndex = messages.findIndex((m: Message) => m.id === messageId);
      if (messageIndex === -1) {
        throw new Error('消息不存在');
      }

      const message = messages[messageIndex];

      try {
        if (message.role === 'assistant') {
          const url = new URL(
            `/api/conversations/${conversationId}/messages/${messageId}`,
            window.location.origin
          );
          url.searchParams.set('deleteFollowing', 'true');

          const deleteResponse = await fetch(url.toString(), { method: 'DELETE' });
          if (!deleteResponse.ok) {
            throw new Error('删除消息失败');
          }

          const messagesBeforeAssistant = chatMessages.slice(0, messageIndex);
          const lastUserMessage = messagesBeforeAssistant
            .slice()
            .reverse()
            .find((m: any) => m.role === 'user');

          if (lastUserMessage && lastUserMessage.parts) {
            const textContent = lastUserMessage.parts
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join('');

            if (textContent) {
              const messagesWithoutLastUser = messagesBeforeAssistant.slice(0, -1);
              setChatMessages(messagesWithoutLastUser);

              await sendChatMessage({
                role: 'user',
                parts: [{ type: 'text', text: textContent }],
              });
            }
          }
        } else if (message.role === 'user') {
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

          const messagesBeforeUser = chatMessages.slice(0, messageIndex);
          setChatMessages(messagesBeforeUser);

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

        const messagesBeforeEdit = chatMessages.slice(0, messageIndex);
        setChatMessages(messagesBeforeEdit);

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
        await fetchMessages();
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [conversationId, messages, chatMessages, setChatMessages, sendChatMessage, fetchMessages]
  );

  const editAssistantMessage = useCallback(
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
            body: JSON.stringify({ action: 'edit_assistant', content }),
          }
        );

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || '编辑消息失败');
        }

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

  const clearMessages = useCallback(() => {
    setChatMessages([]);
    setError(null);
  }, [setChatMessages]);

  useEffect(() => {
    if (autoFetch && conversationId) {
      fetchMessages();
    }
  }, [conversationId, autoFetch, fetchMessages]);

  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    if (prevStatus === 'streaming' && status !== 'streaming' && conversationId) {
      console.log('[useMessages] Streaming finished, onFinish will handle message update');
    }
  }, [status, conversationId]);

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
