'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

/**
 * Scenario 编辑器 Props
 */
interface ScenarioEditorProps {
  /** Scenario 内容 */
  value: string;
  /** 变化回调 */
  onChange: (value: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
}

/**
 * Scenario（情景设定）编辑器
 * 
 * 用于设定对话的背景情境，类似 SillyTavern 的 Scenario 概念。
 * Scenario 通常描述当前对话发生的场景、背景、时间、地点等信息。
 */
export function ScenarioEditor({
  value,
  onChange,
  disabled = false,
  placeholder = '描述对话发生的场景、背景、时间、地点等...\n\n例如：\n- 这是一个阳光明媚的下午，你们在咖啡厅相遇。\n- 故事发生在未来的赛博朋克城市...\n- 你们正在一起完成一个重要的项目...',
}: ScenarioEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Scenario（情景设定）
        </CardTitle>
        <CardDescription>
          描述对话发生的背景情境、场景设定。这会影响角色的行为和对话氛围。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="scenario">情景描述</Label>
          <Textarea
            id="scenario"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Scenario 会在构建提示词时插入到适当位置，为对话提供背景上下文。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}