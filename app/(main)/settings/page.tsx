'use client';

import * as React from 'react';
import { Settings, Key, Code } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ApiKeysManager } from '@/components/settings/api-keys';
import { CustomProviderDialog } from '@/components/settings/custom-provider-dialog';
import { GlobalEndpointSelector } from '@/components/settings/global-endpoint-selector';
import { getDefaultDevModeSettings } from '@/types/dev-mode';
import type { DevModeSettings } from '@/types/dev-mode';

export default function SettingsPage() {
  // Dev Mode 设置状态
  const [devModeSettings, setDevModeSettings] = React.useState<DevModeSettings>(getDefaultDevModeSettings());

  // 从 localStorage 加载设置
  React.useEffect(() => {
    const saved = localStorage.getItem('devModeSettings');
    if (saved) {
      try {
        setDevModeSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse dev mode settings:', error);
      }
    }
  }, []);

  // 保存设置到 localStorage
  const updateDevModeSetting = <K extends keyof DevModeSettings>(
    key: K,
    value: DevModeSettings[K]
  ) => {
    const newSettings = { ...devModeSettings, [key]: value };
    setDevModeSettings(newSettings);
    localStorage.setItem('devModeSettings', JSON.stringify(newSettings));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-5xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          设置
        </h1>
        <p className="text-muted-foreground mt-2">
          管理 AI 模型、API 密钥和应用偏好设置
        </p>
      </div>

      {/* 设置标签页 */}
      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API 密钥
          </TabsTrigger>
          <TabsTrigger value="developer" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            开发者
          </TabsTrigger>
        </TabsList>

        {/* API 密钥管理 */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>选择激活端点</CardTitle>
              <CardDescription>
                选择全局使用的 AI 模型端点，将应用到所有新建对话
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GlobalEndpointSelector />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>自定义 API 端点</CardTitle>
              <CardDescription>
                添加和管理兼容 OpenAI、Gemini 或 Claude API 的自定义端点（如 LocalAI、Ollama 等）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomProviderDialog />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>官方 API 密钥管理</CardTitle>
              <CardDescription>
                配置 OpenAI、Google Gemini 和 Anthropic Claude 的 API 密钥
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeysManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 开发者选项 */}
        <TabsContent value="developer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>开发者模式</CardTitle>
              <CardDescription>
                调试和优化工具，用于查看提示词构建过程、API 请求/响应和 Token 使用详情
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 启用开发者模式 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dev-mode-enabled">启用开发者模式</Label>
                  <p className="text-sm text-muted-foreground">
                    在聊天界面显示调试信息和性能指标
                  </p>
                </div>
                <Switch
                  id="dev-mode-enabled"
                  checked={devModeSettings.enabled}
                  onCheckedChange={(checked) => updateDevModeSetting('enabled', checked)}
                />
              </div>

              {/* 自动展开面板 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dev-mode-auto-open">自动展开面板</Label>
                  <p className="text-sm text-muted-foreground">
                    发送消息后自动打开开发者面板
                  </p>
                </div>
                <Switch
                  id="dev-mode-auto-open"
                  checked={devModeSettings.autoOpen}
                  onCheckedChange={(checked) => updateDevModeSetting('autoOpen', checked)}
                  disabled={!devModeSettings.enabled}
                />
              </div>

              {/* 记录所有请求 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dev-mode-log-all">记录所有请求</Label>
                  <p className="text-sm text-muted-foreground">
                    保存最近 {devModeSettings.maxHistorySize} 条请求的调试信息（用于导出分析）
                  </p>
                </div>
                <Switch
                  id="dev-mode-log-all"
                  checked={devModeSettings.logAllRequests}
                  onCheckedChange={(checked) => updateDevModeSetting('logAllRequests', checked)}
                  disabled={!devModeSettings.enabled}
                />
              </div>

              {/* 显示原始 JSON */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dev-mode-raw-json">显示原始 JSON</Label>
                  <p className="text-sm text-muted-foreground">
                    在面板中显示完整的 JSON 数据结构
                  </p>
                </div>
                <Switch
                  id="dev-mode-raw-json"
                  checked={devModeSettings.showRawJson}
                  onCheckedChange={(checked) => updateDevModeSetting('showRawJson', checked)}
                  disabled={!devModeSettings.enabled}
                />
              </div>

              {/* 警告提示 */}
              <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-4">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>注意：</strong> 开发者模式会收集详细的调试信息，可能会影响性能。建议仅在需要调试时启用。
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>快捷键</CardTitle>
              <CardDescription>
                开发者模式快捷键参考
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">打开/关闭开发者面板</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">
                    点击 Dev Mode 按钮
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">复制提示词</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">
                    提示词标签 → 复制按钮
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">导出调试数据</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">
                    面板右上角 → 导出按钮
                  </kbd>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
}