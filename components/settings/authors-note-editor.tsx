'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen } from 'lucide-react';
import type { InjectionPosition } from '@/types/prompt';

/**
 * Author's Note 编辑器 Props
 */
interface AuthorsNoteEditorProps {
  /** Author's Note 内容 */
  value: string;
  /** 注入深度 */
  depth: number;
  /** 注入位置 */
  position: InjectionPosition;
  /** 内容变化回调 */
  onValueChange: (value: string) => void;
  /** 深度变化回调 */
  onDepthChange: (depth: number) => void;
  /** 位置变化回调 */
  onPositionChange: (position: InjectionPosition) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
}

/**
 * Author's Note（作者注释）编辑器
 * 
 * 用于在对话中动态注入提示，引导对话走向。
 * 通常用于：
 * - 设置当前场景氛围
 * - 引导情节发展
 * - 强调特定主题或风格
 */
export function AuthorsNoteEditor({
  value,
  depth,
  position,
  onValueChange,
  onDepthChange,
  onPositionChange,
  disabled = false,
  placeholder = '在此输入作者注释，用于引导对话走向...\n\n例如：\n- [氛围：紧张刺激]\n- [注意：保持角色性格一致]\n- [风格：轻松幽默]\n- [情节：即将发生转折]',
}: AuthorsNoteEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          Author's Note（作者注释）
        </CardTitle>
        <CardDescription>
          动态注入的提示信息，用于引导对话方向和氛围。会在指定深度插入到对话历史中。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Author's Note 内容 */}
        <div className="space-y-2">
          <Label htmlFor="authors-note">注释内容</Label>
          <Textarea
            id="authors-note"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className="min-h-[150px] font-mono text-sm"
          />
        </div>

        {/* 注入配置 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 注入深度 */}
          <div className="space-y-2">
            <Label htmlFor="depth">注入深度</Label>
            <Input
              id="depth"
              type="number"
              min={0}
              max={10}
              value={depth}
              onChange={(e) => onDepthChange(parseInt(e.target.value) || 0)}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              0 = 最高优先级，数字越大离当前消息越远
            </p>
          </div>

          {/* 注入位置 */}
          <div className="space-y-2">
            <Label htmlFor="position">注入位置</Label>
            <Select
              value={position}
              onValueChange={(value) => onPositionChange(value as InjectionPosition)}
              disabled={disabled}
            >
              <SelectTrigger id="position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">之前</SelectItem>
                <SelectItem value="after">之后</SelectItem>
                <SelectItem value="replace">替换</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              相对于目标消息的位置
            </p>
          </div>
        </div>

        {/* 说明 */}
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium mb-1">💡 使用提示</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• 深度 3 通常是最佳位置（在最近几条消息之后）</li>
            <li>• 使用方括号 [] 可以让 AI 更好地识别这是引导信息</li>
            <li>• 简短明确的指令效果最好</li>
            <li>• 可以动态调整来改变对话走向</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}