'use client';

import * as React from 'react';
import { useState } from 'react';
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
import { Settings, Sliders, FileText } from 'lucide-react';
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
 * 支持的模型参数配置
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
    key: 'maxTokens',
    label: 'Max Tokens（最大输出）',
    description: '单次回复的最大 token 数量',
    min: 100,
    max: 8192,
    step: 100,
    defaultValue: 2048,
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* 模型参数 */}
        <TabsContent value="parameters" className="space-y-4">
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
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>

          {/* 上下文限制 */}
          <Card>
            <CardHeader>
              <CardTitle>上下文限制</CardTitle>
              <CardDescription>配置上下文管理策略（本地计数器）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxTokens">最大上下文 Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min={1024}
                  max={128000}
                  step={512}
                  value={preset.contextLimit.maxTokens}
                  onChange={(e) =>
                    updateContextLimit('maxTokens', parseInt(e.target.value) || 4096)
                  }
                  disabled={readOnly}
                />
                <p className="text-xs text-muted-foreground">
                  超过此限制将触发上下文管理策略
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="strategy">处理策略</Label>
                <Select
                  value={preset.contextLimit.strategy}
                  onValueChange={(value: any) => updateContextLimit('strategy', value)}
                  disabled={readOnly}
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

              <div className="space-y-2">
                <Label htmlFor="warningThreshold">警告阈值（{Math.round((preset.contextLimit.warningThreshold || 0.8) * 100)}%）</Label>
                <Slider
                  id="warningThreshold"
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  value={[preset.contextLimit.warningThreshold || 0.8]}
                  onValueChange={([value]) => updateContextLimit('warningThreshold', value)}
                  disabled={readOnly}
                />
                <p className="text-xs text-muted-foreground">
                  达到此比例时显示警告提示
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
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
                          disabled={readOnly}
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
                      disabled={readOnly || !isEnabled}
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