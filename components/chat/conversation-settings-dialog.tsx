'use client';

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Settings,
  FileText,
  Sparkles,
  Save,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ConversationPromptConfig as ConversationPromptConfigComponent, mergePromptConfigs } from './conversation-prompt-config';
import { ModelSelector } from './model-selector';
import { ModelParameters, type ModelParameters as ModelParametersType } from './model-parameters';
import type { Conversation, ConversationSummary, UpdateConversationInput, ConversationModelConfig } from '@/types/conversation';
import type { Character } from '@/types/character';
import type { ConversationPromptConfig } from '@/types/prompt';
import { getDefaultConversationPromptConfig } from '@/types/prompt';
import { cn } from '@/lib/utils';

/**
 * 对话设置对话框 Props
 */
interface ConversationSettingsDialogProps {
  /** 对话信息 */
  conversation: Conversation | ConversationSummary | null;
  /** 关联的角色 */
  character?: Character | null;
  /** 保存回调 */
  onSave?: (updates: UpdateConversationInput) => Promise<void>;
  /** 触发器按钮 */
  trigger?: React.ReactNode;
  /** 是否只读 */
  readOnly?: boolean;
  /** 额外的类名 */
  className?: string;
}

/**
 * 对话设置对话框
 * 
 * 包含：
 * - 基本信息（标题）
 * - 提示词配置
 * - 高级设置（预留）
 */
