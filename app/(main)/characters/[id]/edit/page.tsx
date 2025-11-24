'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, User, Sparkles, Save, X, Info, Loader2, AlertCircle } from 'lucide-react';
import { useCharacters } from '@/hooks/useCharacters';
import type { Character, UpdateCharacterInput } from '@/types/character';
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

export default function EditCharacterPage() {
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;
  const { characters, updateCharacter } = useCharacters();

  // 角色数据
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

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

  // 加载角色数据
  useEffect(() => {
    const foundCharacter = characters.find(c => c.id === characterId);
    if (foundCharacter) {
      setCharacter(foundCharacter);

      // 基本信息
      setFormData({
        name: foundCharacter.name,
        description: foundCharacter.description,
        avatar: foundCharacter.avatar || '',
      });

      // 性格标签
      setPersonality(foundCharacter.personality || []);

      // 提示词配置（带向后兼容迁移）
      setPromptConfig(migrateOldCharacterToPromptConfig(foundCharacter));

      setLoading(false);
    } else if (characters.length > 0) {
      // 角色列表已加载但未找到角色，重定向
      router.push('/characters');
    }
  }, [characterId, characters, router]);

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
      const submitData: UpdateCharacterInput = {
        name: formData.name,
        description: formData.description,
        avatar: formData.avatar || undefined,
        personality,

        // 为了向后兼容，同时保存旧字段（从 promptConfig 提取）
        systemPrompt: promptConfig.prompts.find(p => p.enabled && p.role === 'system')?.content || '',
        background: undefined,
        exampleDialogues: [],

        // 新的提示词配置
        promptConfig,

        // 保留原有值
        memoryEnabled: character?.memoryEnabled ?? true,
        temperature: character?.temperature ?? 0.7,
        defaultModel: character?.defaultModel,
      };

      await updateCharacter(characterId, submitData);
      router.push('/characters');
    } catch (error) {
      console.error('Failed to update character:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/characters');
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>加载角色数据中...</p>
        </div>
      </div>
    );
  }

  // 角色不存在
  if (!character) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4 text-destructive max-w-md text-center">
          <AlertCircle className="h-12 w-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">角色不存在</h3>
            <p className="text-sm text-muted-foreground">找不到指定的角色</p>
          </div>
          <Button onClick={() => router.push('/characters')} variant="outline">
            返回角色列表
          </Button>
        </div>
      </div>
    );
  }

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
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">编辑角色</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    修改 &quot;{character.name}&quot; 的提示词和参数
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
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      保存更改
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
