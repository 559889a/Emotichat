"use client"

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { MessageSquare, Sparkles, Code, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useConversationStore } from "@/stores/conversation"
import { useConversations } from "@/hooks/useConversations"
import { useCharacters } from "@/hooks/useCharacters"
import { useMessages } from "@/hooks/useMessages"
import { NewConversationDialog } from "@/components/chat/new-conversation-dialog"
import { WelcomeScreen } from "@/components/chat/welcome-screen"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { ConversationSettingsButton } from "@/components/chat/conversation-settings-dialog"
import { TokenUsageSummary, TokenCounter } from "@/components/chat/token-counter"
import { DevModePanel } from "@/components/chat/dev-mode-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { countMessagesTokens, calculateTokenUsage } from "@/lib/utils/token-counter"
import type { Conversation, ConversationSummary, UpdateConversationInput } from "@/types/conversation"
import type { Character } from "@/types/character"
import type { DevModeData, DevModeSettings } from "@/types/dev-mode"
import { getDefaultDevModeSettings } from "@/types/dev-mode"
import { getGlobalModelConfig } from "@/components/settings/global-endpoint-selector"
import ErrorBoundary from "@/components/layout/error-boundary"

function ChatPageLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

function ChatPageContent() {
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('id')
  
  const { setCurrentConversation } = useConversationStore()
  const { conversations, loading: conversationsLoading, refetch: refetchConversations } = useConversations()
  const { characters } = useCharacters()
  
  const [currentConversation, setCurrentConv] = useState<ConversationSummary | null>(null)
  const [fullConversation, setFullConv] = useState<Conversation | null>(null)
  const [currentCharacter, setCurrentChar] = useState<Character | null>(null)

  // Dev Mode 状态
  const [devModeLogs, setDevModeLogs] = useState<DevModeData[]>([])
  const pendingRequestRef = useRef<{
    userContent: string
    messagesBeforeSend: typeof messages
    timestamp: Date
    conversationId: string
  } | null>(null)

  // 从 localStorage 加载 Dev Mode 设置（使用 lazy initialization）
  const [devModeSettings, setDevModeSettings] = useState<DevModeSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devModeSettings')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (error) {
          console.error('Failed to parse dev mode settings:', error)
        }
      }
    }
    return getDefaultDevModeSettings()
  })

  // 使用消息管理 Hook
  const {
    messages,
    loading: messagesLoading,
    isStreaming,
    error: messagesError,
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
  })

  // 获取完整的对话信息（包含 promptConfig）
  useEffect(() => {
    if (conversationId) {
      // 强制重新加载消息
      fetchMessages(conversationId)
      
      setCurrentConversation(conversationId)
      const conv = conversations.find(c => c.id === conversationId)
      
      // 如果当前对话不在列表中（可能是新创建的），刷新列表
      if (!conv && !conversationsLoading) {
        refetchConversations()
      }
      
      setCurrentConv(conv || null)
      
      // 获取完整的对话信息
      if (conv) {
        fetch(`/api/conversations/${conversationId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setFullConv(data.data)
            }
          })
          .catch(err => console.error('Failed to fetch full conversation:', err))
        
        const char = characters.find(c => c.id === conv.characterId)
        setCurrentChar(char || null)
      }
    } else {
      setCurrentConversation(null)
      setCurrentConv(null)
      setFullConv(null)
      setCurrentChar(null)
    }
  }, [conversationId, conversations, characters, setCurrentConversation, fetchMessages, conversationsLoading, refetchConversations])
  
  // 保存对话设置
  const handleSaveConversationSettings = useCallback(async (updates: UpdateConversationInput) => {
    if (!conversationId) return
    
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '保存失败')
    }
    
    const data = await response.json()
    if (data.success) {
      // 更新本地状态
      setFullConv(data.data)
      // 刷新对话列表（标题可能已更改）
      refetchConversations()
    }
  }, [conversationId, refetchConversations])
  
  // 计算总 token 数和使用情况
  const totalTokens = useMemo(() => {
    return countMessagesTokens(messages, { estimateMode: true });
  }, [messages]);
  
  const tokenUsage = useMemo(() => {
    return calculateTokenUsage(totalTokens, { model: 'gpt-4', estimateMode: true });
  }, [totalTokens]);
  
  // 是否显示警告
  const shouldShowTokenWarning = tokenUsage.warningLevel !== 'safe';
  
  // 清理旧消息的处理函数
  const handleCleanupMessages = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;

    // 保留最近的 10 条消息
    const messagesToKeep = messages.slice(-10);

    // 这里应该调用 API 来更新消息列表
    // 暂时只是重新获取消息
    await fetchMessages(conversationId);
  }, [conversationId, messages, fetchMessages]);

  // Dev Mode: 前端估算的日志创建（已禁用，改用服务端数据）
  // 现在 DevMode 日志完全由 actualRequestBody 事件创建，确保显示的是真实发送给 LLM 的内容
  // 这个 useEffect 只用于在 AI 回复完成时清理 pendingRequestRef
  useEffect(() => {
    if (!devModeSettings.enabled || !pendingRequestRef.current) return;

    const lastMessage = messages[messages.length - 1];
    const isAssistantMessage = lastMessage?.role === 'assistant';
    const isNotLoading = !messagesLoading;

    if (isAssistantMessage && isNotLoading) {
      // 清理 pendingRequestRef，实际日志由 actualRequestBody 事件处理程序创建
      pendingRequestRef.current = null;
    }
  }, [messages, messagesLoading, devModeSettings.enabled]);

  // Dev Mode: 监听服务端实际请求体事件，直接创建/更新 devmode 日志
  useEffect(() => {
    if (!devModeSettings.enabled) return;

    const handleActualRequestBody = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { requestBody, conversationId: eventConvId } = customEvent.detail;

      if (eventConvId !== conversationId) return;

      console.log('[Dev Mode] Received actual request body from server:', {
        model: requestBody.model,
        messagesCount: requestBody.messages?.length,
        parameters: Object.keys(requestBody).filter(k => k !== 'model' && k !== 'messages')
      });

      // 获取全局模型配置
      const globalConfig = getGlobalModelConfig();

      // 从服务端请求体构建消息数组
      const serverMessages = (requestBody.messages || []).map((m: any, index: number) => ({
        id: `server-msg-${index}-${crypto.randomUUID().slice(0, 8)}`,
        role: m.role,
        content: m.content,
        layer: index,
      }));

      // 直接用服务端数据创建 DevMode 日志
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
          requestBody: requestBody, // 完整的服务端请求体
        },
        apiResponse: {
          timestamp: new Date(),
          duration: 0,
          tokenUsage: {
            promptTokens: Math.ceil(serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) / 4),
            completionTokens: 0,
            totalTokens: Math.ceil(serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) / 4),
          },
          content: '',
        },
        tokenAnalysis: {
          perMessage: serverMessages.map((m: any) => ({
            messageId: m.id,
            role: m.role,
            content: (m.content || '').substring(0, 100) + ((m.content?.length || 0) > 100 ? '...' : ''),
            tokens: Math.ceil((m.content?.length || 0) / 4),
            percentage: 0,
            characters: m.content?.length || 0,
          })),
          total: {
            input: Math.ceil(serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) / 4),
            output: 0,
            total: Math.ceil(serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) / 4),
            limit: 128000,
            percentage: (Math.ceil(serverMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0) / 4) / 128000) * 100,
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

      // 直接添加新日志（而不是更新）
      setDevModeLogs(prev => {
        const newLogs = [...prev, devData];
        // 最多保留配置的历史记录数
        if (newLogs.length > devModeSettings.maxHistorySize) {
          return newLogs.slice(-devModeSettings.maxHistorySize);
        }
        return newLogs;
      });

      // 清除待处理的请求（如果有）
      pendingRequestRef.current = null;
    };

    window.addEventListener('actualRequestBody', handleActualRequestBody);
    return () => {
      window.removeEventListener('actualRequestBody', handleActualRequestBody);
    };
  }, [devModeSettings.enabled, devModeSettings.maxHistorySize, conversationId, currentCharacter]);

  // 获取最近的3个对话（按更新时间排序）- 必须在所有早期返回之前调用
  const recentConversations = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];
    return [...conversations]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [conversations]);

  // 格式化相对时间
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

  // 加载状态
  if (conversationsLoading && !currentConversation && conversationId) {
    return (
      <ErrorBoundary>
        <div className="h-full w-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ErrorBoundary>
    )
  }

  // 如果没有选中对话，显示主欢迎页面
  if (!conversationId || !currentConversation) {
    const hasRecentChats = recentConversations.length > 0;

    return (
      <ErrorBoundary>
      <div className="h-full w-full flex items-center justify-center p-4 md:p-8 overflow-auto">
        <div className="flex flex-col items-center gap-6 md:gap-8 text-center max-w-2xl w-full px-4">
          {/* 图标 */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-2xl opacity-20"></div>
            <div className="relative bg-gradient-to-br from-pink-500 to-purple-500 p-6 rounded-full">
              <MessageSquare className="h-16 w-16 text-white" />
            </div>
          </div>

          {/* 标题 */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              欢迎来到 EmotiChat
            </h1>
            <p className="text-xl text-muted-foreground">
              您的情感陪护AI伴侣，随时倾听、理解和支持您
            </p>
          </div>

          {/* 最近聊天或功能特点 */}
          {hasRecentChats ? (
            <div className="w-full mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">最近的聊天</span>
                </div>
                <Link
                  href="/history"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  查看全部
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {recentConversations.map((conv) => {
                  const char = characters.find(c => c.id === conv.characterId);
                  const charAvatar = char?.name.charAt(0).toUpperCase() || 'AI';

                  return (
                    <Link
                      key={conv.id}
                      href={`/chat?id=${conv.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 transition-all group"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-primary font-medium shrink-0">
                        {charAvatar}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {conv.title || '新对话'}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {char?.name || '未知角色'} · {conv.messageCount || 0} 条消息
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground/60 shrink-0">
                        {formatRelativeTime(conv.updatedAt)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
              <div className="p-4 rounded-lg border bg-card">
                <Sparkles className="h-6 w-6 mb-2 text-pink-500" />
                <h3 className="font-semibold mb-1">智能对话</h3>
                <p className="text-sm text-muted-foreground">
                  基于先进AI技术的自然对话体验
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <MessageSquare className="h-6 w-6 mb-2 text-purple-500" />
                <h3 className="font-semibold mb-1">情感支持</h3>
                <p className="text-sm text-muted-foreground">
                  理解您的情绪，提供温暖的陪伴
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <Sparkles className="h-6 w-6 mb-2 text-pink-500" />
                <h3 className="font-semibold mb-1">个性化体验</h3>
                <p className="text-sm text-muted-foreground">
                  根据您的喜好定制对话风格
                </p>
              </div>
            </div>
          )}

          {/* 开始按钮 */}
          <NewConversationDialog
            variant="default"
            size="lg"
            className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          />

          <p className="text-sm text-muted-foreground mt-4">
            从左侧选择或创建一个对话开始聊天
          </p>
        </div>
      </div>
      </ErrorBoundary>
    )
  }

  // 获取角色头像首字母
  const characterAvatar = currentCharacter?.name.charAt(0).toUpperCase() || 'AI'
  const hasMessages = messages.length > 0

  // 显示对话界面
  return (
    <ErrorBoundary>
      <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden">
        {/* 主聊天区域 - 根据 Dev Mode 和屏幕尺寸调整宽度 */}
        <div className={`flex flex-col min-h-0 ${devModeSettings.enabled ? 'w-full lg:w-1/2 lg:h-full' : 'w-full'} h-full`}>
          {/* Header with conversation title and settings */}
          <div className="flex-shrink-0 border-b bg-background px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
            <div className="flex items-center justify-between w-full max-w-full">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs sm:text-sm flex-shrink-0">
                  {characterAvatar}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm truncate">{currentConversation?.title || '新对话'}</h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentCharacter?.name || '未知角色'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Token 使用摘要 */}
                {messages.length > 0 && (
                  <TokenUsageSummary
                    usedTokens={totalTokens}
                    config={{ model: 'gpt-4', estimateMode: true }}
                  />
                )}

                {/* Dev Mode 指示器 */}
                {devModeSettings.enabled && devModeLogs.length > 0 && (
                  <Badge variant="secondary" className="gap-1.5">
                    <Code className="h-3 w-3" />
                    <span className="hidden sm:inline">{devModeLogs.length}</span>
                  </Badge>
                )}

                <ConversationSettingsButton
                  conversation={fullConversation}
                  character={currentCharacter}
                  onSave={handleSaveConversationSettings}
                />
              </div>
            </div>
          </div>

          {/* 消息列表或欢迎屏幕 - 必须包裹在 flex-1 容器中 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {hasMessages ? (
              <MessageList
                messages={messages}
                characterName={currentCharacter?.name}
                characterAvatar={characterAvatar}
                loading={messagesLoading}
                isStreaming={isStreaming}
                onRetry={retryMessage}
                onEdit={editMessage}
                onEditAssistant={editAssistantMessage}
                onDelete={(messageId) => deleteMessage(messageId, false)}
                onDeleteFollowing={(messageId) => deleteMessage(messageId, true)}
                onVersionChange={switchVersion}
              />
            ) : (
              !messagesLoading && currentCharacter && (
                <WelcomeScreen
                  characterName={currentCharacter.name}
                  characterAvatar={characterAvatar}
                  characterDescription={currentCharacter.description}
                />
              )
            )}
          </div>

          {/* Token 警告 */}
          {shouldShowTokenWarning && (
            <div className="flex-shrink-0 px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 border-t">
              <div className="w-full max-w-full">
                <TokenCounter
                  usedTokens={totalTokens}
                  config={{ model: 'gpt-4', estimateMode: true }}
                  showDetails={false}
                  showWarning={true}
                  showCleanupSuggestion={true}
                  onCleanup={handleCleanupMessages}
                  compact={false}
                />
              </div>
            </div>
          )}

          {/* 底部输入框 */}
          <div className="flex-shrink-0 border-t bg-background p-2 sm:p-3 md:p-4">
            <div className="w-full max-w-full">
              <ChatInput
                onSend={async (content) => {
                  // 如果启用了 Dev Mode，记录请求信息
                  if (devModeSettings.enabled && conversationId) {
                    pendingRequestRef.current = {
                      userContent: content,
                      messagesBeforeSend: messages,
                      timestamp: new Date(),
                      conversationId,
                    };
                  }

                  // 发送消息
                  const result = await sendMessage(content);
                  return result;
                }}
                disabled={messagesLoading}
                onStop={stop}
                placeholder={`向 ${currentCharacter?.name || 'AI'} 发送消息...`}
              />
            </div>
          </div>
        </div>

        {/* Dev Mode 面板 - 占据右侧 50% */}
        {devModeSettings.enabled && (
          <DevModePanel
            enabled={devModeSettings.enabled}
            logs={devModeLogs}
            onClearLogs={() => setDevModeLogs([])}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageLoading />}>
      <ChatPageContent />
    </Suspense>
  )
}