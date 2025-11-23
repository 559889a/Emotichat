'use client';

/**
 * 模型参数配置组件
 * 支持配置 temperature、top_p、max_tokens 等模型参数
 */

import * as React from 'react';
import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * 模型参数接口
 */
export interface ModelParameters {
  temperature?: number;       // 温度参数 (0-2)
  topP?: number;             // Top P 参数 (0-1)
  maxTokens?: number;        // 最大输出 token 数
  presencePenalty?: number;  // 存在惩罚 (-2 到 2)
  frequencyPenalty?: number; // 频率惩罚 (-2 到 2)
}

interface ModelParametersProps {
  value?: ModelParameters;
  onChange?: (params: ModelParameters) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 参数说明文本
 */
const PARAMETER_DESCRIPTIONS = {
  temperature: '控制输出的随机性。较高的值（如 1.5）使输出更加随机和创造性，较低的值（如 0.3）使输出更加确定和一致。',
  topP: '控制采样的多样性。较低的值使模型更加保守，较高的值允许更多可能性。',
  maxTokens: '限制模型生成的最大 token 数量。留空则使用模型的默认限制。',
  presencePenalty: '正值会减少模型重复已讨论过的主题的倾向。负值会增加重复。',
  frequencyPenalty: '正值会减少模型逐字重复相同内容的倾向。负值会增加重复。',
};

/**
 * 默认参数值
 */
const DEFAULT_PARAMETERS: Required<ModelParameters> = {
  temperature: 0.7,
  topP: 1.0,
  maxTokens: 0,
  presencePenalty: 0,
  frequencyPenalty: 0,
};

/**
 * 参数信息提示组件
 */
function ParameterTooltip({ description }: { description: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ModelParameters({
  value = {},
  onChange,
  disabled = false,
  className,
}: ModelParametersProps) {
  // 合并默认值
  const params = {
    ...DEFAULT_PARAMETERS,
    ...value,
  };

  // 更新参数
  const handleChange = (key: keyof ModelParameters, newValue: number) => {
    onChange?.({
      ...value,
      [key]: newValue,
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="temperature">Temperature</Label>
            <ParameterTooltip description={PARAMETER_DESCRIPTIONS.temperature} />
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {params.temperature.toFixed(2)}
          </span>
        </div>
        <Slider
          id="temperature"
          value={[params.temperature]}
          onValueChange={([v]) => handleChange('temperature', v)}
          min={0}
          max={2}
          step={0.1}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>精确 (0)</span>
          <span>平衡 (0.7)</span>
          <span>创造性 (2)</span>
        </div>
      </div>

      {/* Top P */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="topP">Top P</Label>
            <ParameterTooltip description={PARAMETER_DESCRIPTIONS.topP} />
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {params.topP.toFixed(2)}
          </span>
        </div>
        <Slider
          id="topP"
          value={[params.topP]}
          onValueChange={([v]) => handleChange('topP', v)}
          min={0}
          max={1}
          step={0.05}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>保守 (0)</span>
          <span>默认 (1)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <ParameterTooltip description={PARAMETER_DESCRIPTIONS.maxTokens} />
        </div>
        <Input
          id="maxTokens"
          type="number"
          value={params.maxTokens || ''}
          onChange={(e) => {
            const value = e.target.value;
            handleChange('maxTokens', value ? parseInt(value, 10) : 0);
          }}
          placeholder="默认（不限制）"
          min={0}
          max={100000}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          留空或设为 0 使用模型的默认限制
        </p>
      </div>

      {/* Presence Penalty */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="presencePenalty">Presence Penalty</Label>
            <ParameterTooltip description={PARAMETER_DESCRIPTIONS.presencePenalty} />
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {params.presencePenalty.toFixed(2)}
          </span>
        </div>
        <Slider
          id="presencePenalty"
          value={[params.presencePenalty]}
          onValueChange={([v]) => handleChange('presencePenalty', v)}
          min={-2}
          max={2}
          step={0.1}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>增加重复 (-2)</span>
          <span>中性 (0)</span>
          <span>减少重复 (2)</span>
        </div>
      </div>

      {/* Frequency Penalty */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="frequencyPenalty">Frequency Penalty</Label>
            <ParameterTooltip description={PARAMETER_DESCRIPTIONS.frequencyPenalty} />
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {params.frequencyPenalty.toFixed(2)}
          </span>
        </div>
        <Slider
          id="frequencyPenalty"
          value={[params.frequencyPenalty]}
          onValueChange={([v]) => handleChange('frequencyPenalty', v)}
          min={-2}
          max={2}
          step={0.1}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>增加重复 (-2)</span>
          <span>中性 (0)</span>
          <span>减少重复 (2)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 简化版模型参数组件（仅显示主要参数）
 */
interface SimpleModelParametersProps {
  value?: ModelParameters;
  onChange?: (params: ModelParameters) => void;
  disabled?: boolean;
  className?: string;
}

export function SimpleModelParameters({
  value = {},
  onChange,
  disabled = false,
  className,
}: SimpleModelParametersProps) {
  const params = {
    temperature: value.temperature ?? DEFAULT_PARAMETERS.temperature,
    topP: value.topP ?? DEFAULT_PARAMETERS.topP,
  };

  const handleChange = (key: keyof ModelParameters, newValue: number) => {
    onChange?.({
      ...value,
      [key]: newValue,
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="simple-temperature" className="text-sm">
            Temperature
          </Label>
          <span className="text-xs text-muted-foreground font-mono">
            {params.temperature.toFixed(1)}
          </span>
        </div>
        <Slider
          id="simple-temperature"
          value={[params.temperature]}
          onValueChange={([v]) => handleChange('temperature', v)}
          min={0}
          max={2}
          step={0.1}
          disabled={disabled}
        />
      </div>

      {/* Top P */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="simple-topP" className="text-sm">
            Top P
          </Label>
          <span className="text-xs text-muted-foreground font-mono">
            {params.topP.toFixed(2)}
          </span>
        </div>
        <Slider
          id="simple-topP"
          value={[params.topP]}
          onValueChange={([v]) => handleChange('topP', v)}
          min={0}
          max={1}
          step={0.05}
          disabled={disabled}
        />
      </div>
    </div>
  );
}