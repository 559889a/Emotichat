'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AdvancedFeatureConfig, FunctionCallProfile } from '@/types/advanced';
import { McpConfigEditor } from '@/components/mcp';
import { Loader2, PlugZap, TerminalSquare, Plus, Save } from 'lucide-react';

const defaultConfig: AdvancedFeatureConfig = {
  functionCalling: {
    enabled: false,
    profileId: 'default',
    profiles: [
      {
        id: 'default',
        name: '默认工具包',
        description: '基础计算、时间与设备信息',
        enabledTools: ['calculator', 'time_lookup', 'device_info'],
        autoInvoke: false,
        resultPlacement: 'inline',
      },
    ],
  },
  mcp: {
    enabled: false,
    servers: [],
  },
  javascript: {
    enabled: false,
    sandboxLevel: 'balanced',
    allowNetwork: false,
    maxExecutionMs: 800,
    exposedAPIs: ['console', 'Date', 'setTimeout', 'clearTimeout'],
  },
};


function createProfile(): FunctionCallProfile {
  return {
    id: crypto.randomUUID(),
    name: '自定义工具包',
    description: '',
    enabledTools: [],
    autoInvoke: false,
    resultPlacement: 'inline',
  };
}

export default function AdvancedFeaturePage() {
  const [config, setConfig] = useState<AdvancedFeatureConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/advanced-features');
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          setConfig(data.data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateFunctionProfile = (updates: Partial<FunctionCallProfile>) => {
    setConfig((prev) => {
      const currentProfile =
        prev.functionCalling.profiles.find((p) => p.id === (prev.functionCalling.profileId || '')) ||
        prev.functionCalling.profiles[0];
      const nextProfile = { ...currentProfile, ...updates };
      const profiles = prev.functionCalling.profiles.map((p) => (p.id === nextProfile.id ? nextProfile : p));
      return {
        ...prev,
        functionCalling: {
          ...prev.functionCalling,
          profiles,
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/advanced-features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('保存失败');
    } catch (error) {
      console.error('[advanced] 保存失败', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeProfile =
    config.functionCalling.profiles.find((p) => p.id === config.functionCalling.profileId) ||
    config.functionCalling.profiles[0];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">高级功能</h1>
              <p className="text-muted-foreground">函数调用 / MCP / JavaScript 运行时 的统一配置中心</p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              保存
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlugZap className="h-5 w-5 text-primary" />
                函数调用框架
              </CardTitle>
              <CardDescription>注册工具、配置调用策略，支持与提示词流程解耦。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">启用函数调用</p>
                  <p className="text-xs text-muted-foreground">关闭后不向模型暴露任何工具。</p>
                </div>
                <Switch
                  checked={config.functionCalling.enabled}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      functionCalling: { ...prev.functionCalling, enabled: checked },
                    }))
                  }
                />
              </div>

              {activeProfile && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>工具包名称</Label>
                    <Input
                      value={activeProfile.name}
                      onChange={(e) => updateFunctionProfile({ name: e.target.value })}
                      placeholder="默认工具包"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>工具列表（逗号分隔）</Label>
                    <Input
                      value={activeProfile.enabledTools.join(', ')}
                      onChange={(e) =>
                        updateFunctionProfile({
                          enabledTools: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="calculator, search, weather"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>描述</Label>
                    <Textarea
                      value={activeProfile.description || ''}
                      onChange={(e) => updateFunctionProfile({ description: e.target.value })}
                      placeholder="工具包用途说明"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>结果呈现方式</Label>
                    <div className="flex gap-2">
                      {(['inline', 'panel'] as const).map((placement) => (
                        <Button
                          key={placement}
                          size="sm"
                          variant={activeProfile.resultPlacement === placement ? 'default' : 'outline'}
                          onClick={() => updateFunctionProfile({ resultPlacement: placement })}
                          className="flex-1"
                        >
                          {placement === 'inline' ? '内联到对话' : '侧边栏面板'}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="text-sm">自动触发</span>
                      <Switch
                        checked={activeProfile.autoInvoke || false}
                        onCheckedChange={(checked) => updateFunctionProfile({ autoInvoke: checked })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center gap-2">
                {config.functionCalling.profiles.map((profile) => (
                  <Badge
                    key={profile.id}
                    variant={profile.id === config.functionCalling.profileId ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        functionCalling: { ...prev.functionCalling, profileId: profile.id },
                      }))
                    }
                  >
                    {profile.name}
                  </Badge>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      functionCalling: {
                        ...prev.functionCalling,
                        profiles: [...prev.functionCalling.profiles, createProfile()],
                      },
                    }))
                  }
                >
                  <Plus className="h-4 w-4" />
                  新建工具包
                </Button>
              </div>
            </CardContent>
          </Card>

          <McpConfigEditor
            servers={config.mcp.servers}
            onChange={(servers) => setConfig((prev) => ({ ...prev, mcp: { ...prev.mcp, servers } }))}
            globalEnabled={config.mcp.enabled}
            onGlobalEnabledChange={(enabled) => setConfig((prev) => ({ ...prev, mcp: { ...prev.mcp, enabled } }))}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TerminalSquare className="h-5 w-5 text-primary" />
                JavaScript 运行时
              </CardTitle>
              <CardDescription>在沙箱中运行脚本，注入必要上下文。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">启用脚本运行</p>
                  <p className="text-xs text-muted-foreground">关闭后不执行任何自定义脚本。</p>
                </div>
                <Switch
                  checked={config.javascript.enabled}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, javascript: { ...prev.javascript, enabled: checked } }))
                  }
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>沙箱级别</Label>
                  <div className="flex gap-2">
                    {(['strict', 'balanced', 'open'] as const).map((level) => (
                      <Button
                        key={level}
                        size="sm"
                        variant={config.javascript.sandboxLevel === level ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, javascript: { ...prev.javascript, sandboxLevel: level } }))
                        }
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>执行超时 (ms)</Label>
                  <Input
                    type="number"
                    min={200}
                    value={config.javascript.maxExecutionMs}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        javascript: { ...prev.javascript, maxExecutionMs: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>允许网络</Label>
                  <Switch
                    checked={config.javascript.allowNetwork}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, javascript: { ...prev.javascript, allowNetwork: checked } }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>暴露 API（逗号分隔）</Label>
                <Input
                  value={config.javascript.exposedAPIs.join(', ')}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      javascript: {
                        ...prev.javascript,
                        exposedAPIs: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  建议仅暴露必要函数，严格模式将屏蔽不在列表内的对象。
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存配置'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
