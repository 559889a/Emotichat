'use client';

import { useState, useEffect } from 'react';
import { X, User, Sparkles, Info } from 'lucide-react';
import type { Character, CreateCharacterInput, UpdateCharacterInput } from '@/types/character';
import type { CharacterPromptConfig } from '@/types/prompt';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptConfig, getDefaultPromptConfig } from './prompt-config';

interface CharacterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: Character; // 如果提供，则为编辑模式
  onSubmit: (data: CreateCharacterInput | UpdateCharacterInput) => Promise<void>;
  isUserProfile?: boolean; // 是否为用户角色（隐藏开场白）
  asDialog?: boolean; // 是否作为Dialog显示（默认true）
}

/**
 * 向后兼容：从旧角色数据迁移到新的提示词配置
 */
function migrateOldCharacterToPromptConfig(character: Character): CharacterPromptConfig {
  // 如果已经有新的 promptConfig，直接返回
  if (character.promptConfig) {
    return character.promptConfig;
  }
  
  // 从旧格式迁移
  const config = getDefaultPromptConfig();
  
  // 迁移 systemPrompt
  if (character.systemPrompt) {
    config.prompts = [
      {
        id: `system-migrated-${Date.now()}`,
        order: 0,
        content: character.systemPrompt,
        enabled: true,
        role: 'system',
        name: 'System Prompt',
        description: '从旧版本迁移的系统提示词',
      },
    ];
  }
  
  // 迁移 background（如果有的话，合并到 system prompt）
  if (character.background) {
    const backgroundPrompt = {
      id: `background-migrated-${Date.now()}`,
      order: 1,
      content: character.background,
      enabled: true,
      role: 'system' as const,
      name: 'Background Story',
      description: '从旧版本迁移的背景故事',
    };
    config.prompts.push(backgroundPrompt);
  }
  
  // 迁移 exampleDialogues
  if (character.exampleDialogues && character.exampleDialogues.length > 0) {
    config.exampleDialogues = character.exampleDialogues.map((content, index) => {
      // 尝试解析旧的示例对话格式
      // 假设旧格式是 "User: xxx\nAssistant: xxx" 或类似
      const lines = content.split('\n');
      let user = '';
      let assistant = '';
      
      for (const line of lines) {
        if (line.toLowerCase().startsWith('user:')) {
          user = line.substring(5).trim();
        } else if (line.toLowerCase().startsWith('assistant:') || line.toLowerCase().startsWith('ai:')) {
          assistant = line.substring(line.indexOf(':') + 1).trim();
        }
      }
      
      // 如果解析失败，将整个内容作为 assistant
      if (!user && !assistant) {
        assistant = content;
      }
      
      return {
        id: `example-migrated-${Date.now()}-${index}`,
        order: index,
        user,
        assistant,
        enabled: true,
      };
    });
  }
  
  return config;
}

