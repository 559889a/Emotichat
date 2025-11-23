'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Lock,
  Unlock,
  AlertCircle,
  Info,
  Copy,
  FileText,
} from 'lucide-react';
import { PromptEditor } from '@/components/prompt/prompt-editor';
import type { 
  ConversationPromptConfig, 
  CharacterPromptConfig,
  PromptItem, 
  MergedPromptItem,
  PromptMergeOptions,
} from '@/types/prompt';
import { getDefaultConversationPromptConfig } from '@/types/prompt';
import { cn } from '@/lib/utils';

/**
 * 对话提示词配置组件 Props
 */
interface ConversationPromptConfigProps {
  /** 当前对话配置 */
  value: ConversationPromptConfig;
  /** 配置变化回调 */
  onChange: (config: ConversationPromptConfig) => void;
  /** 角色提示词配置（用于继承显示） */
  characterPromptConfig?: CharacterPromptConfig;
  /** 角色名称 */
  characterName?: string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 额外的类名 */
  className?: string;
}

/**
 * 生成唯一 ID
 */
function generateId(prefix: string = 'item'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 合并提示词配置
 * 将角色配置和对话配置合并，返回带有来源信息的提示词列表
 */
export function mergePromptConfigs(
  characterConfig?: CharacterPromptConfig,
  conversationConfig?: ConversationPromptConfig,
  options?: PromptMergeOptions
): MergedPromptItem[] {
  const result: MergedPromptItem[] = [];
  
  // 如果对话配置选择覆盖角色提示词
  if (conversationConfig?.overrideCharacter) {
    // 只使用对话级提示词
    conversationConfig.prompts.forEach(prompt => {
      if (options?.includeDisabled || prompt.enabled) {
        result.push({
          ...prompt,
          source: 'conversation',
          isInherited: false,
          isOverridden: false,
        });
      }
    });
    return result.sort((a, b) => a.order - b.order);
  }
  
  // 默认：合并角色和对话提示词
  // 1. 首先添加角色级提示词
  if (characterConfig?.prompts) {
    characterConfig.prompts.forEach(prompt => {
      if (options?.includeDisabled || prompt.enabled) {
        // 检查是否被对话级覆盖
        const override = conversationConfig?.prompts.find(
          p => p.name === prompt.name || (p as MergedPromptItem).originalId === prompt.id
        );
        
        if (override) {
          // 使用对话级覆盖的版本
          result.push({
            ...override,
            source: 'conversation',
            isInherited: false,
            isOverridden: true,
            originalId: prompt.id,
          });
        } else {
          // 使用角色级版本
          result.push({
            ...prompt,
            source: 'character',
            isInherited: true,
            isOverridden: false,
          });
        }
      }
    });
  }
  
  // 2. 添加对话级独有的提示词（不是覆盖的）
  if (conversationConfig?.prompts) {
    conversationConfig.prompts.forEach(prompt => {
      const isOverride = characterConfig?.prompts.some(
        p => p.name === prompt.name || p.id === (prompt as MergedPromptItem).originalId
      );
      
      if (!isOverride && (options?.includeDisabled || prompt.enabled)) {
        result.push({
          ...prompt,
          source: 'conversation',
          isInherited: false,
          isOverridden: false,
        });
      }
    });
  }
  
  return result.sort((a, b) => a.order - b.order);
}

/**
 * 对话提示词配置组件
 * 
 * 功能：
 * - 显示从角色继承的提示词（只读/灰色显示）
 * - 允许添加对话专属的提示词
 * - 允许覆盖角色的提示词（Override）
 * - 显示继承状态
 */
export function ConversationPromptConfig({
  value,
  onChange,
  characterPromptConfig,
  characterName = '角色',
  readOnly = false,
  className,
}: ConversationPromptConfigProps) {
  // 折叠状态
  const [openSections, setOpenSections] = useState({
    inherited: true,
    mainPrompt: true,
    conversationPrompts: true,
  });

  // 切换折叠状态
  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // 计算合并后的提示词（用于预览）
  const mergedPrompts = useMemo(() => 
    mergePromptConfigs(characterPromptConfig, value, { includeDisabled: true }),
    [characterPromptConfig, value]
  );

  // 角色继承的提示词数量
  const inheritedCount = useMemo(() => 
    mergedPrompts.filter(p => p.isInherited).length,
    [mergedPrompts]
  );

  // 对话专属提示词数量
  const conversationOnlyCount = useMemo(() => 
    mergedPrompts.filter(p => p.source === 'conversation' && !p.isOverridden).length,
    [mergedPrompts]
  );

  // 覆盖的提示词数量
  const overriddenCount = useMemo(() => 
    mergedPrompts.filter(p => p.isOverridden).length,
    [mergedPrompts]
  );

  // 更新主提示词
  const handleMainPromptChange = useCallback((mainPrompt: string) => {
    onChange({
      ...value,
      mainPrompt,
    });
  }, [value, onChange]);

  // 更新覆盖角色开关
  const handleOverrideCharacterChange = useCallback((overrideCharacter: boolean) => {
    onChange({
      ...value,
      overrideCharacter,
    });
  }, [value, onChange]);

  // 更新对话提示词列表
  const handlePromptsChange = useCallback((prompts: PromptItem[]) => {
    onChange({
      ...value,
      prompts,
    });
  }, [value, onChange]);

  // 添加新的对话提示词
  const handleAddPrompt = useCallback(() => {
    const maxOrder = value.prompts.length > 0
      ? Math.max(...value.prompts.map(p => p.order))
      : (characterPromptConfig?.prompts.length || 0) - 1;
    
    const newPrompt: PromptItem = {
      id: generateId('conv-prompt'),
      order: maxOrder + 1,
      content: '',
      enabled: true,
      role: 'system',
      name: `对话提示词 ${value.prompts.length + 1}`,
      description: '对话专属的提示词',
    };
    
    onChange({
      ...value,
      prompts: [...value.prompts, newPrompt],
    });
  }, [value, onChange, characterPromptConfig]);

  // 复制角色提示词到对话（用于覆盖）
  const handleCopyCharacterPrompt = useCallback((prompt: PromptItem) => {
    const newPrompt: PromptItem = {
      ...prompt,
      id: generateId('override'),
      name: `${prompt.name} (覆盖)`,
      description: `覆盖角色的 "${prompt.name}"`,
    };
    
    onChange({
      ...value,
      prompts: [...value.prompts, newPrompt],
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
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* 概览信息 */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">提示词配置</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  继承 {inheritedCount}
                </Badge>
                {overriddenCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                    覆盖 {overriddenCount}
                  </Badge>
                )}
                {conversationOnlyCount > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    对话专属 {conversationOnlyCount}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 覆盖角色提示词开关 */}
        <Card className={cn(
          'transition-colors',
          value.overrideCharacter && 'border-yellow-200 dark:border-yellow-800'
        )}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {value.overrideCharacter ? (
                  <Unlock className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label className="text-sm font-medium">覆盖角色提示词</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {value.overrideCharacter 
                      ? '完全使用对话级提示词，忽略角色配置' 
                      : '继承角色提示词，可添加或覆盖特定项'}
                  </p>
                </div>
              </div>
              <Switch
                checked={value.overrideCharacter || false}
                onCheckedChange={handleOverrideCharacterChange}
                disabled={readOnly}
              />
            </div>
            
            {value.overrideCharacter && (
              <div className="mt-3 flex items-start gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  注意：开启后将完全忽略角色的提示词配置。如果只需要修改部分提示词，建议保持关闭并在下方添加覆盖项。
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 继承的角色提示词（只读显示） */}
        {!value.overrideCharacter && characterPromptConfig?.prompts && characterPromptConfig.prompts.length > 0 && (
          <Collapsible open={openSections.inherited} onOpenChange={() => toggleSection('inherited')}>
            <Card className="border-blue-100 dark:border-blue-900">
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-blue-500" />
                      <div>
                        <CardTitle className="text-sm">继承自 {characterName}</CardTitle>
                        <CardDescription className="text-xs">
                          这些提示词来自角色配置（只读）
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {characterPromptConfig.prompts.filter(p => p.enabled).length}/{characterPromptConfig.prompts.length} 项启用
                      </span>
                      {openSections.inherited ? (
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
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {characterPromptConfig.prompts.map((prompt) => {
                        const isOverridden = value.prompts.some(
                          p => p.name === prompt.name || (p as MergedPromptItem).originalId === prompt.id
                        );
                        
                        return (
                          <div
                            key={prompt.id}
                            className={cn(
                              'p-3 rounded border bg-muted/30',
                              !prompt.enabled && 'opacity-50',
                              isOverridden && 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {prompt.role}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {prompt.name || '未命名'}
                                </span>
                                {isOverridden && (
                                  <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                    已覆盖
                                  </Badge>
                                )}
                                {!prompt.enabled && (
                                  <Badge variant="outline" className="text-xs">
                                    已禁用
                                  </Badge>
                                )}
                              </div>
                              
                              {!isOverridden && !readOnly && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopyCharacterPrompt(prompt)}
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      覆盖
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>复制并覆盖这个提示词</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {prompt.content || '（空内容）'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* 对话主提示词 */}
        <Collapsible open={openSections.mainPrompt} onOpenChange={() => toggleSection('mainPrompt')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <div>
                      <CardTitle className="text-sm">对话主提示词</CardTitle>
                      <CardDescription className="text-xs">
                        此对话的额外上下文或指令
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {value.mainPrompt && (
                      <span className="text-xs text-muted-foreground">
                        {value.mainPrompt.length} 字符
                      </span>
                    )}
                    {openSections.mainPrompt ? (
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
                  value={value.mainPrompt || ''}
                  onChange={(e) => handleMainPromptChange(e.target.value)}
                  placeholder="在这里添加此对话特有的上下文、场景设定或额外指令..."
                  className="min-h-[120px] resize-y"
                  disabled={readOnly}
                />
                <div className="flex items-start gap-2 mt-2 p-2 rounded bg-muted/50">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    对话主提示词会追加到角色提示词之后，可用于设置特定场景或临时规则。
                    支持使用变量：{'{{user}}'} 代表用户，{'{{char}}'} 代表角色。
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* 对话专属提示词列表 */}
        <Collapsible open={openSections.conversationPrompts} onOpenChange={() => toggleSection('conversationPrompts')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    <div>
                      <CardTitle className="text-sm">对话提示词</CardTitle>
                      <CardDescription className="text-xs">
                        {value.overrideCharacter 
                          ? '此对话使用的所有提示词' 
                          : '此对话专属的额外提示词'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {value.prompts.filter(p => p.enabled).length}/{value.prompts.length} 项启用
                    </span>
                    {openSections.conversationPrompts ? (
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
                {value.prompts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">暂无对话提示词</p>
                    <p className="text-sm mt-1">
                      {value.overrideCharacter 
                        ? '添加提示词来定义此对话的行为' 
                        : '添加额外提示词或覆盖角色配置'}
                    </p>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        onClick={handleAddPrompt}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        添加提示词
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
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
                    
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-3"
                        onClick={handleAddPrompt}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        添加提示词
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* 合并预览（调试用） */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-muted-foreground">
                合并预览（开发模式）
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[200px]">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(mergedPrompts.map(p => ({
                    name: p.name,
                    source: p.source,
                    isInherited: p.isInherited,
                    isOverridden: p.isOverridden,
                    enabled: p.enabled,
                  })), null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * 导出默认配置函数
 */
export { getDefaultConversationPromptConfig };