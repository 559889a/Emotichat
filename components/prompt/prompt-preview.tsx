'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Eye, Hash, AlertCircle } from 'lucide-react';
import { replaceVariables, getCurrentSystemVariables } from '@/lib/prompt/variables';
import { replacePlaceholders } from '@/lib/prompt/placeholders';
import { expandMacros, createMacroStore } from '@/lib/prompt/macros';
import { countTokens } from '@/lib/utils/token-counter';
import type { PromptItem, PromptRole, PromptBuildContext } from '@/types/prompt';
import { cn } from '@/lib/utils';

/**
 * 预览组件 Props
 */
interface PromptPreviewProps {
  items: PromptItem[];
  context?: Partial<PromptBuildContext>;
  maxHeight?: string;
  showTokenCount?: boolean;
  className?: string;
}

/**
 * 估算 Token 数量
 * 使用统一的 token-counter 工具
 * @param text - 文本内容
 * @param model - 模型名称（可选）
 * @returns Token 数量
 */
function estimateTokenCount(text: string, model: string = 'gpt-4'): number {
  return countTokens(text, { model, estimateMode: true });
}

/**
 * 处理单个提示词内容
 * 应用变量、占位符和宏替换
 */
function processPromptContent(
  content: string,
  context: PromptBuildContext,
  macroStore: Map<string, string>
): string {
  let result = content;
  
  // 1. 替换系统变量 ({{time}}, {{location}}, {{device_info}})
  result = replaceVariables(result, context);
  
  // 2. 替换占位符 ({{user}}, {{char}}, {{chat_history}}, {{last_user_message}})
  result = replacePlaceholders(result, context);
  
  // 3. 展开宏 ({{setvar::}}, {{getvar::}}, {{random::}})
  result = expandMacros(result, macroStore);
  
  return result;
}

/**
 * 获取角色对应的颜色样式
 */
function getRoleBadgeVariant(role: PromptRole): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'system':
      return 'default';
    case 'user':
      return 'secondary';
    case 'assistant':
      return 'outline';
    default:
      return 'default';
  }
}

/**
 * 获取角色对应的边框颜色
 */
function getRoleBorderClass(role: PromptRole): string {
  switch (role) {
    case 'system':
      return 'border-l-blue-500';
    case 'user':
      return 'border-l-green-500';
    case 'assistant':
      return 'border-l-purple-500';
    default:
      return 'border-l-gray-500';
  }
}

/**
 * 创建默认的构建上下文
 */
function createDefaultContext(
  partialContext?: Partial<PromptBuildContext>
): PromptBuildContext {
  const systemVars = getCurrentSystemVariables();
  
  return {
    characterId: partialContext?.characterId || 'preview-character',
    characterName: partialContext?.characterName || '示例角色',
    conversationId: partialContext?.conversationId || 'preview-conversation',
    userName: partialContext?.userName || '用户',
    messageHistory: partialContext?.messageHistory || [],
    lastUserMessage: partialContext?.lastUserMessage || '',
    systemVariables: {
      time: systemVars.time,
      location: systemVars.location || '未知位置',
      deviceInfo: systemVars.deviceInfo,
      ...partialContext?.systemVariables,
    },
    temporaryVariables: partialContext?.temporaryVariables || {},
  };
}

/**
 * 单条预览消息组件
 */
interface PreviewMessageProps {
  role: PromptRole;
  content: string;
  name?: string;
  enabled: boolean;
  tokenCount: number;
  hasInjection?: boolean;
  depth?: number;
}

function PreviewMessage({
  role,
  content,
  name,
  enabled,
  tokenCount,
  hasInjection,
  depth,
}: PreviewMessageProps) {
  return (
    <div
      className={cn(
        'border-l-4 pl-3 py-2 rounded-r',
        getRoleBorderClass(role),
        !enabled && 'opacity-50 bg-muted/30'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge variant={getRoleBadgeVariant(role)} className="text-xs">
          {role}
        </Badge>
        {name && (
          <span className="text-xs text-muted-foreground">{name}</span>
        )}
        {hasInjection && (
          <Badge variant="outline" className="text-xs">
            深度 {depth}
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          ~{tokenCount} tokens
        </span>
      </div>
      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
        {content || <span className="text-muted-foreground italic">（空内容）</span>}
      </pre>
    </div>
  );
}

/**
 * 提示词实时预览组件
 * 显示替换后的提示词和 Token 计数
 */
export function PromptPreview({
  items,
  context: partialContext,
  maxHeight = '400px',
  showTokenCount = true,
  className,
}: PromptPreviewProps) {
  // 创建完整的构建上下文
  const context = useMemo(
    () => createDefaultContext(partialContext),
    [partialContext]
  );

  // 处理所有提示词项
  const processedItems = useMemo(() => {
    const macroStore = createMacroStore(context.temporaryVariables);
    
    return items
      .filter((item) => item.enabled)
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const processedContent = processPromptContent(
          item.content,
          context,
          macroStore
        );
        const tokenCount = estimateTokenCount(processedContent);
        
        return {
          ...item,
          processedContent,
          tokenCount,
        };
      });
  }, [items, context]);

  // 计算总 token 数
  const totalTokens = useMemo(
    () => processedItems.reduce((sum, item) => sum + item.tokenCount, 0),
    [processedItems]
  );

  // 计算各角色的 token 分布
  const tokensByRole = useMemo(() => {
    const result: Record<PromptRole, number> = {
      system: 0,
      user: 0,
      assistant: 0,
    };
    
    processedItems.forEach((item) => {
      result[item.role] += item.tokenCount;
    });
    
    return result;
  }, [processedItems]);

  // 检查是否有未启用的项
  const disabledCount = items.filter((item) => !item.enabled).length;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            实时预览
          </CardTitle>
          {showTokenCount && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{totalTokens} tokens</span>
            </div>
          )}
        </div>
        
        {/* Token 分布条 */}
        {showTokenCount && totalTokens > 0 && (
          <div className="flex gap-2 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              System: {tokensByRole.system}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              User: {tokensByRole.user}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              Assistant: {tokensByRole.assistant}
            </span>
          </div>
        )}
        
        {/* 禁用项提示 */}
        {disabledCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-2">
            <AlertCircle className="h-3 w-3" />
            {disabledCount} 项已禁用，不会发送给 AI
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="p-0 flex-1">
        <ScrollArea style={{ maxHeight }}>
          <div className="p-4 space-y-3">
            {processedItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>暂无启用的提示词</p>
                <p className="text-xs mt-1">添加或启用提示词后将在此显示预览</p>
              </div>
            ) : (
              processedItems.map((item) => (
                <PreviewMessage
                  key={item.id}
                  role={item.role}
                  content={item.processedContent}
                  name={item.name}
                  enabled={item.enabled}
                  tokenCount={item.tokenCount}
                  hasInjection={item.injection?.enabled}
                  depth={item.injection?.depth}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * 估算提示词列表的总 Token 数
 */
export function estimateTotalTokens(items: PromptItem[]): number {
  return items
    .filter((item) => item.enabled)
    .reduce((sum, item) => sum + estimateTokenCount(item.content), 0);
}

export { estimateTokenCount };