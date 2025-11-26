'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConversationStore } from '@/stores/conversation';
import { useConversations } from './useConversations';
import { useCharacters } from './useCharacters';
import { useMessages } from './useMessages';
import { countMessagesTokens, calculateTokenUsage } from '@/lib/utils/token-counter';
import type { Conversation, ConversationSummary, UpdateConversationInput } from '@/types/conversation';
import type { Character } from '@/types/character';
import type { DevModeData, DevModeSettings } from '@/types/dev-mode';
import { getDefaultDevModeSettings } from '@/types/dev-mode';
import { getGlobalModelConfig } from '@/components/settings/global-endpoint-selector';

interface PendingRequestInfo {
  userContent: string;
  messagesBeforeSend: ReturnType<typeof useMessages>['messages'];
  timestamp: Date;
  conversationId: string;
}

export interface ChatControllerResult {
  conversationId: string | null;
  conversationsLoading: boolean;
  currentConversation: ConversationSummary | null;
  fullConversation: Conversation | null;
  currentCharacter: Character | null;
  characters: Character[];
  messages: ReturnType<typeof useMessages>['messages'];
  messagesLoading: boolean;
  isStreaming: boolean;
  devModeSettings: DevModeSettings;
  devModeLogs: DevModeData[];
  setDevModeLogs: (logs: DevModeData[]) => void;
  pendingRequestRef: React.MutableRefObject<PendingRequestInfo | null>;
  totalTokens: number;
  tokenUsage: ReturnType<typeof calculateTokenUsage>;
  shouldShowTokenWarning: boolean;
  recentConversations: ConversationSummary[];
  handleSaveConversationSettings: (updates: UpdateConversationInput) => Promise<void>;
  handleCleanupMessages: () => Promise<void>;
  handleSendMessage: (content: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  editAssistantMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteFollowing?: boolean) => Promise<void>;
  switchVersion: (messageId: string, versionId: string) => Promise<void>;
  stop: () => void;
  formatRelativeTime: (dateStr: string) => string;
  hasMessages: boolean;
}

