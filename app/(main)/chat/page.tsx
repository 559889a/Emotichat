"use client"

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { MessageSquare, Sparkles, Code } from "lucide-react"
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
    error: messagesError,
    sendMessage,
    retryMessage,
    editMessage,
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

  // Dev Mode: 监听消息变化，在 AI 回复完成时创建 devData
  useEffect(() => {
    if (!devModeSettings.enabled || !pendingRequestRef.current) return;

    // 检测是否有新的 assistant 消息（AI 回复完成）
    const lastMessage = messages[messages.length - 1];
    const isAssistantMessage = lastMessage?.role === 'assistant';
    const isNotLoading = !messagesLoading;

    if (isAssistantMessage && isNotLoading) {
      const pending = pendingRequestRef.current;
      const startTime = pending.timestamp.getTime();

      // 获取全局模型配置
      const globalConfig = getGlobalModelConfig();

      // 构建完整的消息数组（需要包含系统提示词）
      // 注意：这是简化版本，实际后端使用 buildPrompt 函数处理更复杂的逻辑
      const processedMessages: Array<{
        id: string;
        role: 'system' | 'user' | 'assistant';
        content: string;
        layer: number;
      }> = [];

      // 收集所有提示词项
      const allPromptItems: Array<{
        id: string;
        order: number;
        content: string;
        role: 'system' | 'user' | 'assistant';
        enabled: boolean;
        injection?: { enabled: boolean };
      }> = [];

      // 1. 添加角色的系统提示词（旧版本兼容）
      if (currentCharacter?.systemPrompt) {
        allPromptItems.push({
          id: `system-${currentCharacter.id}`,
          order: 0,
          content: currentCharacter.systemPrompt,
          role: 'system',
          enabled: true,
        });
      }

      // 2. 添加角色 promptConfig 中的提示词
      if (currentCharacter?.promptConfig?.prompts) {
        allPromptItems.push(...currentCharacter.promptConfig.prompts as any[]);
      }

      // 3. 添加对话级 promptConfig 中的提示词
      if (fullConversation?.promptConfig?.prompts) {
        allPromptItems.push(...fullConversation.promptConfig.prompts as any[]);
      }

      // 4. 添加对话主提示词（如果有）
      if (fullConversation?.promptConfig?.mainPrompt) {
        allPromptItems.push({
          id: `main-${fullConversation.id}`,
          order: 1000,
          content: fullConversation.promptConfig.mainPrompt,
          role: 'system',
          enabled: true,
        });
      }

      // 按 order 排序并过滤启用的、非注入的提示词
      allPromptItems
        .filter(p => p.enabled && !p.injection?.enabled)
        .sort((a, b) => a.order - b.order)
        .forEach((prompt) => {
          processedMessages.push({
            id: prompt.id,
            role: prompt.role,
            content: prompt.content,
            layer: processedMessages.length,
          });
        });

      // 5. 添加历史聊天消息
      pending.messagesBeforeSend.forEach((m) => {
        processedMessages.push({
          id: m.id,
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
          layer: processedMessages.length,
        });
      });

      // 6. 添加用户发送的消息
      processedMessages.push({
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: pending.userContent,
        layer: processedMessages.length,
      });

      // 7. 添加 AI 回复
      processedMessages.push({
        id: lastMessage.id,
        role: 'assistant' as const,
        content: lastMessage.content,
        layer: processedMessages.length,
      });

      // 构建完整请求体（包含所有参数）
      const parameters: any = fullConversation?.modelConfig?.parameters || {};
      const requestBody: any = {
        model: globalConfig?.modelId || fullConversation?.modelConfig?.modelId || 'gpt-4o',
        messages: processedMessages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content,
        })),
      };

      // 添加所有可用的模型参数
      if (parameters.temperature !== undefined) {
        requestBody.temperature = parameters.temperature;
      }
      if (parameters.topP !== undefined) {
        requestBody.top_p = parameters.topP;
      }
      if (parameters.maxTokens !== undefined && parameters.maxTokens > 0) {
        requestBody.max_tokens = parameters.maxTokens;
      }
      if (parameters.presencePenalty !== undefined) {
        requestBody.presence_penalty = parameters.presencePenalty;
      }
      if (parameters.frequencyPenalty !== undefined) {
        requestBody.frequency_penalty = parameters.frequencyPenalty;
      }
      if (parameters.topK !== undefined) {
        requestBody.top_k = parameters.topK;
      }
      if (parameters.stopSequences && parameters.stopSequences.length > 0) {
        requestBody.stop = parameters.stopSequences;
      }

      const devData: DevModeData = {
        id: crypto.randomUUID(),
        conversationId: pending.conversationId,
        messageId: lastMessage.id,
        promptBuild: {
          timestamp: pending.timestamp,
          duration: 0,
          rawPromptItems: [],
          processedMessages: processedMessages.slice(0, -1),
          warnings: [],
          sources: {
            character: currentCharacter?.name,
            conversation: pending.conversationId,
          },
        },
        apiRequest: {
          timestamp: pending.timestamp,
          model: {
            provider: globalConfig?.providerId || fullConversation?.modelConfig?.providerId || 'openai',
            modelId: globalConfig?.modelId || fullConversation?.modelConfig?.modelId || 'gpt-4o',
            parameters: fullConversation?.modelConfig?.parameters || {},
          },
          messages: processedMessages.slice(0, -1),
          requestBody: requestBody,
        },
        apiResponse: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
          tokenUsage: {
            promptTokens: Math.ceil(processedMessages.slice(0, -1).reduce((sum, m) => sum + m.content.length, 0) / 4),
            completionTokens: Math.ceil(lastMessage.content.length / 4),
            totalTokens: Math.ceil(processedMessages.reduce((sum, m) => sum + m.content.length, 0) / 4),
          },
          content: lastMessage.content,
        },
        tokenAnalysis: {
          perMessage: processedMessages.map(m => ({
            messageId: m.id,
            role: m.role,
            content: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
            tokens: Math.ceil(m.content.length / 4),
            percentage: 0,
            characters: m.content.length,
          })),
          total: {
            input: Math.ceil(processedMessages.slice(0, -1).reduce((sum, m) => sum + m.content.length, 0) / 4),
            output: Math.ceil(lastMessage.content.length / 4),
            total: Math.ceil(processedMessages.reduce((sum, m) => sum + m.content.length, 0) / 4),
            limit: 128000,
            percentage: (Math.ceil(processedMessages.reduce((sum, m) => sum + m.content.length, 0) / 4) / 128000) * 100,
          },
          warnings: [],
        },
        performance: {
          promptBuildDuration: 0,
          requestDuration: Date.now() - startTime,
          totalDuration: Date.now() - startTime,
        },
        createdAt: new Date(),
      };

      setDevModeLogs(prev => {
        const newLogs = [...prev, devData];
        // 最多保留配置的历史记录数
        if (newLogs.length > devModeSettings.maxHistorySize) {
          return newLogs.slice(-devModeSettings.maxHistorySize);
        }
        return newLogs;
      });

      // 清除待处理的请求
      pendingRequestRef.current = null;
    }
  }, [messages, messagesLoading, devModeSettings.enabled, devModeSettings.maxHistorySize, fullConversation, currentCharacter]);

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

          {/* 功能特点 */}
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
      <div className="h-full w-full flex flex-col lg:flex-row">
        {/* 主聊天区域 - 根据 Dev Mode 和屏幕尺寸调整宽度 */}
        <div className={`flex flex-col h-full ${devModeSettings.enabled ? 'w-full lg:w-1/2' : 'w-full'}`}>
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
                onRetry={retryMessage}
                onEdit={editMessage}
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