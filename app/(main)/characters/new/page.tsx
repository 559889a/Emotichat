'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Sparkles, Save, X, Info, Loader2 } from 'lucide-react';
import { useCharacters } from '@/hooks/useCharacters';
import type { CreateCharacterInput } from '@/types/character';
import type { CharacterPromptConfig } from '@/types/prompt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptConfig, getDefaultPromptConfig } from '@/components/character/prompt-config';
import ErrorBoundary from '@/components/layout/error-boundary';

export default function NewCharacterPage() {
  const router = useRouter();
  const { createCharacter } = useCharacters();

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
      // 构建提交数据
      const submitData: CreateCharacterInput = {
        name: formData.name,
        description: formData.description,
        avatar: formData.avatar || undefined,
        personality,

        // 使用统一的提示词配置系统
        promptConfig,

        // 默认值
        memoryEnabled: true,
        temperature: 0.7,
        defaultModel: undefined,
      };

      await createCharacter(submitData);
      router.push('/characters');
    } catch (error) {
      console.error('Failed to create character:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/characters');
  };

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col overflow-hidden bg-background">
        {/* 顶部导航栏 */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">创建角色</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    配置角色的提示词和参数
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="hidden sm:flex"
                >
                  <X className="mr-2 h-4 w-4" />
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      创建角色
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="basic" className="gap-1.5">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">基本信息</span>
                  <span className="sm:hidden">基本</span>
                </TabsTrigger>
                <TabsTrigger value="prompts" className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">提示词配置</span>
                  <span className="sm:hidden">提示词</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <div className="max-w-4xl mx-auto">
                  {/* 基本信息 Tab */}
                  <TabsContent value="basic" className="mt-0 space-y-6 pb-6">
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
                  <TabsContent value="prompts" className="mt-0 pb-6">
                    {errors.prompt && (
                      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                        {errors.prompt}
                      </div>
                    )}
                    <PromptConfig
                      value={promptConfig}
                      onChange={setPromptConfig}
                      characterName={formData.name || '角色'}
                    />
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
