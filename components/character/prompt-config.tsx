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
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  Shield,
  AlertTriangle,
  BookOpen,
  GripVertical,
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
}: PromptConfigProps) {
  // 折叠状态
  const [openSections, setOpenSections] = useState({
    opening: true,
    systemPrompt: true,
    jailbreak: false,
    nsfw: false,
    examples: false,
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

  // 更新示例对话
  const handleExampleDialoguesChange = useCallback((dialogues: ExampleDialogue[]) => {
    onChange({
      ...value,
      exampleDialogues: dialogues,
    });
  }, [value, onChange]);

  // 添加示例对话
  const handleAddExampleDialogue = useCallback(() => {
    const maxOrder = value.exampleDialogues && value.exampleDialogues.length > 0
      ? Math.max(...value.exampleDialogues.map(d => d.order))
      : -1;
    
    const newDialogue: ExampleDialogue = {
      id: generateId('example'),
      order: maxOrder + 1,
      user: '',
      assistant: '',
      enabled: true,
    };
    
    onChange({
      ...value,
      exampleDialogues: [...(value.exampleDialogues || []), newDialogue],
    });
  }, [value, onChange]);

  // 更新单个示例对话
  const handleUpdateExampleDialogue = useCallback((id: string, updates: Partial<ExampleDialogue>) => {
    onChange({
      ...value,
      exampleDialogues: (value.exampleDialogues || []).map(d => 
        d.id === id ? { ...d, ...updates } : d
      ),
    });
  }, [value, onChange]);

  // 删除示例对话
  const handleDeleteExampleDialogue = useCallback((id: string) => {
    onChange({
      ...value,
      exampleDialogues: (value.exampleDialogues || []).filter(d => d.id !== id),
    });
  }, [value, onChange]);

  // 移动示例对话
  const handleMoveExampleDialogue = useCallback((index: number, direction: 'up' | 'down') => {
    const dialogues = [...(value.exampleDialogues || [])].sort((a, b) => a.order - b.order);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= dialogues.length) return;
    
    // 交换 order
    const tempOrder = dialogues[index].order;
    dialogues[index] = { ...dialogues[index], order: dialogues[targetIndex].order };
    dialogues[targetIndex] = { ...dialogues[targetIndex], order: tempOrder };
    
    onChange({
      ...value,
      exampleDialogues: dialogues,
    });
  }, [value, onChange]);

  // 过滤特定类型的提示词
  const getPromptsByType = useCallback((type: 'system' | 'jailbreak' | 'nsfw'): PromptItem[] => {
    const namePatterns: Record<string, string[]> = {
      system: ['system', 'main', '主要', '系统'],
      jailbreak: ['jailbreak', 'jail', 'break', '越狱'],
      nsfw: ['nsfw', 'adult', '成人', 'r18'],
    };
    
    return value.prompts.filter(p => {
      const name = (p.name || '').toLowerCase();
      return namePatterns[type].some(pattern => name.includes(pattern));
    });
  }, [value.prompts]);

  // 检查是否有特定类型的提示词
  const hasPromptType = useCallback((type: 'jailbreak' | 'nsfw'): boolean => {
    return getPromptsByType(type).length > 0;
  }, [getPromptsByType]);

  // 添加特定类型的提示词
  const handleAddPromptType = useCallback((type: 'jailbreak' | 'nsfw') => {
    const maxOrder = value.prompts.length > 0
      ? Math.max(...value.prompts.map(p => p.order))
      : -1;
    
    const typeConfig: Record<string, { name: string; description: string }> = {
      jailbreak: {
        name: 'Jailbreak Prompt',
        description: '用于绕过模型限制的提示词（谨慎使用）',
      },
      nsfw: {
        name: 'NSFW Prompt',
        description: '成人内容相关提示词（确保符合使用条款）',
      },
    };
    
    const newPrompt: PromptItem = {
      id: generateId(type),
      order: maxOrder + 1,
      content: '',
      enabled: false, // 默认禁用
      role: 'system',
      name: typeConfig[type].name,
      description: typeConfig[type].description,
    };
    
    onChange({
      ...value,
      prompts: [...value.prompts, newPrompt],
    });
    
    // 展开对应区域
    setOpenSections(prev => ({
      ...prev,
      [type]: true,
    }));
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

  // 排序后的示例对话
  const sortedExamples = [...(value.exampleDialogues || [])].sort((a, b) => a.order - b.order);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 开场白编辑 */}
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
                title=""
                maxHeight="400px"
                readOnly={readOnly}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Jailbreak Prompt（可选） */}
      <Collapsible open={openSections.jailbreak} onOpenChange={() => toggleSection('jailbreak')}>
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-yellow-500" />
                  <div>
                    <CardTitle className="text-base">Jailbreak Prompt</CardTitle>
                    <CardDescription className="text-xs">
                      可选 - 用于绕过模型限制
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasPromptType('jailbreak') ? (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">已配置</span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddPromptType('jailbreak');
                      }}
                      disabled={readOnly}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      添加
                    </Button>
                  )}
                  {openSections.jailbreak ? (
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
              {hasPromptType('jailbreak') ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-700 dark:text-yellow-300">
                      Jailbreak 提示词已包含在上方的提示词列表中
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">点击上方&quot;添加&quot;按钮配置 Jailbreak Prompt</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* NSFW Prompt（可选） */}
      <Collapsible open={openSections.nsfw} onOpenChange={() => toggleSection('nsfw')}>
        <Card className="border-red-200 dark:border-red-900">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <CardTitle className="text-base">NSFW Prompt</CardTitle>
                    <CardDescription className="text-xs">
                      可选 - 成人内容提示词
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasPromptType('nsfw') ? (
                    <span className="text-xs text-red-600 dark:text-red-400">已配置</span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddPromptType('nsfw');
                      }}
                      disabled={readOnly}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      添加
                    </Button>
                  )}
                  {openSections.nsfw ? (
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
              {hasPromptType('nsfw') ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-red-700 dark:text-red-300">
                      NSFW 提示词已包含在上方的提示词列表中，请确保符合使用条款
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">点击上方&quot;添加&quot;按钮配置 NSFW Prompt</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Example Dialogs（Few-shot Learning） */}
      <Collapsible open={openSections.examples} onOpenChange={() => toggleSection('examples')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-500" />
                  <div>
                    <CardTitle className="text-base">示例对话</CardTitle>
                    <CardDescription className="text-xs">
                      Few-shot Learning - 教AI如何回复
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {sortedExamples.filter(e => e.enabled).length}/{sortedExamples.length} 组
                  </span>
                  {openSections.examples ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {sortedExamples.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">暂无示例对话</p>
                  <p className="text-sm mt-1">添加示例对话帮助AI学习回复风格</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={handleAddExampleDialogue}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加示例对话
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-3 pr-4">
                      {sortedExamples.map((example, index) => (
                        <ExampleDialogueEditor
                          key={example.id}
                          example={example}
                          index={index}
                          total={sortedExamples.length}
                          onChange={(updates) => handleUpdateExampleDialogue(example.id, updates)}
                          onDelete={() => handleDeleteExampleDialogue(example.id)}
                          onMoveUp={() => handleMoveExampleDialogue(index, 'up')}
                          onMoveDown={() => handleMoveExampleDialogue(index, 'down')}
                          readOnly={readOnly}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleAddExampleDialogue}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加示例对话
                  </Button>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

/**
 * 示例对话编辑器 Props
 */
interface ExampleDialogueEditorProps {
  example: ExampleDialogue;
  index: number;
  total: number;
  onChange: (updates: Partial<ExampleDialogue>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  readOnly?: boolean;
}

/**
 * 单个示例对话编辑器
 */
function ExampleDialogueEditor({
  example,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  readOnly = false,
}: ExampleDialogueEditorProps) {
  return (
    <Card className={cn(!example.enabled && 'opacity-60')}>
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          
          <Switch
            checked={example.enabled}
            onCheckedChange={(enabled) => onChange({ enabled })}
            disabled={readOnly}
          />
          
          <span className="text-sm text-muted-foreground flex-1">
            示例 #{index + 1}
          </span>
          
          <div className="flex gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveUp}
              disabled={readOnly || index === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveDown}
              disabled={readOnly || index === total - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={readOnly}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-2 space-y-3">
        {/* 用户消息 */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
              User
            </span>
            用户消息
          </Label>
          <Textarea
            value={example.user}
            onChange={(e) => onChange({ user: e.target.value })}
            placeholder="用户会说什么..."
            className="min-h-[60px] resize-y text-sm"
            disabled={readOnly}
          />
        </div>
        
        {/* AI 回复 */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs">
              Assistant
            </span>
            AI 回复
          </Label>
          <Textarea
            value={example.assistant}
            onChange={(e) => onChange({ assistant: e.target.value })}
            placeholder="角色会如何回复..."
            className="min-h-[80px] resize-y text-sm"
            disabled={readOnly}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// 导出辅助函数
export { getDefaultPromptConfig as createDefaultPromptConfig };