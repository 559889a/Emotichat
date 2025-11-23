'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { builtInPresets } from '@/lib/prompt/presets';
import type { PromptPreset } from '@/types/prompt';
import { cn } from '@/lib/utils';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建新预设模板
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
    prompts: [],
    globalPosition: 'before_all',
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
  const [searchQuery, setSearchQuery] = useState('');

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
      
      // 合并内置预设和用户预设
      const allPresets = [...builtInPresets, ...(data.presets || [])];
      setPresets(allPresets);
      setActivePresetId(data.activePresetId);
      
      // 默认选中第一个预设
      if (allPresets.length > 0 && !selectedPresetId) {
        setSelectedPresetId(allPresets[0].id);
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
      
      setActivePresetId(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '激活失败');
    }
  };

  // 复制预设
  const duplicatePreset = (preset: PromptPreset) => {
    const newPreset: PromptPreset = {
      ...preset,
      id: generateId(),
      name: `${preset.name} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBuiltIn: false,
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isBuiltIn: false,
        };
        
        setEditingPreset(newPreset);
      } catch (err) {
        alert('导入失败，请检查文件格式');
      }
    };
    input.click();
  };

  // 过滤预设
  const filteredPresets = presets.filter((preset) =>
    preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (preset.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

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
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setEditingPreset(createNewPreset())}>
            <Plus className="h-4 w-4 mr-2" />
            新建预设
          </Button>
          <Button variant="outline" onClick={importPreset}>
            <Upload className="h-4 w-4 mr-2" />
            导入
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：预设列表 */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>预设列表</CardTitle>
              <Input
                placeholder="搜索预设..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="p-4 space-y-2">
                  {filteredPresets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      没有找到预设
                    </p>
                  ) : (
                    filteredPresets.map((preset) => (
                      <Card
                        key={preset.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-accent',
                          selectedPresetId === preset.id && 'ring-2 ring-primary'
                        )}
                        onClick={() => setSelectedPresetId(preset.id)}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base flex items-center gap-2">
                                {preset.name}
                                {activePresetId === preset.id && (
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                )}
                                {preset.isBuiltIn && (
                                  <Badge variant="secondary" className="text-xs">
                                    内置
                                  </Badge>
                                )}
                              </CardTitle>
                              {preset.description && (
                                <CardDescription className="text-xs mt-1">
                                  {preset.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 mt-2">
                            {activePresetId !== preset.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  activatePreset(preset.id);
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                激活
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPreset(preset);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicatePreset(preset);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportPreset(preset);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            {!preset.isBuiltIn && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(preset.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：预设详情/编辑器 */}
        <div className="col-span-8">
          {selectedPreset ? (
            <PresetEditor
              preset={selectedPreset}
              onChange={(updated) => {
                setPresets(presets.map((p) => (p.id === updated.id ? updated : p)));
              }}
              readOnly={selectedPreset.isBuiltIn}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">请选择一个预设</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 编辑对话框 */}
      <Dialog
        open={editingPreset !== null}
        onOpenChange={(open) => !open && setEditingPreset(null)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPreset?.isBuiltIn ? '查看预设' : '编辑预设'}
            </DialogTitle>
            <DialogDescription>
              {editingPreset?.isBuiltIn
                ? '内置预设为只读，可以复制后修改'
                : '配置预设的各项参数和提示词'}
            </DialogDescription>
          </DialogHeader>
          
          {editingPreset && (
            <PresetEditor
              preset={editingPreset}
              onChange={setEditingPreset}
              readOnly={editingPreset.isBuiltIn}
            />
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPreset(null)}>
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            {editingPreset && !editingPreset.isBuiltIn && (
              <Button onClick={() => editingPreset && savePreset(editingPreset)}>
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            )}
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
        </div>
      </div>
    </div>
  );
}