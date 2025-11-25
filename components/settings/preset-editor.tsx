'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PresetPromptEditor } from '@/components/preset/preset-prompt-editor';
import { Settings, Sliders, FileText, Lock, Unlock, Hash } from 'lucide-react';
import { countTokensForModel } from '@/lib/utils/token-counter';
import type { PromptPreset, ModelParameters, ContextLimitConfig } from '@/types/prompt';

/**
 * 预设编辑器 Props
 */
interface PresetEditorProps {
  /** 预设数据 */
  preset: PromptPreset;
  /** 预设变化回调 */
  onChange: (preset: PromptPreset) => void;
  /** 是否只读 */
  readOnly?: boolean;
}

/**
 * 模型参数配置项
 */
interface ParameterConfig {
  key: keyof ModelParameters;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

/**
 * 支持的模型参数配置（不含 maxTokens，已移至上下文限制区域）
 */
const PARAMETER_CONFIGS: ParameterConfig[] = [
  {
    key: 'temperature',
    label: 'Temperature（温度）',
    description: '控制输出的随机性。值越高，输出越有创造性；值越低，输出越确定',
    min: 0,
    max: 2,
    step: 0.1,
    defaultValue: 0.9,
  },
  {
    key: 'topP',
    label: 'Top P',
    description: '核采样参数。控制考虑的词汇范围，值越小输出越集中',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.9,
  },
  {
    key: 'topK',
    label: 'Top K',
    description: '限制采样的词汇数量（主要用于 Gemini）',
    min: 1,
    max: 100,
    step: 1,
    defaultValue: 40,
  },
  {
    key: 'presencePenalty',
    label: 'Presence Penalty（存在惩罚）',
    description: '降低重复主题的可能性（OpenAI）',
    min: -2,
    max: 2,
    step: 0.1,
    defaultValue: 0,
  },
  {
    key: 'frequencyPenalty',
    label: 'Frequency Penalty（频率惩罚）',
    description: '降低重复词汇的可能性（OpenAI）',
    min: -2,
    max: 2,
    step: 0.1,
    defaultValue: 0,
  },
];

/**
 * 预设编辑器组件
 *
 * 功能：
 * - 基本信息编辑（名称、描述）
 * - 模型参数配置 + Enable 开关 + 上下文限制
 * - 提示词编辑
 */
export function PresetEditor({ preset, onChange, readOnly = false }: PresetEditorProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [parametersLocked, setParametersLocked] = useState(true); // 防误触开关，默认锁定

  // 计算预设提示词的总 token 数
  const presetTokenCount = useMemo(() => {
    // 将所有启用的提示词内容合并计算
    const enabledPrompts = preset.prompts.filter(p => p.enabled);
    const totalText = enabledPrompts.map(p => p.content).join('\n');
    return countTokensForModel(totalText);
  }, [preset.prompts]);

  // 更新预设字段
  const updatePreset = <K extends keyof PromptPreset>(
    key: K,
    value: PromptPreset[K]
  ) => {
    onChange({
      ...preset,
      [key]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  // 更新模型参数
  const updateParameter = (key: keyof ModelParameters, value: number) => {
    updatePreset('parameters', {
      ...preset.parameters,
      [key]: value,
    });
  };

  // 切换参数启用状态
  const toggleParameter = (key: string, enabled: boolean) => {
    const newEnabledParams = enabled
      ? [...preset.enabledParameters, key]
      : preset.enabledParameters.filter((p) => p !== key);
    updatePreset('enabledParameters', newEnabledParams);
  };

  // 更新上下文限制
  const updateContextLimit = <K extends keyof ContextLimitConfig>(
    key: K,
    value: ContextLimitConfig[K]
  ) => {
    updatePreset('contextLimit', {
      ...preset.contextLimit,
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">
            <Settings className="h-4 w-4 mr-2" />
            基本信息
          </TabsTrigger>
          <TabsTrigger value="parameters">
            <Sliders className="h-4 w-4 mr-2" />
            模型参数
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <FileText className="h-4 w-4 mr-2" />
            提示词
          </TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>预设信息</CardTitle>
              <CardDescription>配置预设的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 预设名称 */}
              <div className="space-y-2">
                <Label htmlFor="name">预设名称</Label>
                <Input
                  id="name"
                  value={preset.name}
                  onChange={(e) => updatePreset('name', e.target.value)}
                  disabled={readOnly}
                  placeholder="例如：创意写作、精确回答..."
                />
              </div>

              {/* 预设描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">预设描述</Label>
                <Textarea
                  id="description"
                  value={preset.description || ''}
                  onChange={(e) => updatePreset('description', e.target.value)}
                  disabled={readOnly}
                  placeholder="简要描述这个预设的用途和特点..."
                  className="min-h-[100px]"
                />
              </div>

              <Separator className="my-4" />

              {/* 预设 Token 计数器 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">预设 Token 统计</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-semibold text-primary">
                    {presetTokenCount.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">tokens（估算）</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                统计所有已启用提示词的 Token 数量，帮助您控制预设大小
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 模型参数 */}
        <TabsContent value="parameters" className="space-y-4">
          {/* 防误触开关 */}
          <Card className={parametersLocked ? 'border-amber-500/50' : 'border-green-500/50'}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {parametersLocked ? (
                    <Lock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Unlock className="h-5 w-5 text-green-500" />
                  )}
                  <div className="space-y-0.5">
                    <Label htmlFor="parametersLock" className="text-base font-medium">
                      参数保护锁
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {parametersLocked
                        ? '参数已锁定，防止误触修改。关闭锁定后可编辑参数。'
                        : '参数已解锁，您可以修改以下所有参数。'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  id="parametersLock"
                  checked={!parametersLocked}
                  onCheckedChange={(checked) => setParametersLocked(!checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>输出设置</CardTitle>
              <CardDescription>
                配置 AI 响应的输出方式
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="stream">流式输出</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后 AI 将逐字输出响应，禁用后将一次性返回完整响应
                  </p>
                </div>
                <Switch
                  id="stream"
                  checked={preset.stream !== false} // 默认 true
                  onCheckedChange={(checked) => updatePreset('stream', checked)}
                  disabled={readOnly || parametersLocked}
                />
              </div>
            </CardContent>
          </Card>

          {/* 上下文限制 */}
          <Card>
            <CardHeader>
              <CardTitle>上下文限制</CardTitle>
              <CardDescription>配置上下文和输出的 Token 限制</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 独立容器：Token 限制设置 */}
              <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                <h4 className="font-medium text-sm">Token 限制设置</h4>

                {/* 最大上下文 Tokens - 条状滑块 + 数字输入 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contextMaxTokens">最大上下文 Tokens</Label>
                    <Input
                      id="contextMaxTokensInput"
                      type="number"
                      min={1024}
                      max={128000}
                      step={512}
                      value={preset.contextLimit.maxTokens}
                      onChange={(e) =>
                        updateContextLimit('maxTokens', parseInt(e.target.value) || 4096)
                      }
                      disabled={readOnly || parametersLocked}
                      className="w-28 h-8 text-right font-mono"
                    />
                  </div>
                  <Slider
                    id="contextMaxTokens"
                    min={1024}
                    max={128000}
                    step={512}
                    value={[preset.contextLimit.maxTokens]}
                    onValueChange={([value]) => updateContextLimit('maxTokens', value)}
                    disabled={readOnly || parametersLocked}
                  />
                  <p className="text-xs text-muted-foreground">
                    超过此限制将触发上下文管理策略
                  </p>
                </div>

                <Separator />

                {/* Max Tokens (最大输出) - 条状滑块 + 数字输入 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="maxTokens">Max Tokens（最大输出）</Label>
                      <Switch
                        checked={preset.enabledParameters.includes('maxTokens')}
                        onCheckedChange={(checked) => toggleParameter('maxTokens', checked)}
                        disabled={readOnly || parametersLocked}
                        className="h-5 w-9"
                      />
                    </div>
                    <Input
                      id="maxTokensInput"
                      type="number"
                      min={1}
                      max={64000}
                      step={100}
                      value={preset.parameters.maxTokens ?? 2048}
                      onChange={(e) =>
                        updateParameter('maxTokens', parseInt(e.target.value) || 2048)
                      }
                      disabled={readOnly || parametersLocked || !preset.enabledParameters.includes('maxTokens')}
                      className="w-28 h-8 text-right font-mono"
                    />
                  </div>
                  <Slider
                    id="maxTokens"
                    min={1}
                    max={64000}
                    step={100}
                    value={[preset.parameters.maxTokens ?? 2048]}
                    onValueChange={([value]) => updateParameter('maxTokens', value)}
                    disabled={readOnly || parametersLocked || !preset.enabledParameters.includes('maxTokens')}
                    className={!preset.enabledParameters.includes('maxTokens') ? 'opacity-50' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    单次回复的最大 token 数量
                    {!preset.enabledParameters.includes('maxTokens') && (
                      <span className="text-amber-500 ml-2">（未启用，不会发送给 API）</span>
                    )}
                  </p>
                </div>
              </div>

              {/* 处理策略 */}
              <div className="space-y-2">
                <Label htmlFor="strategy">处理策略</Label>
                <Select
                  value={preset.contextLimit.strategy}
                  onValueChange={(value: any) => updateContextLimit('strategy', value)}
                  disabled={readOnly || parametersLocked}
                >
                  <SelectTrigger id="strategy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sliding_window">滑动窗口（保留最近消息）</SelectItem>
                    <SelectItem value="summary">总结压缩（使用 AI 总结）</SelectItem>
                    <SelectItem value="truncate">截断（简单删除旧消息）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 警告阈值 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="warningThreshold">警告阈值</Label>
                  <span className="text-sm font-mono">{Math.round((preset.contextLimit.warningThreshold || 0.8) * 100)}%</span>
                </div>
                <Slider
                  id="warningThreshold"
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  value={[preset.contextLimit.warningThreshold || 0.8]}
                  onValueChange={([value]) => updateContextLimit('warningThreshold', value)}
                  disabled={readOnly || parametersLocked}
                />
                <p className="text-xs text-muted-foreground">
                  达到此比例时显示警告提示
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={parametersLocked ? 'opacity-75' : ''}>
            <CardHeader>
              <CardTitle>模型参数配置</CardTitle>
              <CardDescription>
                配置模型的生成参数。勾选 Enable 的参数会发送给 LLM API。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {PARAMETER_CONFIGS.map((config) => {
                const isEnabled = preset.enabledParameters.includes(config.key);
                const value = preset.parameters[config.key] ?? config.defaultValue;

                return (
                  <div key={config.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={config.key}>{config.label}</Label>
                        <p className="text-xs text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono min-w-[60px] text-right">
                          {typeof value === 'number' ? value.toFixed(config.step < 1 ? 2 : 0) : value}
                        </span>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => toggleParameter(config.key, checked)}
                          disabled={readOnly || parametersLocked}
                        />
                      </div>
                    </div>
                    <Slider
                      id={config.key}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      value={[typeof value === 'number' ? value : config.defaultValue]}
                      onValueChange={([newValue]) => updateParameter(config.key, newValue)}
                      disabled={readOnly || parametersLocked || !isEnabled}
                      className={!isEnabled ? 'opacity-50' : ''}
                    />
                    {!isEnabled && (
                      <p className="text-xs text-muted-foreground italic">
                        未启用，不会发送给 API
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 提示词编辑 */}
        <TabsContent value="prompts">
          <PresetPromptEditor
            value={preset.prompts}
            onChange={(prompts) => updatePreset('prompts', prompts)}
            title="提示词排序"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}