'use client';

/**
 * API Key 管理界面
 * 用于管理 OpenAI、Gemini、Claude 的 API Key
 * 支持模型选择功能（拉取模型列表或手动输入）
 */

import * as React from 'react';
import { Eye, EyeOff, Check, X, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OFFICIAL_PROVIDERS } from '@/lib/ai/models';
import type { AIProviderType } from '@/lib/ai/models';

// 本地存储 key
const STORAGE_KEY_PREFIX = 'emotichat_api_key_';
const STORAGE_MODELS_PREFIX = 'emotichat_fetched_models_';
const STORAGE_SELECTED_MODEL_PREFIX = 'emotichat_selected_model_';

interface ApiKeyState {
  value: string;
  isVisible: boolean;
  isTesting: boolean;
  fetchedModels: string[]; // 拉取到的完整模型列表
  selectedModel: string; // 用户选择的模型
  customModelInput: string; // 用户手动输入的模型
  testResult?: {
    success: boolean;
    message: string;
    models?: string[]; // 拉取到的模型列表（用于显示）
  };
}

export function ApiKeysManager() {
  // API Key 状态
  const [apiKeys, setApiKeys] = React.useState<Record<AIProviderType, ApiKeyState>>({
    openai: { value: '', isVisible: false, isTesting: false, fetchedModels: [], selectedModel: '', customModelInput: '' },
    google: { value: '', isVisible: false, isTesting: false, fetchedModels: [], selectedModel: '', customModelInput: '' },
    anthropic: { value: '', isVisible: false, isTesting: false, fetchedModels: [], selectedModel: '', customModelInput: '' },
  });

  // 从 localStorage 加载 API Keys、拉取的模型列表和选择的模型
  React.useEffect(() => {
    const providers: AIProviderType[] = ['openai', 'google', 'anthropic'];

    setApiKeys((prev) => {
      const updated = { ...prev };

      for (const provider of providers) {
        const storedKey = localStorage.getItem(STORAGE_KEY_PREFIX + provider);
        const storedModels = localStorage.getItem(STORAGE_MODELS_PREFIX + provider);
        const storedSelectedModel = localStorage.getItem(STORAGE_SELECTED_MODEL_PREFIX + provider);

        const fetchedModels = storedModels ? JSON.parse(storedModels) : [];
        const selectedModel = storedSelectedModel || '';

        updated[provider] = {
          ...updated[provider],
          value: storedKey || '',
          fetchedModels,
          selectedModel,
          customModelInput: selectedModel,
        };
      }

      return updated;
    });
  }, []);

  // 保存 API Key 和选择的模型
  const handleSave = (provider: AIProviderType) => {
    const state = apiKeys[provider];
    const apiKeyValue = state.value.trim();
    const modelValue = state.customModelInput.trim();

    if (apiKeyValue) {
      localStorage.setItem(STORAGE_KEY_PREFIX + provider, apiKeyValue);

      // 保存选择的模型
      if (modelValue) {
        localStorage.setItem(STORAGE_SELECTED_MODEL_PREFIX + provider, modelValue);
      }

      setApiKeys((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          selectedModel: modelValue,
          testResult: {
            success: true,
            message: modelValue ? `API Key 和模型 "${modelValue}" 已保存` : 'API Key 已保存',
          },
        },
      }));

      // 触发配置变化事件
      window.dispatchEvent(new Event('officialProviderConfigChanged'));
    } else {
      localStorage.removeItem(STORAGE_KEY_PREFIX + provider);
      localStorage.removeItem(STORAGE_SELECTED_MODEL_PREFIX + provider);
      localStorage.removeItem(STORAGE_MODELS_PREFIX + provider);
      setApiKeys((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          value: '',
          fetchedModels: [],
          selectedModel: '',
          customModelInput: '',
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

  // 测试连接并拉取模型列表
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

    try {
      // 根据提供商类型构建请求
      let baseUrl: string;
      let protocol: string;

      switch (provider) {
        case 'openai':
          baseUrl = 'https://api.openai.com';
          protocol = 'openai';
          break;
        case 'google':
          baseUrl = 'https://generativelanguage.googleapis.com';
          protocol = 'gemini';
          break;
        case 'anthropic':
          baseUrl = 'https://api.anthropic.com';
          protocol = 'anthropic';
          break;
        default:
          throw new Error('Unknown provider');
      }

      // 调用 API 端点获取模型列表（同时验证密钥）
      const response = await fetch(
        `/api/models?protocol=${protocol}&baseUrl=${encodeURIComponent(baseUrl)}&apiKey=${encodeURIComponent(apiKey)}`
      );

      const data = await response.json();

      if (data.success && data.models && data.models.length > 0) {
        // 成功获取模型列表 - 保存完整列表
        const allModelIds = data.models.map((m: { id: string; name?: string }) => m.id);
        const displayModels = data.models.slice(0, 5).map((m: { id: string; name?: string }) => m.name || m.id);

        // 保存拉取到的模型列表到 localStorage
        localStorage.setItem(STORAGE_MODELS_PREFIX + provider, JSON.stringify(allModelIds));

        setApiKeys((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            isTesting: false,
            fetchedModels: allModelIds,
            testResult: {
              success: true,
              message: `密钥有效，获取到 ${data.models.length} 个模型`,
              models: displayModels,
            },
          },
        }));
      } else if (data.error) {
        // API 返回错误
        setApiKeys((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            isTesting: false,
            testResult: {
              success: false,
              message: data.error || '密钥验证失败',
            },
          },
        }));
      } else {
        // 无法获取模型列表，使用硬编码列表作为 fallback
        const hardcodedModels = OFFICIAL_PROVIDERS[provider].models.map(m => m.id);

        setApiKeys((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            isTesting: false,
            fetchedModels: hardcodedModels,
            testResult: {
              success: true,
              message: '密钥验证成功，使用默认模型列表',
            },
          },
        }));
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setApiKeys((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          isTesting: false,
          testResult: {
            success: false,
            message: '连接测试失败，请检查网络',
          },
        },
      }));
    }
  };

  // 选择模型（从下拉列表）
  const handleSelectModel = (provider: AIProviderType, modelId: string) => {
    if (modelId === '__custom__') {
      // 选择手动输入
      setApiKeys((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          selectedModel: '',
          customModelInput: '',
        },
      }));
    } else {
      setApiKeys((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          selectedModel: modelId,
          customModelInput: modelId,
        },
      }));
    }
  };

  // 更新手动输入的模型
  const handleCustomModelInputChange = (provider: AIProviderType, value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        customModelInput: value,
        selectedModel: value,
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {state.testResult.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <AlertDescription>{state.testResult.message}</AlertDescription>
                </div>
                {/* 显示拉取到的模型列表预览 */}
                {state.testResult.models && state.testResult.models.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {state.testResult.models.map((model) => (
                      <Badge key={model} variant="secondary" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                    {state.fetchedModels.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{state.fetchedModels.length - 5} 个
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Alert>
          )}

          {/* 模型选择器 */}
          <div className="space-y-2">
            <Label>选择模型</Label>
            {state.fetchedModels.length > 0 ? (
              // 有拉取到的模型列表时显示下拉选择器
              <div className="space-y-2">
                <Select
                  value={state.fetchedModels.includes(state.selectedModel) ? state.selectedModel : '__custom__'}
                  onValueChange={(value) => handleSelectModel(providerType, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="从列表中选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__custom__">手动输入...</SelectItem>
                    {state.fetchedModels.map((modelId) => (
                      <SelectItem key={modelId} value={modelId}>
                        {modelId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* 显示手动输入框（当选择"手动输入"或输入的值不在列表中时） */}
                {(!state.fetchedModels.includes(state.selectedModel) || state.selectedModel === '') && (
                  <Input
                    value={state.customModelInput}
                    onChange={(e) => handleCustomModelInputChange(providerType, e.target.value)}
                    placeholder="输入模型名称，如 gpt-4o"
                  />
                )}
              </div>
            ) : (
              // 没有拉取到模型时显示输入框（使用硬编码列表作为提示）
              <div className="space-y-2">
                <Input
                  value={state.customModelInput}
                  onChange={(e) => handleCustomModelInputChange(providerType, e.target.value)}
                  placeholder={`输入模型名称，如 ${provider.models[0]?.id || 'model-id'}`}
                />
                <p className="text-xs text-muted-foreground">
                  提示：点击"测试连接"拉取可用模型列表，或直接输入模型 ID
                </p>
              </div>
            )}
          </div>

          {/* 当前选择的模型 */}
          {state.selectedModel && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">当前模型:</span>
              <Badge variant="default" className="font-mono">
                {state.selectedModel}
              </Badge>
            </div>
          )}

          {/* 硬编码模型列表（作为参考） */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">预设模型参考</Label>
            <div className="flex flex-wrap gap-1">
              {provider.models.slice(0, 3).map((model) => (
                <Badge
                  key={model.id}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-accent"
                  onClick={() => handleCustomModelInputChange(providerType, model.id)}
                >
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
          <p>2. 点击&quot;保存&quot;按钮保存 API Key</p>
          <p>3. 可选：点击&quot;测试连接&quot;验证 API Key 是否有效</p>
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
 * 获取存储的选择模型
 */
export function getStoredSelectedModel(provider: AIProviderType): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_SELECTED_MODEL_PREFIX + provider);
}

/**
 * 获取存储的拉取模型列表
 */
export function getStoredFetchedModels(provider: AIProviderType): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_MODELS_PREFIX + provider);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * 检查是否配置了至少一个 API Key
 */
export function hasAnyApiKey(): boolean {
  if (typeof window === 'undefined') return false;

  const providers: AIProviderType[] = ['openai', 'google', 'anthropic'];
  return providers.some(p => localStorage.getItem(STORAGE_KEY_PREFIX + p));
}

/**
 * 获取官方提供商的完整配置
 */
export function getOfficialProviderConfig(provider: AIProviderType): {
  apiKey: string | null;
  selectedModel: string | null;
  fetchedModels: string[];
} {
  return {
    apiKey: getStoredApiKey(provider),
    selectedModel: getStoredSelectedModel(provider),
    fetchedModels: getStoredFetchedModels(provider),
  };
}