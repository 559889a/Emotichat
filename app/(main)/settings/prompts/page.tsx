'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  Star,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Save,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { PresetEditor } from '@/components/settings/preset-editor';
import type { PromptPreset } from '@/types/prompt';
import { cn } from '@/lib/utils';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建新预设模板（带三个内置引用）
 */
function createNewPreset(): PromptPreset {
  return {
    id: generateId(),
    name: '新预设',
    description: '',
    parameters: {
      temperature: 0.9,
      topP: 0.9,
      maxTokens: 2048,
    },
    enabledParameters: ['temperature', 'topP', 'maxTokens'],
    contextLimit: {
      maxTokens: 4096,
      strategy: 'sliding_window',
      warningThreshold: 0.8,
    },
    prompts: [
      {
        id: 'builtin-character_prompts',
        order: 0,
        content: '',
        enabled: true,
        role: 'system',
        referenceType: 'character_prompts',
        isBuiltInReference: true,
        name: '角色设定',
        description: '引用当前对话角色的所有提示词配置',
      },
      {
        id: 'builtin-user_prompts',
        order: 1,
        content: '',
        enabled: true,
        role: 'system',
        referenceType: 'user_prompts',
        isBuiltInReference: true,
        name: '用户设定',
        description: '引用当前用户角色的提示词配置',
      },
      {
        id: 'builtin-chat_history',
        order: 2,
        content: '',
        enabled: true,
        role: 'system',
        referenceType: 'chat_history',
        isBuiltInReference: true,
        name: '聊天记录',
        description: '引用对话历史消息记录',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 预设管理页面
 */
export default function PresetsPage() {
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<PromptPreset | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 用于跟踪未保存的更改
  const [originalPreset, setOriginalPreset] = useState<PromptPreset | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  // 获取当前选中的预设
  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  // 检查是否有未保存的更改
  const isDirty = React.useMemo(() => {
    if (!selectedPreset || !originalPreset) return false;
    return JSON.stringify(selectedPreset) !== JSON.stringify(originalPreset);
  }, [selectedPreset, originalPreset]);

  // 当选中的预设改变时，更新 originalPreset
  useEffect(() => {
    if (selectedPreset) {
      setOriginalPreset(JSON.parse(JSON.stringify(selectedPreset)));
    }
  }, [selectedPresetId]); // 只在 ID 变化时触发

  // 监听浏览器刷新/关闭事件
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '您有未保存的更改，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 加载预设
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/presets');
      if (!response.ok) throw new Error('加载预设失败');

      const data = await response.json();

      // 只加载用户创建的预设
      setPresets(data.presets || []);
      setActivePresetId(data.activePresetId);

      // 默认选中第一个预设
      if (data.presets && data.presets.length > 0 && !selectedPresetId) {
        setSelectedPresetId(data.presets[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存预设
  const savePreset = async (preset: PromptPreset) => {
    try {
      const response = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });

      if (!response.ok) throw new Error('保存预设失败');

      await loadPresets();
      setEditingPreset(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    }
  };

  // 保存当前选中的预设
  const handleSaveCurrentPreset = async () => {
    if (!selectedPreset) return;

    try {
      const response = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedPreset),
      });

      if (!response.ok) throw new Error('保存预设失败');

      // 更新 originalPreset 以清除 dirty 状态
      setOriginalPreset(JSON.parse(JSON.stringify(selectedPreset)));

      alert('保存成功！');
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    }
  };

  // 切换预设（带未保存检查）
  const handlePresetChange = (newPresetId: string) => {
    if (isDirty) {
      // 有未保存的更改，显示确认对话框
      setPendingActionId(newPresetId);
      setShowUnsavedDialog(true);
    } else {
      // 没有未保存的更改，直接切换
      setSelectedPresetId(newPresetId);
    }
  };

  // 确认放弃更改
  const handleDiscardChanges = () => {
    if (pendingActionId) {
      setSelectedPresetId(pendingActionId);
      setPendingActionId(null);
    }
    setShowUnsavedDialog(false);
  };

  // 保存并切换
  const handleSaveAndSwitch = async () => {
    await handleSaveCurrentPreset();
    if (pendingActionId) {
      setSelectedPresetId(pendingActionId);
      setPendingActionId(null);
    }
    setShowUnsavedDialog(false);
  };

  // 删除预设
  const deletePreset = async (id: string) => {
    try {
      const response = await fetch(`/api/presets/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('删除预设失败');
      
      await loadPresets();
      if (selectedPresetId === id) {
        setSelectedPresetId(presets[0]?.id || null);
      }
      setDeleteConfirmId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 激活预设
  const activatePreset = async (id: string) => {
    try {
      const response = await fetch('/api/presets/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId: id }),
      });

      if (!response.ok) throw new Error('激活预设失败');

      // 重新加载所有预设以更新 isActive 状态
      await loadPresets();
    } catch (err) {
      alert(err instanceof Error ? err.message : '激活失败');
    }
  };

  // 创建新预设
  const handleCreateNewPreset = async () => {
    try {
      const newPreset = createNewPreset();

      // 如果是第一个预设，自动激活
      if (presets.length === 0) {
        newPreset.isActive = true;
      }

      await savePreset(newPreset);

      // 自动选中新创建的预设
      setSelectedPresetId(newPreset.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    }
  };

  // 复制预设
  const duplicatePreset = (preset: PromptPreset) => {
    const newPreset: PromptPreset = {
      ...preset,
      id: generateId(),
      name: `${preset.name} (副本)`,
      isActive: false, // 复制的预设不激活
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingPreset(newPreset);
  };

  // 导出预设
  const exportPreset = (preset: PromptPreset) => {
    const dataStr = JSON.stringify(preset, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${preset.name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导入预设
  const importPreset = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as PromptPreset;
        
        // 重新生成 ID 和时间戳
        const newPreset: PromptPreset = {
          ...imported,
          id: generateId(),
          isActive: false, // 导入的预设不激活
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setEditingPreset(newPreset);
      } catch (err) {
        alert('导入失败，请检查文件格式');
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              加载失败
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadPresets}>重试</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-7xl">
      {/* 页面标题和操作 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">预设管理</h1>
        <p className="text-muted-foreground mb-4">
          管理全局提示词预设，控制模型参数、上下文策略和提示词内容
        </p>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Select
              value={selectedPresetId || ''}
              onValueChange={handlePresetChange}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="选择预设" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex items-center gap-2">
                      <span>{preset.name}</span>
                      {preset.isActive && (
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPreset && !selectedPreset.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => activatePreset(selectedPreset.id)}
              >
                <Check className="h-4 w-4 mr-1" />
                激活
              </Button>
            )}

            {selectedPreset && (
              <>
                {isDirty && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveCurrentPreset}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    保存
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicatePreset(selectedPreset)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPreset(selectedPreset)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  导出
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmId(selectedPreset.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
              </>
            )}
          </div>

          <Separator orientation="vertical" className="h-8" />

          <Button onClick={handleCreateNewPreset}>
            <Plus className="h-4 w-4 mr-2" />
            新建空白预设
          </Button>
          <Button variant="outline" onClick={importPreset}>
            <Upload className="h-4 w-4 mr-2" />
            导入
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div>
        {selectedPreset ? (
          <PresetEditor
            preset={selectedPreset}
            onChange={(updated) => {
              setPresets(presets.map((p) => (p.id === updated.id ? updated : p)));
            }}
            readOnly={false}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">请选择一个预设</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog
        open={editingPreset !== null}
        onOpenChange={(open) => !open && setEditingPreset(null)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑预设</DialogTitle>
            <DialogDescription>
              配置预设的各项参数和提示词
            </DialogDescription>
          </DialogHeader>

          {editingPreset && (
            <PresetEditor
              preset={editingPreset}
              onChange={setEditingPreset}
              readOnly={false}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPreset(null)}>
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button onClick={() => editingPreset && savePreset(editingPreset)}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个预设吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deletePreset(deleteConfirmId)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 未保存更改确认对话框 */}
      <Dialog
        open={showUnsavedDialog}
        onOpenChange={(open) => !open && setShowUnsavedDialog(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>未保存的更改</DialogTitle>
            <DialogDescription>
              您有未保存的更改，是否要保存后再切换预设？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscardChanges}>
              放弃更改
            </Button>
            <Button variant="default" onClick={handleSaveAndSwitch}>
              <Save className="h-4 w-4 mr-2" />
              保存并切换
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </div>
      </div>
    </div>
  );
}