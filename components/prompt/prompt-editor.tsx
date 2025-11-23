'use client';

import * as React from 'react';
import { useCallback, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Save,
  X,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Download,
  Upload,
} from 'lucide-react';
import { PromptItemEditor } from './prompt-item-editor';
import { PromptPreview, estimateTotalTokens } from './prompt-preview';
import type { PromptItem, PromptRole, PromptBuildContext } from '@/types/prompt';
import { cn } from '@/lib/utils';

/**
 * 提示词编辑器 Props
 */
interface PromptEditorProps {
  /** 提示词列表 */
  value: PromptItem[];
  /** 值变化回调 */
  onChange: (items: PromptItem[]) => void;
  /** 保存回调 */
  onSave?: () => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 预览上下文 */
  previewContext?: Partial<PromptBuildContext>;
  /** 是否显示预览面板 */
  showPreview?: boolean;
  /** 是否显示保存/取消按钮 */
  showActions?: boolean;
  /** 标题 */
  title?: string;
  /** 最大高度 */
  maxHeight?: string;
  /** 额外的类名 */
  className?: string;
  /** 是否只读 */
  readOnly?: boolean;
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
 * 统一提示词编辑器组件
 * 
 * 功能：
 * - 排序功能（上下移动按钮）
 * - 注入功能（深度控制）
 * - 开关功能（决定是否发送给AI）
 * - Role设定功能（system/user/assistant）
 * - 实时预览
 * - Token 计数
 */
export function PromptEditor({
  value,
  onChange,
  onSave,
  onCancel,
  previewContext,
  showPreview = true,
  showActions = true,
  title = '提示词编辑器',
  maxHeight = '600px',
  className,
  readOnly = false,
}: PromptEditorProps) {
  const [showPreviewPanel, setShowPreviewPanel] = useState(showPreview);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 按顺序排序的项目
  const sortedItems = useMemo(
    () => [...value].sort((a, b) => a.order - b.order),
    [value]
  );

  // 总 token 数
  const totalTokens = useMemo(() => estimateTotalTokens(value), [value]);

  // 启用的项目数
  const enabledCount = useMemo(
    () => value.filter((item) => item.enabled).length,
    [value]
  );

  // 添加新项
  const handleAddItem = useCallback(() => {
    const maxOrder = value.length > 0
      ? Math.max(...value.map((item) => item.order))
      : -1;
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

  // 删除项
  const handleDeleteItem = useCallback(
    (id: string) => {
      onChange(value.filter((item) => item.id !== id));
      setDeleteConfirmId(null);
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

  // 复制项
  const handleDuplicateItem = useCallback(
    (item: PromptItem) => {
      const maxOrder = Math.max(...value.map((i) => i.order));
      const newItem: PromptItem = {
        ...item,
        id: generateId(),
        order: maxOrder + 1,
        name: item.name ? `${item.name} (副本)` : undefined,
      };
      onChange([...value, newItem]);
    },
    [value, onChange]
  );

  // 全部启用/禁用
  const handleToggleAll = useCallback(
    (enabled: boolean) => {
      onChange(value.map((item) => ({ ...item, enabled })));
    },
    [value, onChange]
  );

  // 清空所有
  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // 导出 JSON
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(value, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prompts.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [value]);

  // 导入 JSON
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as PromptItem[];
        
        // 验证并重新生成 ID
        const validItems = imported.map((item, index) => ({
          ...item,
          id: generateId(),
          order: index,
          enabled: item.enabled ?? true,
          role: item.role || 'system',
          content: item.content || '',
        }));
        
        onChange([...value, ...validItems]);
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败，请检查文件格式');
      }
    };
    input.click();
  }, [value, onChange]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* 头部工具栏 */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* 统计信息 */}
              <div className="text-sm text-muted-foreground mr-4">
                {enabledCount}/{value.length} 项启用 · ~{totalTokens} tokens
              </div>
              
              {/* 预览切换 */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreviewPanel(!showPreviewPanel)}
              >
                {showPreviewPanel ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    隐藏预览
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    显示预览
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 主内容区 */}
      <div className={cn('grid gap-4', showPreviewPanel ? 'lg:grid-cols-2' : 'grid-cols-1')}>
        {/* 编辑区 */}
        <Card className="flex flex-col">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">提示词列表</span>
              <div className="flex items-center gap-1">
                {/* 导入/导出 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleImport}
                  disabled={readOnly}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                  disabled={value.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <Separator orientation="vertical" className="h-4 mx-1" />
                
                {/* 全部启用/禁用 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAll(true)}
                  disabled={readOnly || enabledCount === value.length}
                >
                  全部启用
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAll(false)}
                  disabled={readOnly || enabledCount === 0}
                >
                  全部禁用
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <Separator />
          
          <CardContent className="p-0 flex-1">
            <ScrollArea style={{ maxHeight }}>
              <div className="p-4 space-y-3">
                {sortedItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">暂无提示词</p>
                    <p className="text-sm mt-1">点击下方按钮添加第一条提示词</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={handleAddItem}
                      disabled={readOnly}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      添加提示词
                    </Button>
                  </div>
                ) : (
                  <>
                    {sortedItems.map((item, index) => (
                      <PromptItemEditor
                        key={item.id}
                        item={item}
                        onChange={(updatedItem) =>
                          handleUpdateItem(item.id, updatedItem)
                        }
                        onDelete={() => setDeleteConfirmId(item.id)}
                        onMoveUp={() => handleMoveUp(index)}
                        onMoveDown={() => handleMoveDown(index)}
                        canMoveUp={index > 0}
                        canMoveDown={index < sortedItems.length - 1}
                      />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          
          {/* 添加按钮 */}
          {!readOnly && (
            <>
              <Separator />
              <div className="p-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加提示词
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* 预览区 */}
        {showPreviewPanel && (
          <PromptPreview
            items={value}
            context={previewContext}
            maxHeight={maxHeight}
            showTokenCount
          />
        )}
      </div>

      {/* 底部操作栏 */}
      {showActions && (
        <Card>
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {value.length > 0 && !readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleClearAll}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  清空所有
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  <X className="h-4 w-4 mr-1" />
                  取消
                </Button>
              )}
              {onSave && (
                <Button type="button" onClick={onSave}>
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条提示词吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteItem(deleteConfirmId)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 导出子组件
export { PromptItemEditor } from './prompt-item-editor';
export { PromptPreview, estimateTokenCount, estimateTotalTokens } from './prompt-preview';
export { VariableInsertMenu, getAllVariables, getVariablesByCategory } from './variable-insert-menu';
export type { VariableDefinition } from './variable-insert-menu';