export function useChatController(conversationId: string | null): ChatControllerResult {
  const { setCurrentConversation } = useConversationStore();
  const { conversations, loading: conversationsLoading, refetch: refetchConversations } = useConversations();
  const { characters } = useCharacters();

  const [currentConversation, setCurrentConv] = useState<ConversationSummary | null>(null);
  const [fullConversation, setFullConv] = useState<Conversation | null>(null);
  const [currentCharacter, setCurrentChar] = useState<Character | null>(null);
  const [devModeLogs, setDevModeLogs] = useState<DevModeData[]>([]);
  const pendingRequestRef = useRef<PendingRequestInfo | null>(null);

  const [devModeSettings] = useState<DevModeSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devModeSettings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Failed to parse dev mode settings:', error);
        }
      }
    }
    return getDefaultDevModeSettings();
  });

  const {
    messages,
    loading: messagesLoading,
    isStreaming,
    sendMessage,
    retryMessage,
    editMessage,
    editAssistantMessage,
    deleteMessage,
    switchVersion,
    fetchMessages,
    stop,
  } = useMessages({
    conversationId,
    autoFetch: true,
  });

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);

      setCurrentConversation(conversationId);
      const conv = conversations.find((c) => c.id === conversationId);

      if (!conv && !conversationsLoading) {
        refetchConversations();
      }

      setCurrentConv(conv || null);

      if (conv) {
        fetch(`/api/conversations/${conversationId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setFullConv(data.data);
            }
          })
          .catch((err) => console.error('Failed to fetch full conversation:', err));

        const char = characters.find((c) => c.id === conv.characterId);
        setCurrentChar(char || null);
      }
    } else {
      setCurrentConversation(null);
      setCurrentConv(null);
      setFullConv(null);
      setCurrentChar(null);
    }
  }, [
    conversationId,
    conversations,
    characters,
    setCurrentConversation,
    fetchMessages,
    conversationsLoading,
    refetchConversations,
  ]);

  const handleSaveConversationSettings = useCallback(
    async (updates: UpdateConversationInput) => {
      if (!conversationId) return;

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存失败');
      }

      const data = await response.json();
      if (data.success) {
        setFullConv(data.data);
        refetchConversations();
      }
    },
    [conversationId, refetchConversations]
  );

  const totalTokens = useMemo(() => countMessagesTokens(messages, { estimateMode: true }), [messages]);
  const tokenUsage = useMemo(
    () => calculateTokenUsage(totalTokens, { model: 'gpt-4', estimateMode: true }),
    [totalTokens]
  );
  const shouldShowTokenWarning = tokenUsage.warningLevel !== 'safe';

  const handleCleanupMessages = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;
    await fetchMessages(conversationId);
  }, [conversationId, messages, fetchMessages]);

  useEffect(() => {
    if (!devModeSettings.enabled || !pendingRequestRef.current) return;

    const lastMessage = messages[messages.length - 1];
    const isAssistantMessage = lastMessage?.role === 'assistant';
    const isNotLoading = !messagesLoading;

    if (isAssistantMessage && isNotLoading) {
      pendingRequestRef.current = null;
    }
  }, [messages, messagesLoading, devModeSettings.enabled]);

  useEffect(() => {
    if (!devModeSettings.enabled) return;

    const handleActualRequestBody = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { requestBody, conversationId: eventConvId } = customEvent.detail;

      if (eventConvId !== conversationId) return;

      const globalConfig = getGlobalModelConfig();

      const serverMessages = (requestBody.messages || []).map((m: any, index: number) => ({
        id: `server-msg-${index}-${crypto.randomUUID().slice(0, 8)}`,
        role: m.role,
        content: m.content,
        layer: index,
      }));

      const devData: DevModeData = {
        id: crypto.randomUUID(),
        conversationId: conversationId || '',
        messageId: `server-response-${Date.now()}`,
        promptBuild: {
          timestamp: new Date(),
          duration: 0,
          rawPromptItems: [],
          processedMessages: serverMessages,
          warnings: [],
          sources: {
            character: currentCharacter?.name,
            conversation: conversationId || '',
          },
        },
        apiRequest: {
          timestamp: new Date(),
          model: {
            provider: globalConfig?.providerId || 'unknown',
            modelId: requestBody.model || globalConfig?.modelId || 'unknown',
            parameters: {
              temperature: requestBody.temperature,
              top_p: requestBody.top_p,
              max_tokens: requestBody.max_tokens,
              presence_penalty: requestBody.presence_penalty,
              frequency_penalty: requestBody.frequency_penalty,
            },
          },
          messages: serverMessages,
          requestBody: requestBody,
        },
        apiResponse: {
          timestamp: new Date(),
          duration: 0,
          tokenUsage: {
            promptTokens: Math.ceil(
              serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) / 4
            ),
            completionTokens: 0,
            totalTokens: Math.ceil(
              serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) / 4
            ),
          },
          content: '',
        },
        tokenAnalysis: {
          perMessage: serverMessages.map((m: any) => ({
            messageId: m.id,
            role: m.role,
            content:
              (m.content || '').substring(0, 100) +
              ((m.content?.length || 0) > 100 ? '...' : ''),
            tokens: Math.ceil((m.content?.length || 0) / 4),
            percentage: 0,
            characters: m.content?.length || 0,
          })),
          total: {
            input: Math.ceil(
              serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) / 4
            ),
            output: 0,
            total: Math.ceil(
              serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) / 4
            ),
            limit: 128000,
            percentage:
              (Math.ceil(
                serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) /
                  4
              ) /
                128000) *
              100,
          },
          warnings: [],
        },
        performance: {
          promptBuildDuration: 0,
          requestDuration: 0,
          totalDuration: 0,
        },
        createdAt: new Date(),
      };

      setDevModeLogs((prev) => {
        const newLogs = [...prev, devData];
        if (newLogs.length > devModeSettings.maxHistorySize) {
          return newLogs.slice(-devModeSettings.maxHistorySize);
        }
        return newLogs;
      });

      pendingRequestRef.current = null;
    };

    window.addEventListener('actualRequestBody', handleActualRequestBody);
    return () => {
      window.removeEventListener('actualRequestBody', handleActualRequestBody);
    };
  }, [devModeSettings.enabled, devModeSettings.maxHistorySize, conversationId, currentCharacter]);

  const recentConversations = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];
    return [...conversations]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [conversations]);

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (devModeSettings.enabled && conversationId) {
        pendingRequestRef.current = {
          userContent: content,
          messagesBeforeSend: messages,
          timestamp: new Date(),
          conversationId,
        };
      }
      await sendMessage(content);
    },
    [conversationId, devModeSettings.enabled, messages, sendMessage]
  );

  return {
    conversationId,
    conversationsLoading,
    currentConversation,
    fullConversation,
    currentCharacter,
    characters,
    messages,
    messagesLoading,
    isStreaming,
    devModeSettings,
    devModeLogs,
    setDevModeLogs,
    pendingRequestRef,
    totalTokens,
    tokenUsage,
    shouldShowTokenWarning,
    recentConversations,
    handleSaveConversationSettings,
    handleCleanupMessages,
    handleSendMessage,
    retryMessage,
    editMessage,
    editAssistantMessage,
    deleteMessage,
    switchVersion,
    stop,
    formatRelativeTime,
    hasMessages: messages.length > 0,
  };
}