export function ConversationSettingsDialog({
  conversation,
  character,
  onSave,
  trigger,
  readOnly = false,
  className,
}: ConversationSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 表单状态
  const [title, setTitle] = useState('');
  const [promptConfig, setPromptConfig] = useState<ConversationPromptConfig>(
    getDefaultConversationPromptConfig()
  );
  const [modelConfig, setModelConfig] = useState<ConversationModelConfig | undefined>(undefined);
  
  // 是否有未保存的更改
  const [hasChanges, setHasChanges] = useState(false);

  // 初始化表单
  useEffect(() => {
    if (conversation && open) {
      setTitle(conversation.title || '');
      
      // 类型守卫：检查是否是完整的 Conversation 对象
      const fullConversation = conversation as Conversation;
      if (fullConversation.promptConfig) {
        setPromptConfig(fullConversation.promptConfig);
      } else {
        setPromptConfig(getDefaultConversationPromptConfig());
      }
      
      // 加载模型配置
      if (fullConversation.modelConfig) {
        setModelConfig(fullConversation.modelConfig);
      } else {
        setModelConfig(undefined);
      }
      
      setHasChanges(false);
      setError(null);
    }
  }, [conversation, open]);

  // 标题变化
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  }, []);

  // 提示词配置变化
  const handlePromptConfigChange = useCallback((config: ConversationPromptConfig) => {
    setPromptConfig(config);
    setHasChanges(true);
  }, []);

  // 模型配置变化
  const handleModelConfigChange = useCallback((value: string) => {
    if (!value) {
      setModelConfig(undefined);
    } else {
      const [providerId, modelId] = value.split(':');
      setModelConfig({
        providerId,
        modelId,
        parameters: modelConfig?.parameters // 保留现有参数
      });
    }
    setHasChanges(true);
  }, [modelConfig?.parameters]);

  // 模型参数变化
  const handleModelParametersChange = useCallback((params: ModelParametersType) => {
    setModelConfig(prev => ({
      providerId: prev?.providerId || '',
      modelId: prev?.modelId || '',
      parameters: params,
    }));
    setHasChanges(true);
  }, []);

  // 保存
  const handleSave = useCallback(async () => {
    if (!onSave || !conversation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const updates: UpdateConversationInput = {};
      
      // 只发送有变化的字段
      if (title !== conversation.title) {
        updates.title = title;
      }
      
      // 类型守卫：检查是否是完整的 Conversation 对象
      const fullConversation = conversation as Conversation;
      const originalConfig = fullConversation.promptConfig;
      
      // 比较提示词配置是否有变化
      const configChanged = JSON.stringify(promptConfig) !== JSON.stringify(originalConfig || getDefaultConversationPromptConfig());
      if (configChanged) {
        updates.promptConfig = promptConfig;
      }
      
      // 比较模型配置是否有变化
      const originalModelConfig = fullConversation.modelConfig;
      const modelConfigChanged = JSON.stringify(modelConfig) !== JSON.stringify(originalModelConfig);
      if (modelConfigChanged) {
        updates.modelConfig = modelConfig;
      }
      
      // 如果有更改才保存
      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }
      
      setHasChanges(false);
      setOpen(false);
    } catch (err) {
      console.error('保存对话设置失败:', err);
      setError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [onSave, conversation, title, promptConfig, modelConfig]);

  // 取消
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      // 可以在这里添加确认对话框
      const confirmed = window.confirm('有未保存的更改，确定要关闭吗？');
      if (!confirmed) return;
    }
    setOpen(false);
  }, [hasChanges]);

  // 关闭对话框时重置
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      const confirmed = window.confirm('有未保存的更改，确定要关闭吗？');
      if (!confirmed) return;
    }
    setOpen(newOpen);
  }, [hasChanges]);

  if (!conversation) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className={className}>
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            对话设置
          </DialogTitle>
          <DialogDescription>
            配置此对话的标题、提示词和其他设置
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              基本
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              提示词
            </TabsTrigger>
            <TabsTrigger value="model" className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              模型
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              高级
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 mt-4">
            {/* 基本信息 */}
            <TabsContent value="basic" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">对话标题</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="输入对话标题..."
                  disabled={readOnly || loading}
                />
                <p className="text-xs text-muted-foreground">
                  给这个对话起一个名字，方便识别和管理
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>关联角色</Label>
                <div className="p-3 rounded border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {character?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium">{character?.name || '未知角色'}</p>
                      <p className="text-xs text-muted-foreground">
                        {character?.description || '无描述'}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  角色关联在创建对话时确定，无法更改
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>对话统计</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded border bg-muted/30">
                    <p className="text-2xl font-bold">{conversation.messageCount || 0}</p>
                    <p className="text-xs text-muted-foreground">消息数量</p>
                  </div>
                  <div className="p-3 rounded border bg-muted/30">
                    <p className="text-sm font-medium">
                      {conversation.updatedAt 
                        ? new Date(conversation.updatedAt).toLocaleString('zh-CN')
                        : '-'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">最后更新</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* 提示词配置 */}
            <TabsContent value="prompts" className="mt-0">
              <ConversationPromptConfigComponent
                value={promptConfig}
                onChange={handlePromptConfigChange}
                characterPromptConfig={character?.promptConfig}
                characterName={character?.name}
                readOnly={readOnly || loading}
              />
            </TabsContent>
            
            {/* 模型配置 */}
            <TabsContent value="model" className="mt-0 space-y-4">
              {/* 模型选择 */}
              <div className="space-y-2">
                <Label htmlFor="model">AI 模型</Label>
                <ModelSelector
                  value={modelConfig ? `${modelConfig.providerId}:${modelConfig.modelId}` : ''}
                  onValueChange={handleModelConfigChange}
                  disabled={readOnly || loading}
                />
                <p className="text-xs text-muted-foreground">
                  选择此对话使用的 AI 模型。如果不选择，将使用默认模型。
                </p>
              </div>
              
              <Separator />
              
              {/* 模型参数 */}
              {modelConfig && (
                <>
                  <div className="space-y-2">
                    <Label>模型参数</Label>
                    <p className="text-xs text-muted-foreground">
                      调整模型的生成参数以控制输出质量和风格
                    </p>
                  </div>
                  
                  <ModelParameters
                    value={modelConfig.parameters}
                    onChange={handleModelParametersChange}
                    disabled={readOnly || loading}
                  />
                </>
              )}
              
              {!modelConfig && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    请先选择一个模型以配置参数
                  </p>
                </div>
              )}
            </TabsContent>
            
            {/* 高级设置 */}
            <TabsContent value="advanced" className="mt-0 space-y-4">
              {/* 未来功能提示 */}
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  更多高级设置（上下文长度、记忆管理等）将在后续版本中提供
                </p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
          
          {!readOnly && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading || !hasChanges}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 对话设置按钮（简化版，用于聊天界面 Header）
 */
interface ConversationSettingsButtonProps {
  conversation: Conversation | ConversationSummary | null;
  character?: Character | null;
  onSave?: (updates: UpdateConversationInput) => Promise<void>;
  className?: string;
}

export function ConversationSettingsButton({
  conversation,
  character,
  onSave,
  className,
}: ConversationSettingsButtonProps) {
  return (
    <ConversationSettingsDialog
      conversation={conversation}
      character={character}
      onSave={onSave}
      trigger={
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn('h-9 w-9', className)}
          title="对话设置"
        >
          <Settings className="h-5 w-5" />
        </Button>
      }
    />
  );
}