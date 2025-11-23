'use client';

import * as React from 'react';
import { Settings, Key, Server, Sparkles } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiKeysManager } from '@/components/settings/api-keys';
import { CustomProviderDialog } from '@/components/settings/custom-provider-dialog';

export default function SettingsPage() {
  return (
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API 密钥
          </TabsTrigger>
          <TabsTrigger value="custom-endpoints" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            自定义端点
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            模型信息
          </TabsTrigger>
        </TabsList>

        {/* API 密钥管理 */}
        <TabsContent value="api-keys" className="space-y-4">
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

        {/* 自定义端点管理 */}
        <TabsContent value="custom-endpoints" className="space-y-4">
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
        </TabsContent>

        {/* 模型信息 */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>支持的模型</CardTitle>
              <CardDescription>
                查看所有支持的 AI 模型及其特性
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* OpenAI 模型 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">OpenAI</h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between p-3 rounded border">
                      <div>
                        <p className="font-medium">GPT-4o</p>
                        <p className="text-xs text-muted-foreground">128K 上下文 · 支持视觉和工具</p>
                      </div>
                      <span className="text-xs text-muted-foreground">$2.50 / $10.00</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded border">
                      <div>
                        <p className="font-medium">GPT-4o Mini</p>
                        <p className="text-xs text-muted-foreground">128K 上下文 · 更快更经济</p>
                      </div>
                      <span className="text-xs text-muted-foreground">$0.15 / $0.60</span>
                    </div>
                  </div>
                </div>

                {/* Google Gemini 模型 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Google Gemini</h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between p-3 rounded border">
                      <div>
                        <p className="font-medium">Gemini 2.0 Flash (实验版)</p>
                        <p className="text-xs text-muted-foreground">1M 上下文 · 免费使用</p>
                      </div>
                      <span className="text-xs text-green-600">免费</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded border">
                      <div>
                        <p className="font-medium">Gemini 1.5 Pro</p>
                        <p className="text-xs text-muted-foreground">2M 上下文 · 最大上下文窗口</p>
                      </div>
                      <span className="text-xs text-muted-foreground">$1.25 / $5.00</span>
                    </div>
                  </div>
                </div>

                {/* Anthropic Claude 模型 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Anthropic Claude</h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between p-3 rounded border">
                      <div>
                        <p className="font-medium">Claude 3.5 Sonnet (新)</p>
                        <p className="text-xs text-muted-foreground">200K 上下文 · 性能更强</p>
                      </div>
                      <span className="text-xs text-muted-foreground">$3.00 / $15.00</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded border">
                      <div>
                        <p className="font-medium">Claude 3 Haiku</p>
                        <p className="text-xs text-muted-foreground">200K 上下文 · 最快最经济</p>
                      </div>
                      <span className="text-xs text-muted-foreground">$0.25 / $1.25</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  * 价格单位：美元 / 百万 token（输入 / 输出）
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}