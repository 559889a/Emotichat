'use client';

import Link from 'next/link';
import { MessageSquare, Sparkles, Code, Clock, ChevronRight } from 'lucide-react';
import { ChatControllerResult } from '@/hooks/useChatController';
import { NewConversationDialog } from './new-conversation-dialog';
import { WelcomeScreen } from './welcome-screen';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { ConversationSettingsButton } from './conversation-settings-dialog';
import { TokenUsageSummary, TokenCounter } from './token-counter';
import { DevModePanel } from './dev-mode-panel';
import { Badge } from '@/components/ui/badge';
import ErrorBoundary from '@/components/layout/error-boundary';

interface ChatScreenProps {
  controller: ChatControllerResult;
}

export function ChatScreen({ controller }: ChatScreenProps) {
  const {
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
    totalTokens,
    shouldShowTokenWarning,
    recentConversations,
    formatRelativeTime,
    handleSaveConversationSettings,
    handleCleanupMessages,
    handleSendMessage,
    retryMessage,
    editMessage,
    editAssistantMessage,
    deleteMessage,
    switchVersion,
    stop,
    hasMessages,
  } = controller;

  if (conversationsLoading && !currentConversation && conversationId) {
    return (
      <ErrorBoundary>
        <div className="h-full w-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!conversationId || !currentConversation) {
    const hasRecentChats = recentConversations.length > 0;

    return (
      <ErrorBoundary>
        <div className="h-full w-full flex items-center justify-center p-4 md:p-8 overflow-auto">
          <div className="flex flex-col items-center gap-6 md:gap-8 text-center max-w-2xl w-full px-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-2xl opacity-20"></div>
              <div className="relative bg-gradient-to-br from-pink-500 to-purple-500 p-6 rounded-full">
                <MessageSquare className="h-16 w-16 text-white" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                欢迎来到 EmotiChat
              </h1>
              <p className="text-xl text-muted-foreground">你的情感陪伴 AI，随时倾听与支持。</p>
            </div>

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
                    const char = characters.find((c) => c.id === conv.characterId);
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
                  <p className="text-sm text-muted-foreground">先进模型驱动的自然对话体验。</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <MessageSquare className="h-6 w-6 mb-2 text-purple-500" />
                  <h3 className="font-semibold mb-1">情感支持</h3>
                  <p className="text-sm text-muted-foreground">理解你的情绪，提供温暖陪伴。</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <Sparkles className="h-6 w-6 mb-2 text-pink-500" />
                  <h3 className="font-semibold mb-1">个性化体验</h3>
                  <p className="text-sm text-muted-foreground">根据喜好定制对话风格。</p>
                </div>
              </div>
            )}

            <NewConversationDialog
              variant="default"
              size="lg"
              className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            />

            <p className="text-sm text-muted-foreground mt-4">
              从左侧选择或创建一个对话开始聊天。
            </p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const characterAvatar = currentCharacter?.name.charAt(0).toUpperCase() || 'AI';

  return (
    <ErrorBoundary>
      <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden">
        <div
          className={`flex flex-col min-h-0 ${
            devModeSettings.enabled ? 'w-full lg:w-1/2 lg:h-full' : 'w-full'
          } h-full`}
        >
          <div className="flex-shrink-0 border-b bg-background px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
            <div className="flex items-center justify-between w-full max-w-full">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs sm:text-sm flex-shrink-0">
                  {characterAvatar}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm truncate">{currentConversation?.title || '新对话'}</h2>
                  <p className="text-xs text-muted-foreground truncate">{currentCharacter?.name || '未知角色'}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {messages.length > 0 && (
                  <TokenUsageSummary usedTokens={totalTokens} config={{ model: 'gpt-4', estimateMode: true }} />
                )}

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

          <div className="flex-1 min-h-0 overflow-hidden">
            {hasMessages ? (
              <MessageList
                messages={messages}
                conversationId={conversationId || undefined}
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
              !messagesLoading &&
              currentCharacter && (
                <WelcomeScreen
                  characterName={currentCharacter.name}
                  characterAvatar={characterAvatar}
                  characterDescription={currentCharacter.description}
                />
              )
            )}
          </div>

          {shouldShowTokenWarning && (
            <div className="flex-shrink-0 px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 border-t">
              <div className="w-full max-w-full">
                <TokenCounter
                  usedTokens={totalTokens}
                  config={{ model: 'gpt-4', estimateMode: true }}
                  showDetails={false}
                  showWarning
                  showCleanupSuggestion
                  onCleanup={handleCleanupMessages}
                  compact={false}
                />
              </div>
            </div>
          )}

          <div className="flex-shrink-0 border-t bg-background p-2 sm:p-3 md:p-4">
            <div className="w-full max-w-full">
              <ChatInput
                onSend={handleSendMessage}
                disabled={messagesLoading}
                onStop={stop}
                placeholder={`向${currentCharacter?.name || 'AI'} 发送消息...`}
              />
            </div>
          </div>
        </div>

        {devModeSettings.enabled && (
          <DevModePanel enabled={devModeSettings.enabled} logs={devModeLogs} onClearLogs={() => setDevModeLogs([])} />
        )}
      </div>
    </ErrorBoundary>
  );
}
