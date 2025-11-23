'use client';

/**
 * API Key 管理界面
 * 用于管理 OpenAI、Gemini、Claude 的 API Key
 */

import * as React from 'react';
import { Eye, EyeOff, Check, X, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { OFFICIAL_PROVIDERS } from '@/lib/ai/models';
import type { AIProviderType } from '@/lib/ai/models';

// 本地存储 key
const STORAGE_KEY_PREFIX = 'emotichat_api_key_';

interface ApiKeyState {
  value: string;
  isVisible: boolean;
  isTesting: boolean;
  testResult?: {
    success: boolean;
    message: string;
  };
}

export function ApiKeysManager() {
  // API Key 状态
  const [apiKeys, setApiKeys] = React.useState<Record<AIProviderType, ApiKeyState>>({
    openai: { value: '', isVisible: false, isTesting: false },
    google: { value: '', isVisible: false, isTesting: false },
    anthropic: { value: '', isVisible: false, isTesting: false },
  });

  // 从 localStorage 加载 API Keys
  React.useEffect(() => {
    const providers: AIProviderType[] = ['openai', 'google', 'anthropic'];
    
    setApiKeys((prev) => {
      const updated = { ...prev };
      
      for (const provider of providers) {
        const stored = localStorage.getItem(STORAGE_KEY_PREFIX + provider);
        if (stored) {
          updated[provider] = {
            ...updated[provider],
            value: stored,
          };
        }
      }
      
      return updated;
    });
  }, []);

  // 保存 API Key
  const handleSave = (provider: AIProviderType) => {
    const value = apiKeys[provider].value.trim();
    
    if (value) {
      localStorage.setItem(STORAGE_KEY_PREFIX + provider, value);
      setApiKeys((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          testResult: {
            success: true,
            message: 'API Key 已保存',
          },
        },
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY_PREFIX + provider);
      setApiKeys((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          value: '',
          testResult: undefined,
        },
      }));
    }
  };

  // 切换可见性
  const toggleVisibility = (provider: AIProviderType) => {
    setApiKeys((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        isVisible: !prev[provider].isVisible,
      },
    }));
  };

  // 测试连接（简单版本，实际应该调用 API）
  const testConnection = async (provider: AIProviderType) => {
    const apiKey = apiKeys[provider].value.trim();
    
    if (!apiKey) {
      setApiKeys((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          testResult: {
            success: false,
            message: '请先输入 API Key',
          },
        },
      }));
      return;
    }

    setApiKeys((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        isTesting: true,
        testResult: undefined,
      },
    }));

    // 模拟测试（实际应该调用真实 API）
    // 这里简单验证格式
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let success = false;
    let message = '';

    // 简单的格式验证
    if (provider === 'openai' && apiKey.startsWith('sk-')) {
      success = true;
      message = 'API Key 格式正确（未验证有效性）';
    } else if (provider === 'google' && apiKey.length > 20) {
      success = true;
      message = 'API Key 格式正确（未验证有效性）';
    } else if (provider === 'anthropic' && apiKey.startsWith('sk-ant-')) {
      success = true;
      message = 'API Key 格式正确（未验证有效性）';
    } else {
      success = false;
      message = 'API Key 格式可能不正确';
    }

    setApiKeys((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        isTesting: false,
        testResult: { success, message },
      },
    }));
  };

  // 更新 API Key
  const updateApiKey = (provider: AIProviderType, value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        value,
        testResult: undefined,
      },
    }));
  };

  // 渲染单个提供商的 API Key 配置
  const renderProviderConfig = (providerType: AIProviderType) => {
    const provider = OFFICIAL_PROVIDERS[providerType];
    const state = apiKeys[providerType];

    return (
      <Card key={providerType}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{provider.name}</CardTitle>
              <CardDescription>
                配置 {provider.name} 的 API Key
              </CardDescription>
            </div>
            {provider.website && (
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  获取 API Key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* API Key 输入 */}
          <div className="space-y-2">
            <Label htmlFor={`api-key-${providerType}`}>API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id={`api-key-${providerType}`}
                  type={state.isVisible ? 'text' : 'password'}
                  value={state.value}
                  onChange={(e) => updateApiKey(providerType, e.target.value)}
                  placeholder={`输入 ${provider.name} API Key`}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleVisibility(providerType)}
                >
                  {state.isVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleSave(providerType)}
              disabled={!state.value.trim()}
              size="sm"
            >
              保存
            </Button>
            <Button
              onClick={() => testConnection(providerType)}
              disabled={!state.value.trim() || state.isTesting}
              variant="outline"
              size="sm"
            >
              {state.isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </Button>
          </div>

          {/* 测试结果 */}
          {state.testResult && (
            <Alert variant={state.testResult.success ? 'default' : 'destructive'}>
              <div className="flex items-center gap-2">
                {state.testResult.success ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <AlertDescription>{state.testResult.message}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* 可用模型列表 */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">可用模型</Label>
            <div className="flex flex-wrap gap-1">
              {provider.models.slice(0, 3).map((model) => (
                <Badge key={model.id} variant="secondary" className="text-xs">
                  {model.name}
                </Badge>
              ))}
              {provider.models.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{provider.models.length - 3} 个
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* 说明 */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          API Key 将存储在您的浏览器本地存储中。请勿在公共计算机上保存敏感信息。
        </AlertDescription>
      </Alert>

      {/* 官方提供商配置 */}
      <div className="grid gap-4 md:grid-cols-1">
        {renderProviderConfig('openai')}
        {renderProviderConfig('google')}
        {renderProviderConfig('anthropic')}
      </div>

      {/* 帮助信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. 在上方输入对应提供商的 API Key</p>
          <p>2. 点击"保存"按钮保存 API Key</p>
          <p>3. 可选：点击"测试连接"验证 API Key 是否有效</p>
          <p>4. 配置完成后，即可在聊天中选择对应的模型</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 获取存储的 API Key
 */
export function getStoredApiKey(provider: AIProviderType): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_PREFIX + provider);
}

/**
 * 检查是否配置了至少一个 API Key
 */
export function hasAnyApiKey(): boolean {
  if (typeof window === 'undefined') return false;
  
  const providers: AIProviderType[] = ['openai', 'google', 'anthropic'];
  return providers.some(p => localStorage.getItem(STORAGE_KEY_PREFIX + p));
}