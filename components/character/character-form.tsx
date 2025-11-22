'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Character, CreateCharacterInput, UpdateCharacterInput } from '@/types/character';
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
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface CharacterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: Character; // 如果提供，则为编辑模式
  onSubmit: (data: CreateCharacterInput | UpdateCharacterInput) => Promise<void>;
}

export function CharacterForm({ open, onOpenChange, character, onSubmit }: CharacterFormProps) {
  const isEditMode = !!character;
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    personality: [] as string[],
    background: '',
    memoryEnabled: true,
    temperature: 0.7,
  });
  
  const [personalityInput, setPersonalityInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 当角色数据变化时，更新表单
  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name,
        description: character.description,
        systemPrompt: character.systemPrompt,
        personality: character.personality || [],
        background: character.background || '',
        memoryEnabled: character.memoryEnabled,
        temperature: character.temperature || 0.7,
      });
    } else {
      // 重置表单
      setFormData({
        name: '',
        description: '',
        systemPrompt: '',
        personality: [],
        background: '',
        memoryEnabled: true,
        temperature: 0.7,
      });
    }
    setErrors({});
    setPersonalityInput('');
  }, [character, open]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
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
      if (!formData.personality.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          personality: [...prev.personality, tag],
        }));
      }
      setPersonalityInput('');
    }
  };

  const handleRemovePersonality = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      personality: prev.personality.filter(t => t !== tag),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入角色名称';
    }
    if (!formData.description.trim()) {
      newErrors.description = '请输入角色描述';
    }
    if (!formData.systemPrompt.trim()) {
      newErrors.systemPrompt = '请输入系统提示词';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '编辑角色' : '创建角色'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? '修改角色的设定和配置' : '创建一个新的 AI 角色'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
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
                rows={2}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">
                系统提示词 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                placeholder="定义角色的行为和回复风格..."
                rows={4}
                className={errors.systemPrompt ? 'border-destructive' : ''}
              />
              {errors.systemPrompt && (
                <p className="text-sm text-destructive">{errors.systemPrompt}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="personality">性格标签</Label>
              <Input
                id="personality"
                value={personalityInput}
                onChange={(e) => setPersonalityInput(e.target.value)}
                onKeyDown={handleAddPersonality}
                placeholder="输入标签后按回车添加（例如：温柔、幽默）"
              />
              {formData.personality.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.personality.map((tag) => (
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="background">背景故事（可选）</Label>
              <Textarea
                id="background"
                value={formData.background}
                onChange={(e) => handleInputChange('background', e.target.value)}
                placeholder="角色的背景故事..."
                rows={3}
              />
            </div>
          </div>

          {/* 配置选项 */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">高级配置</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="memoryEnabled">启用记忆功能</Label>
                <p className="text-sm text-muted-foreground">
                  记住之前的对话内容
                </p>
              </div>
              <Switch
                id="memoryEnabled"
                checked={formData.memoryEnabled}
                onCheckedChange={(checked) => handleInputChange('memoryEnabled', checked)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature">温度系数</Label>
                <span className="text-sm text-muted-foreground">
                  {formData.temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={2}
                step={0.1}
                value={[formData.temperature]}
                onValueChange={([value]) => handleInputChange('temperature', value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                较低的值使回复更确定，较高的值使回复更有创造性
              </p>
            </div>
          </div>

          <DialogFooter>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}