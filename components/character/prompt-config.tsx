'use client';

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { PromptEditor } from '@/components/prompt/prompt-editor';
import type { 
  CharacterPromptConfig, 
  PromptItem, 
  ExampleDialogue,
  PromptRole 
} from '@/types/prompt';
import { cn } from '@/lib/utils';

/**
 * 角色提示词配置组件 Props
 */
interface PromptConfigProps {
  /** 当前配置 */
  value: CharacterPromptConfig;
  /** 配置变化回调 */
  onChange: (config: CharacterPromptConfig) => void;
  /** 角色名称（用于变量预览） */
  characterName?: string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 额外的类名 */
  className?: string;
  /** 是否隐藏开场白（用于用户角色） */
  hideOpeningMessage?: boolean;
}

/**
 * 默认的 CharacterPromptConfig
 */
export function getDefaultPromptConfig(): CharacterPromptConfig {
  return {
    openingMessage: '',
    prompts: [
      {
        id: `system-${Date.now()}`,
        order: 0,
        content: '',
        enabled: true,
        role: 'system',
        name: 'System Prompt',
        description: '定义角色的核心行为和性格',
      },
    ],
    exampleDialogues: [],
    inheritFromPreset: undefined,
    overridePreset: false,
  };
}

/**
 * 生成唯一 ID
 */
function generateId(prefix: string = 'item'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 角色提示词配置组件
 * 
 * 包含：
 * - 开场白编辑器（第0层楼）
 * - System Prompt 编辑
 * - Jailbreak Prompt（可选）
 * - NSFW Prompt（可选）
 * - Example Dialogs（Few-shot Learning）
 */
export function PromptConfig({
  value,
  onChange,
  characterName = '角色',
  readOnly = false,
  className,
  hideOpeningMessage = false,
}: PromptConfigProps) {
  // 折叠状态
  const [openSections, setOpenSections] = useState({
    opening: true,
    systemPrompt: true,
  });

  // 切换折叠状态
  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // 更新开场白
  const handleOpeningMessageChange = useCallback((message: string) => {
    onChange({
      ...value,
      openingMessage: message,
    });
  }, [value, onChange]);

  // 更新提示词列表
  const handlePromptsChange = useCallback((prompts: PromptItem[]) => {
    onChange({
      ...value,
      prompts,
    });
  }, [value, onChange]);


  // 预览上下文
  const previewContext = {
    characterId: '',
    characterName,
    conversationId: '',
    userName: '用户',
    messageHistory: [],
    systemVariables: {
      time: new Date().toLocaleString('zh-CN'),
    },
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 开场白编辑（用户角色时隐藏） */}
      {!hideOpeningMessage && (
        <Collapsible open={openSections.opening} onOpenChange={() => toggleSection('opening')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">开场白</CardTitle>
                      <CardDescription className="text-xs">
                        角色的第一条消息（第0层楼）
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {value.openingMessage && (
                      <span className="text-xs text-muted-foreground">
                        {value.openingMessage.length} 字符
                      </span>
                    )}
                    {openSections.opening ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Textarea
                  value={value.openingMessage}
                  onChange={(e) => handleOpeningMessageChange(e.target.value)}
                  placeholder={`${characterName}走进房间，带着温暖的微笑看向你...`}
                  className="min-h-[120px] resize-y"
                  disabled={readOnly}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  提示：开场白支持使用 {'{{user}}'} 代表用户名称，{'{{char}}'} 代表角色名称
                </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* System Prompt 编辑 */}
      <Collapsible open={openSections.systemPrompt} onOpenChange={() => toggleSection('systemPrompt')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-base">提示词配置</CardTitle>
                    <CardDescription className="text-xs">
                      定义角色的行为、性格和背景
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {value.prompts.filter(p => p.enabled).length}/{value.prompts.length} 项启用
                  </span>
                  {openSections.systemPrompt ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <PromptEditor
                value={value.prompts}
                onChange={handlePromptsChange}
                previewContext={previewContext}
                showPreview={false}
                showActions={false}
                readOnly={readOnly}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

    </div>
  );
}

// 导出辅助函数
export { getDefaultPromptConfig as createDefaultPromptConfig };