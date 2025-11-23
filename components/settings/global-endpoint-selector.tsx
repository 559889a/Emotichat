'use client';

/**
 * 全局端点选择器
 * 用于在设置页面选择全局激活的模型端点
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Check, Server, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  OPENAI_PROVIDER,
  GOOGLE_PROVIDER,
  ANTHROPIC_PROVIDER,
  getCustomProviders,
  type ModelProvider,
  type CustomProvider,
} from '@/lib/ai/models';

// 全局模型配置类型
export interface GlobalModelConfig {
  providerId: string;
  modelId: string;
  providerType: 'openai' | 'google' | 'anthropic' | 'custom';
  isCustom: boolean;
  customProviderId?: string; // 如果是自定义端点，存储其ID
  // 自定义端点的完整配置（用于传递到服务端，因为服务端无法访问 localStorage）
  customEndpoint?: {
    apiKey: string;
    baseUrl: string;
    protocol: 'openai' | 'gemini' | 'anthropic';
  };
}

// 本地存储 key
const STORAGE_KEY = 'globalModelConfig';

/**
 * 获取全局模型配置
 */
export function getGlobalModelConfig(): GlobalModelConfig | null {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to parse global model config:', error);
    return null;
  }
}

/**
 * 保存全局模型配置
 */
export function setGlobalModelConfig(config: GlobalModelConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // 触发自定义事件，通知其他组件配置已更新
  window.dispatchEvent(new Event('globalConfigChanged'));
}

/**
 * 全局端点选择器组件
 */
export function GlobalEndpointSelector() {
  const [activeConfig, setActiveConfig] = useState<GlobalModelConfig | null>(null);
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);

  // 加载自定义端点列表
  const loadCustomProviders = React.useCallback(() => {
    setCustomProviders(getCustomProviders());
  }, []);

  // 加载配置
  useEffect(() => {
    setActiveConfig(getGlobalModelConfig());
    loadCustomProviders();
  }, [loadCustomProviders]);

  // 监听自定义端点变化
  useEffect(() => {
    const handleCustomProvidersChange = () => {
      loadCustomProviders();

      // 检查当前选中的自定义端点是否还存在
      if (activeConfig && activeConfig.isCustom && activeConfig.customProviderId) {
        const updatedProviders = getCustomProviders();
        const stillExists = updatedProviders.find(p => p.id === activeConfig.customProviderId);

        if (!stillExists) {
          // 端点已被删除，清除配置
          setActiveConfig(null);
          console.log('Active custom provider was deleted, cleared config');
        }
      }
    };

    // 监听自定义事件
    window.addEventListener('customProvidersChanged', handleCustomProvidersChange);

    return () => {
      window.removeEventListener('customProvidersChanged', handleCustomProvidersChange);
    };
  }, [loadCustomProviders, activeConfig]);

  // 选择官方端点
  const handleSelectOfficial = (provider: ModelProvider) => {
    const defaultModel = provider.models[0];
    if (!defaultModel) return;

    const config: GlobalModelConfig = {
      providerId: provider.id,
      modelId: defaultModel.id,
      providerType: provider.type,
      isCustom: false,
    };

    setGlobalModelConfig(config);
    setActiveConfig(config);
  };

  // 选择自定义端点
  const handleSelectCustom = (provider: CustomProvider) => {
    const modelId = provider.models[0];
    if (!modelId) return;

    // 将 protocol 映射为 providerType
    const providerType = provider.protocol === 'openai' ? 'openai' :
                         provider.protocol === 'gemini' ? 'google' : 'anthropic';

    const config: GlobalModelConfig = {
      providerId: providerType, // 使用映射后的 providerType 作为 providerId
      modelId,
      providerType,
      isCustom: true,
      customProviderId: provider.id, // 保存自定义端点的真实 ID
      // 保存自定义端点的完整配置，以便传递到服务端
      customEndpoint: {
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        protocol: provider.protocol,
      },
    };

    setGlobalModelConfig(config);
    setActiveConfig(config);
  };

  // 检查是否为激活的官方端点
  const isActiveOfficial = (providerId: string) => {
    return activeConfig && !activeConfig.isCustom && activeConfig.providerId === providerId;
  };

  // 检查是否为激活的自定义端点
  const isActiveCustom = (customId: string) => {
    return activeConfig && activeConfig.isCustom && activeConfig.customProviderId === customId;
  };

  // 官方提供商列表
  const officialProviders = [OPENAI_PROVIDER, GOOGLE_PROVIDER, ANTHROPIC_PROVIDER];

  return (
    <div className="space-y-4">
      {/* 说明 */}
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          选择全局使用的模型端点。此设置将应用到所有新建对话。
        </AlertDescription>
      </Alert>

      {/* 官方端点 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">官方端点</h3>
        <div className="grid gap-3">
          {officialProviders.map((provider) => {
            const isActive = isActiveOfficial(provider.id);
            const defaultModel = provider.models[0];

            return (
              <Card
                key={provider.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50',
                  isActive && 'border-primary bg-primary/5'
                )}
                onClick={() => handleSelectOfficial(provider)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        {provider.name}
                      </CardTitle>
                      {defaultModel && (
                        <CardDescription className="text-xs">
                          默认模型: {defaultModel.name}
                        </CardDescription>
                      )}
                    </div>
                    {isActive && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {provider.type === 'openai' && 'OpenAI'}
                      {provider.type === 'google' && 'Google'}
                      {provider.type === 'anthropic' && 'Anthropic'}
                    </Badge>
                    {defaultModel && (
                      <span className="text-xs text-muted-foreground">
                        {defaultModel.contextWindow.toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 自定义端点 */}
      {customProviders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">自定义端点</h3>
          <div className="grid gap-3">
            {customProviders.map((provider) => {
              const isActive = isActiveCustom(provider.id);
              const modelId = provider.models[0];

              return (
                <Card
                  key={provider.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    isActive && 'border-primary bg-primary/5'
                  )}
                  onClick={() => handleSelectCustom(provider)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          {provider.name}
                        </CardTitle>
                        <CardDescription className="text-xs break-all">
                          {provider.baseUrl}
                        </CardDescription>
                      </div>
                      {isActive && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {provider.protocol === 'openai' && 'OpenAI 兼容'}
                        {provider.protocol === 'gemini' && 'Gemini 兼容'}
                        {provider.protocol === 'anthropic' && 'Claude 兼容'}
                      </Badge>
                      {modelId && (
                        <span className="text-xs text-muted-foreground font-mono">
                          模型: {modelId}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 无激活端点提示 */}
      {!activeConfig && (
        <Alert variant="default">
          <AlertDescription>
            请选择一个端点作为全局默认模型
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
