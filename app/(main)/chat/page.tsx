"use client"

import { Suspense, useEffect, useState, useCallback, useMemo } from "react"
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
import { countMessagesTokens, calculateTokenUsage } from "@/lib/utils/token-counter"
import type { Conversation, ConversationSummary, UpdateConversationInput } from "@/types/conversation"
import type { Character } from "@/types/character"
import type { DevModeData, DevModeSettings } from "@/types/dev-mode"
import { getDefaultDevModeSettings } from "@/types/dev-mode"
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
  const [devModeSettings, setDevModeSettings] = useState<DevModeSettings>(getDefaultDevModeSettings())
  const [devModeData, setDevModeData] = useState<DevModeData | null>(null)
  const [showDevPanel, setShowDevPanel] = useState(false)

  // 从 localStorage 加载 Dev Mode 设置
  useEffect(() => {
    const saved = localStorage.getItem('devModeSettings')
    if (saved) {
      try {
        setDevModeSettings(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to parse dev mode settings:', error)
      }
    }
  }, [])

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

  // 加载状态
  if (conversationsLoading && !currentConversation && conversationId) {
    return (
      <ErrorBoundary>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ErrorBoundary>
    )
  }

  // 如果没有选中对话，显示主欢迎页面
  if (!conversationId || !currentConversation) {
    return (
      <ErrorBoundary>
      <div className="flex h-full items-center justify-center p-4 md:p-8">
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
      <div className="flex flex-col h-full">
        {/* Header with conversation title and settings */}
        <div className="flex-shrink-0 border-b bg-background px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
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

              {/* Dev Mode 按钮 */}
              {devModeSettings.enabled && devModeData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDevPanel(true)}
                  className="gap-1.5"
                >
                  <Code className="h-4 w-4" />
                  <span className="hidden sm:inline">Dev</span>
                </Button>
              )}
              
              <ConversationSettingsButton
                conversation={fullConversation}
                character={currentCharacter}
                onSave={handleSaveConversationSettings}
              />
            </div>
          </div>
        </div>
        
        {/* 消息列表或欢迎屏幕 */}
        {hasMessages ? (
          <MessageList
            messages={messages}
            characterName={currentCharacter?.name}
            characterAvatar={characterAvatar}
            loading={messagesLoading}
            onRetry={retryMessage}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onDeleteFollowing={deleteMessage}
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

        {/* Token 警告 */}
        {shouldShowTokenWarning && (
          <div className="px-3 py-2 sm:px-4 sm:py-3 border-t">
            <div className="max-w-4xl mx-auto">
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
        
        {/* 错误提示 */}
        {messagesError && (
          <div className="px-3 py-2 sm:px-4 bg-destructive/10 border-t border-destructive/20">
            <p className="text-xs sm:text-sm text-destructive text-center">
              {messagesError}
            </p>
          </div>
        )}

        {/* 底部输入框 */}
        <div className="border-t bg-background p-2 sm:p-3 md:p-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              onSend={(content) => {
                // 如果启用了 Dev Mode，收集调试数据
                if (devModeSettings.enabled) {
                  const startTime = Date.now()
                  
                  // 创建模拟的 Dev Mode 数据
                  // TODO: 在实际的 API 调用中收集真实数据
                  const mockDevData: DevModeData = {
                    id: crypto.randomUUID(),
                    conversationId: conversationId || '',
                    messageId: crypto.randomUUID(),
                    promptBuild: {
                      timestamp: new Date(),
                      duration: 0,
                      rawPromptItems: [],
                      processedMessages: [],
                      warnings: [],
                      sources: {
                        character: currentCharacter?.name,
                        conversation: conversationId || undefined,
                      },
                    },
                    apiRequest: {
                      timestamp: new Date(),
                      model: {
                        provider: fullConversation?.modelConfig?.providerId || 'openai',
                        modelId: fullConversation?.modelConfig?.modelId || 'gpt-4o',
                        parameters: fullConversation?.modelConfig?.parameters || {},
                      },
                      messages: [],
                      requestBody: {},
                    },
                    tokenAnalysis: {
                      perMessage: [],
                      total: {
                        input: totalTokens,
                        output: 0,
                        total: totalTokens,
                        limit: 128000,
                        percentage: (totalTokens / 128000) * 100,
                      },
                      warnings: [],
                    },
                    performance: {
                      promptBuildDuration: 0,
                      requestDuration: 0,
                      totalDuration: 0,
                    },
                    createdAt: new Date(),
                  }
                  
                  setDevModeData(mockDevData)
                  
                  // 如果设置了自动打开，则打开面板
                  if (devModeSettings.autoOpen) {
                    setShowDevPanel(true)
                  }
                }
                
                // 发送消息
                return sendMessage(content)
              }}
              disabled={messagesLoading}
              onStop={stop}
              placeholder={`向 ${currentCharacter?.name || 'AI'} 发送消息...`}
            />
          </div>
        </div>

        {/* Dev Mode 面板 */}
        <DevModePanel
          data={devModeData}
          isOpen={showDevPanel}
          onClose={() => setShowDevPanel(false)}
        />
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