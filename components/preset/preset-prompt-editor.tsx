'use client';

import * as React from 'react';
import { useCallback, useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  BookOpen,
  User,
  MessageCircle,
  Lock,
} from 'lucide-react';
import { PromptItemEditor } from '@/components/prompt/prompt-item-editor';
import type { PromptItem, PromptReferenceType } from '@/types/prompt';
import { cn } from '@/lib/utils';

/**
 * 预设提示词编辑器 Props
 */
interface PresetPromptEditorProps {
  /** 提示词列表 */
  value: PromptItem[];
  /** 值变化回调 */
  onChange: (items: PromptItem[]) => void;
  /** 标题 */
  title?: string;
  /** 最大高度 */
  maxHeight?: string;
  /** 额外的类名 */
  className?: string;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建新的提示词项
 */
function createNewPromptItem(order: number): PromptItem {
  return {
    id: generateId(),
    order,
    content: '',
    enabled: true,
    role: 'system',
    injection: {
      enabled: false,
      depth: 0,
      position: 'after',
    },
  };
}

/**
 * 创建内置引用项
 */
function createBuiltInReferenceItem(
  referenceType: PromptReferenceType,
  order: number
): PromptItem {
  const names: Record<PromptReferenceType, string> = {
    character_prompts: '角色设定',
    user_prompts: '用户设定',
    chat_history: '聊天记录',
  };

  const descriptions: Record<PromptReferenceType, string> = {
    character_prompts: '引用当前对话角色的所有提示词配置',
    user_prompts: '引用当前用户角色的提示词配置',
    chat_history: '引用对话历史消息记录',
  };

  return {
    id: `builtin-${referenceType}`,
    order,
    content: '', // 引用项不需要 content
    enabled: true,
    role: 'system',
    referenceType,
    isBuiltInReference: true,
    name: names[referenceType],
    description: descriptions[referenceType],
  };
}

/**
 * 获取引用项的图标
 */
function getReferenceIcon(referenceType: PromptReferenceType) {
  const icons = {
    character_prompts: BookOpen,
    user_prompts: User,
    chat_history: MessageCircle,
  };
  return icons[referenceType];
}

/**
 * 获取引用项的颜色类名
 */
function getReferenceColorClass(referenceType: PromptReferenceType): string {
  const colors = {
    character_prompts: 'text-blue-500 bg-blue-50 border-blue-200',
    user_prompts: 'text-purple-500 bg-purple-50 border-purple-200',
    chat_history: 'text-green-500 bg-green-50 border-green-200',
  };
  return colors[referenceType];
}

/**
 * 特殊的预设提示词编辑器组件
 *
 * 特点：
 * - 包含三个不可删除的内置引用项：角色设定、用户设定、聊天记录
 * - 支持添加自定义提示词项
 * - 所有项目都可以调整顺序
 * - 内置引用项不能删除，但可以禁用
 */
export function PresetPromptEditor({
  value,
  onChange,
  title = '提示词排序',
  maxHeight = '600px',
  className,
}: PresetPromptEditorProps) {
  // 确保内置引用项存在
  useEffect(() => {
    const hasCharacterRef = value.some(
      (item) => item.referenceType === 'character_prompts'
    );
    const hasUserRef = value.some((item) => item.referenceType === 'user_prompts');
    const hasChatRef = value.some((item) => item.referenceType === 'chat_history');

    if (!hasCharacterRef || !hasUserRef || !hasChatRef) {
      const newItems: PromptItem[] = [...value];

      if (!hasCharacterRef) {
        newItems.push(createBuiltInReferenceItem('character_prompts', 0));
      }
      if (!hasUserRef) {
        newItems.push(createBuiltInReferenceItem('user_prompts', 1));
      }
      if (!hasChatRef) {
        newItems.push(createBuiltInReferenceItem('chat_history', 2));
      }

      // 重新排序
      newItems.forEach((item, index) => {
        item.order = index;
      });

      onChange(newItems);
    }
  }, [value, onChange]);

  // 按顺序排序的项目
  const sortedItems = useMemo(
    () => [...value].sort((a, b) => a.order - b.order),
    [value]
  );

  // 添加新项
  const handleAddItem = useCallback(() => {
    const maxOrder =
      value.length > 0 ? Math.max(...value.map((item) => item.order)) : -1;
    const newItem = createNewPromptItem(maxOrder + 1);
    onChange([...value, newItem]);
  }, [value, onChange]);

  // 更新项
  const handleUpdateItem = useCallback(
    (id: string, updatedItem: PromptItem) => {
      onChange(value.map((item) => (item.id === id ? updatedItem : item)));
    },
    [value, onChange]
  );

  // 删除项（仅限非内置项）
  const handleDeleteItem = useCallback(
    (id: string) => {
      const item = value.find((i) => i.id === id);
      if (item?.isBuiltInReference) return; // 不能删除内置引用项

      onChange(value.filter((item) => item.id !== id));
    },
    [value, onChange]
  );

  // 移动项（上移）
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;

      const newItems = [...sortedItems];
      // 交换 order 值
      const tempOrder = newItems[index].order;
      newItems[index] = { ...newItems[index], order: newItems[index - 1].order };
      newItems[index - 1] = { ...newItems[index - 1], order: tempOrder };

      onChange(newItems);
    },
    [sortedItems, onChange]
  );

  // 移动项（下移）
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= sortedItems.length - 1) return;

      const newItems = [...sortedItems];
      // 交换 order 值
      const tempOrder = newItems[index].order;
      newItems[index] = { ...newItems[index], order: newItems[index + 1].order };
      newItems[index + 1] = { ...newItems[index + 1], order: tempOrder };

      onChange(newItems);
    },
    [sortedItems, onChange]
  );

  // 切换启用状态
  const handleToggleEnabled = useCallback(
    (id: string) => {
      onChange(
        value.map((item) =>
          item.id === id ? { ...item, enabled: !item.enabled } : item
        )
      );
    },
    [value, onChange]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* 标题和说明 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">
          调整提示词的全局顺序。内置引用项（带锁图标）不可删除，会在运行时动态展开为实际内容。
        </p>
      </div>

      {/* 提示词列表 */}
      <ScrollArea style={{ maxHeight }} className="border rounded-md">
        <div className="p-4 space-y-3">
          {sortedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无提示词项</p>
              <p className="text-sm mt-2">点击下方按钮添加自定义提示词</p>
            </div>
          ) : (
            sortedItems.map((item, index) => (
              <div key={item.id}>
                {item.referenceType ? (
                  // 内置引用项 - 特殊显示
                  <ReferenceItemCard
                    item={item}
                    index={index}
                    totalCount={sortedItems.length}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onToggleEnabled={() => handleToggleEnabled(item.id)}
                  />
                ) : (
                  // 普通提示词项 - 使用编辑器
                  <PromptItemEditor
                    item={item}
                    onChange={(updated) => handleUpdateItem(item.id, updated)}
                    onDelete={() => handleDeleteItem(item.id)}
                    onMoveUp={index > 0 ? () => handleMoveUp(index) : undefined}
                    onMoveDown={
                      index < sortedItems.length - 1
                        ? () => handleMoveDown(index)
                        : undefined
                    }
                  />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 添加按钮 */}
      <div className="flex justify-center">
        <Button onClick={handleAddItem} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          添加自定义提示词
        </Button>
      </div>
    </div>
  );
}

/**
 * 引用项卡片组件
 */
interface ReferenceItemCardProps {
  item: PromptItem;
  index: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleEnabled: () => void;
}

function ReferenceItemCard({
  item,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
}: ReferenceItemCardProps) {
  if (!item.referenceType) return null;

  const Icon = getReferenceIcon(item.referenceType);
  const colorClass = getReferenceColorClass(item.referenceType);

  return (
    <Card
      className={cn(
        'transition-all',
        !item.enabled && 'opacity-50',
        colorClass
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* 拖动手柄 */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          </div>

          {/* 图标 */}
          <div className="flex-shrink-0 pt-1">
            <Icon className="h-5 w-5" />
          </div>

          {/* 内容区 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{item.name}</h4>
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                内置引用
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>

          {/* 操作按钮区 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* 启用/禁用开关 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleEnabled}
              title={item.enabled ? '禁用' : '启用'}
            >
              <div
                className={cn(
                  'h-4 w-4 rounded-full border-2 transition-colors',
                  item.enabled
                    ? 'bg-primary border-primary'
                    : 'bg-background border-muted-foreground'
                )}
              />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* 上移按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMoveUp}
              disabled={index === 0}
              title="上移"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>

            {/* 下移按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMoveDown}
              disabled={index === totalCount - 1}
              title="下移"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
