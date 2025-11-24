'use client';

import * as React from 'react';
import { useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { VariableInsertMenu } from './variable-insert-menu';
import type { PromptItem, PromptRole, InjectionPosition } from '@/types/prompt';
import { cn } from '@/lib/utils';

/**
 * 单个提示词项编辑器 Props
 */
interface PromptItemEditorProps {
  item: PromptItem;
  onChange: (item: PromptItem) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showDragHandle?: boolean;
  className?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/**
 * Role 选项配置
 */
const ROLE_OPTIONS: { value: PromptRole; label: string; description: string }[] = [
  { value: 'system', label: 'System', description: '系统指令，定义AI行为' },
  { value: 'user', label: 'User', description: '模拟用户消息' },
  { value: 'assistant', label: 'Assistant', description: '模拟AI回复' },
];

/**
 * 注入位置选项
 */
const INJECTION_POSITION_OPTIONS: { value: InjectionPosition; label: string }[] = [
  { value: 'before', label: '之前' },
  { value: 'after', label: '之后' },
  { value: 'replace', label: '替换' },
];

/**
 * 单个提示词项编辑器组件
 */
export function PromptItemEditor({
  item,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  showDragHandle = true,
  className,
  onDragStart,
  onDragEnd,
}: PromptItemEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // 更新内容
  const handleContentChange = useCallback(
    (content: string) => {
      onChange({ ...item, content });
    },
    [item, onChange]
  );

  // 更新启用状态
  const handleEnabledChange = useCallback(
    (enabled: boolean) => {
      onChange({ ...item, enabled });
    },
    [item, onChange]
  );

  // 更新角色
  const handleRoleChange = useCallback(
    (role: PromptRole) => {
      onChange({ ...item, role });
    },
    [item, onChange]
  );

  // 更新名称
  const handleNameChange = useCallback(
    (name: string) => {
      onChange({ ...item, name });
    },
    [item, onChange]
  );

  // 更新注入配置
  const handleInjectionChange = useCallback(
    (updates: Partial<NonNullable<PromptItem['injection']>>) => {
      const currentInjection = item.injection || {
        enabled: false,
        depth: 0,
        position: 'after' as InjectionPosition,
      };
      onChange({
        ...item,
        injection: { ...currentInjection, ...updates },
      });
    },
    [item, onChange]
  );

  // 插入变量到光标位置
  const handleInsertVariable = useCallback(
    (syntax: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        // 如果没有光标位置，追加到末尾
        handleContentChange(item.content + syntax);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const content = item.content;

      const newContent =
        content.substring(0, start) + syntax + content.substring(end);

      handleContentChange(newContent);

      // 设置光标位置到插入内容之后
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + syntax.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    },
    [item.content, handleContentChange]
  );

  // 获取角色对应的颜色样式
  const getRoleBadgeClass = (role: PromptRole) => {
    switch (role) {
      case 'system':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'user':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'assistant':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // 折叠视图 - 类似 ReferenceItemCard 但背景为白色
  if (isCollapsed) {
    return (
      <Card
        className={cn(
          'transition-all bg-white',
          !item.enabled && 'opacity-50',
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 拖动手柄 - 增大尺寸，方便移动端操作 */}
            <div
              draggable={!!(onDragStart && onDragEnd)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              className="flex flex-col items-center justify-center pt-1 cursor-grab active:cursor-grabbing touch-none p-2 -m-2 hover:bg-accent/50 rounded transition-colors"
              style={{ touchAction: 'none' }}
            >
              <GripVertical className="h-6 w-6 text-muted-foreground" />
            </div>

            {/* 展开按钮 */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => setIsCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* 内容区 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{item.name || '未命名提示词'}</h4>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getRoleBadgeClass(item.role))}>
                  {item.role}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.description || item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '')}
              </p>
            </div>

            {/* 操作按钮区 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* 启用/禁用开关 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {item.enabled ? '已启用' : '已禁用'}
                </span>
                <Switch
                  checked={item.enabled}
                  onCheckedChange={handleEnabledChange}
                />
              </div>

              <div className="h-6 w-px bg-border" />

              {/* 上移按钮 */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                title="上移"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>

              {/* 下移按钮 */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                title="下移"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>

              {/* 删除按钮 */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 展开视图 - 完整编辑器
  return (
    <Card
      className={cn(
        'transition-opacity bg-white',
        !item.enabled && 'opacity-60',
        className
      )}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          {/* 拖拽手柄 - 增大尺寸，方便移动端操作 */}
          {showDragHandle && (
            <div
              draggable={!!(onDragStart && onDragEnd)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none p-1 -m-1 hover:bg-accent/50 rounded transition-colors"
              style={{ touchAction: 'none' }}
            >
              <GripVertical className="h-6 w-6" />
            </div>
          )}

          {/* 折叠按钮 */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>

          {/* 启用开关 */}
          <Switch
            checked={item.enabled}
            onCheckedChange={handleEnabledChange}
            className="data-[state=checked]:bg-primary"
          />

          {/* 名称输入 */}
          <Input
            value={item.name || ''}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="提示词名称（可选）"
            className="h-8 flex-1 max-w-[200px] text-sm"
          />

          {/* Role 选择器 */}
          <Select value={item.role} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getRoleBadgeClass(item.role))}>
                  {item.role}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 上下移动按钮 */}
          <div className="flex gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveUp}
              disabled={!canMoveUp}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveDown}
              disabled={!canMoveDown}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* 高级设置切换 */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', showAdvanced && 'bg-accent')}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>

          {/* 删除按钮 */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2">
        {/* 主要内容编辑区 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">提示词内容</Label>
            <VariableInsertMenu onInsert={handleInsertVariable} />
          </div>
          <Textarea
            ref={textareaRef}
            value={item.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="输入提示词内容，支持 {{variable}} 变量语法..."
            className="min-h-[100px] font-mono text-sm resize-y"
          />
        </div>

        {/* 高级设置：注入配置 */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">注入配置</Label>
              <Switch
                checked={item.injection?.enabled || false}
                onCheckedChange={(enabled) =>
                  handleInjectionChange({ enabled })
                }
              />
            </div>

            {item.injection?.enabled && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                {/* 深度设置 */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    注入深度
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={item.injection?.depth || 0}
                      onChange={(e) =>
                        handleInjectionChange({
                          depth: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20 h-8"
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.injection?.depth === 0
                        ? '（最高优先级）'
                        : `（第 ${item.injection?.depth} 条用户消息）`}
                    </span>
                  </div>
                </div>

                {/* 注入位置 */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    注入位置
                  </Label>
                  <Select
                    value={item.injection?.position || 'after'}
                    onValueChange={(value: InjectionPosition) =>
                      handleInjectionChange({ position: value })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INJECTION_POSITION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* 描述输入 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                描述（可选）
              </Label>
              <Input
                value={item.description || ''}
                onChange={(e) =>
                  onChange({ ...item, description: e.target.value })
                }
                placeholder="添加描述帮助理解此提示词的作用"
                className="h-8"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}