export function CharacterForm({ open, onOpenChange, character, onSubmit, isUserProfile = false, asDialog = true }: CharacterFormProps) {
  const isEditMode = !!character;
  
  // 基本信息状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatar: '',
  });
  
  // 提示词配置状态
  const [promptConfig, setPromptConfig] = useState<CharacterPromptConfig>(getDefaultPromptConfig());

  // UI 状态
  const [personalityInput, setPersonalityInput] = useState('');
  const [personality, setPersonality] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // 当角色数据变化时，更新表单
  useEffect(() => {
    if (character) {
      // 基本信息
      setFormData({
        name: character.name,
        description: character.description,
        avatar: character.avatar || '',
      });
      
      // 性格标签（保留用于显示）
      setPersonality(character.personality || []);

      // 提示词配置（带向后兼容迁移）
      setPromptConfig(migrateOldCharacterToPromptConfig(character));
    } else {
      // 重置表单
      setFormData({
        name: '',
        description: '',
        avatar: '',
      });
      setPersonality([]);
      setPromptConfig(getDefaultPromptConfig());
    }
    setErrors({});
    setPersonalityInput('');
    setActiveTab('basic');
  }, [character, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddPersonality = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && personalityInput.trim()) {
      e.preventDefault();
      const tag = personalityInput.trim();
      if (!personality.includes(tag)) {
        setPersonality(prev => [...prev, tag]);
      }
      setPersonalityInput('');
    }
  };

  const handleRemovePersonality = (tag: string) => {
    setPersonality(prev => prev.filter(t => t !== tag));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入角色名称';
    }
    if (!formData.description.trim()) {
      newErrors.description = '请输入角色描述';
    }
    
    // 检查是否有至少一个启用的提示词
    const enabledPrompts = promptConfig.prompts.filter(p => p.enabled);
    if (enabledPrompts.length === 0 && !promptConfig.openingMessage) {
      newErrors.prompt = '请至少添加一条提示词或开场白';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // 如果有验证错误，切换到相应的 Tab
      if (errors.name || errors.description) {
        setActiveTab('basic');
      } else if (errors.prompt) {
        setActiveTab('prompts');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // 如果是用户角色，清空开场白数据
      const finalPromptConfig = isUserProfile
        ? { ...promptConfig, openingMessage: '' }
        : promptConfig;

      // 构建提交数据
      const submitData: CreateCharacterInput | UpdateCharacterInput = {
        name: formData.name,
        description: formData.description,
        avatar: formData.avatar || undefined,
        personality,

        // 为了向后兼容，同时保存旧字段（从 promptConfig 提取）
        systemPrompt: finalPromptConfig.prompts.find(p => p.enabled && p.role === 'system')?.content || '',
        background: undefined, // 不再使用独立的 background 字段
        exampleDialogues: finalPromptConfig.exampleDialogues?.filter(e => e.enabled).map(e =>
          `User: ${e.user}\nAssistant: ${e.assistant}`
        ),

        // 新的提示词配置
        promptConfig: finalPromptConfig,
      };
      
      await onSubmit(submitData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 表单内容
  const formContent = (
    <form onSubmit={handleSubmit} className={asDialog ? "flex flex-col flex-1 min-h-0" : ""}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic" className="gap-1">
                  <User className="h-4 w-4" />
                  基本信息
                </TabsTrigger>
                <TabsTrigger value="prompts" className="gap-1">
                  <Sparkles className="h-4 w-4" />
                  提示词配置
                </TabsTrigger>
              </TabsList>
            </div>
            
            <ScrollArea className="flex-1 px-6">
              {/* 基本信息 Tab */}
              <TabsContent value="basic" className="mt-4 space-y-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    角色名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="例如：小艾"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    角色名称仅用于 UI 显示，不会发送给 AI
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    角色描述 <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="简短描述这个角色的特点..."
                    rows={3}
                    className={errors.description ? 'border-destructive' : ''}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    角色描述仅用于用户备注，不会发送给 AI
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar">头像 URL（可选）</Label>
                  <Input
                    id="avatar"
                    value={formData.avatar}
                    onChange={(e) => handleInputChange('avatar', e.target.value)}
                    placeholder="https://example.com/avatar.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    留空则使用首字母作为头像
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personality">性格标签（可选）</Label>
                  <Input
                    id="personality"
                    value={personalityInput}
                    onChange={(e) => setPersonalityInput(e.target.value)}
                    onKeyDown={handleAddPersonality}
                    placeholder="输入标签后按回车添加（例如：温柔、幽默）"
                  />
                  {personality.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {personality.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemovePersonality(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    性格标签仅用于 UI 显示和分类
                  </p>
                </div>
              </TabsContent>

              {/* 提示词配置 Tab */}
              <TabsContent value="prompts" className="mt-4 pb-4">
                {errors.prompt && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                    {errors.prompt}
                  </div>
                )}
                <PromptConfig
                  value={promptConfig}
                  onChange={setPromptConfig}
                  characterName={formData.name || '角色'}
                  hideOpeningMessage={isUserProfile}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {asDialog ? (
            <DialogFooter className="px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '提交中...' : (isEditMode ? '保存' : '创建')}
              </Button>
            </DialogFooter>
          ) : (
            <div className="flex justify-end gap-2 pt-6">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? '提交中...' : (isEditMode ? '保存' : '创建')}
              </Button>
            </div>
          )}
        </form>
  );

  // 根据 asDialog 决定是否使用 Dialog 包裹
  if (asDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{isEditMode ? '编辑角色' : '创建角色'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? '修改角色的设定和配置' : '创建一个新的 AI 角色'}
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  // 非 Dialog 模式，直接返回表单内容
  return formContent;
}