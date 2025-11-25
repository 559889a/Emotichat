'use client';

/**
 * 全局端点选择器
 * 用于在设置页面选择全局激活的模型端点
 */

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Server, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select';
import {
  OPENAI_PROVIDER,
  GOOGLE_PROVIDER,
  ANTHROPIC_PROVIDER,
  getCustomProviders,
  type ModelProvider,
  type CustomProvider,
  type AIProviderType,
} from '@/lib/ai/models';
import { getStoredSelectedModel, getStoredApiKey } from './api-keys';

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

  // 官方提供商列表（常量，放在最前面）
  const officialProviders = useMemo(() => [OPENAI_PROVIDER, GOOGLE_PROVIDER, ANTHROPIC_PROVIDER], []);

  // 加载自定义端点列表
  const loadCustomProviders = React.useCallback(() => {
    setCustomProviders(getCustomProviders());
  }, []);

  // 加载配置
  useEffect(() => {
    setActiveConfig(getGlobalModelConfig());
    loadCustomProviders();
  }, [loadCustomProviders]);

  // 强制刷新计数器（用于触发重新渲染）
  const [refreshKey, setRefreshKey] = useState(0);

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

    // 监听官方提供商配置变化
    const handleOfficialConfigChange = () => {
      // 强制重新渲染以获取最新的用户选择模型
      setRefreshKey(prev => prev + 1);

      // 直接从 localStorage 读取当前配置（避免闭包中的 activeConfig 过期）
      const currentConfig = getGlobalModelConfig();

      // 如果当前选中的是官方端点，更新配置中的模型
      if (currentConfig && !currentConfig.isCustom) {
        const provider = officialProviders.find(p => p.id === currentConfig.providerId);
        if (provider) {
          const newModelId = getStoredSelectedModel(provider.id as AIProviderType) || provider.models[0]?.id;
          if (newModelId && newModelId !== currentConfig.modelId) {
            const updatedConfig: GlobalModelConfig = {
              ...currentConfig,
              modelId: newModelId,
            };
            setGlobalModelConfig(updatedConfig);
            setActiveConfig(updatedConfig);
          }
        }
      }
    };

    // 监听自定义事件
    window.addEventListener('customProvidersChanged', handleCustomProvidersChange);
    window.addEventListener('officialProviderConfigChanged', handleOfficialConfigChange);

    return () => {
      window.removeEventListener('customProvidersChanged', handleCustomProvidersChange);
      window.removeEventListener('officialProviderConfigChanged', handleOfficialConfigChange);
    };
  }, [loadCustomProviders, activeConfig, officialProviders]);

  // 获取官方提供商用户选择的模型（如果有）
  const getOfficialProviderModel = (provider: ModelProvider): string => {
    const providerType = provider.id as AIProviderType;
    const selectedModel = getStoredSelectedModel(providerType);
    if (selectedModel) {
      return selectedModel;
    }
    // 如果没有选择，使用硬编码列表的第一个
    return provider.models[0]?.id || '';
  };

  // 选择官方端点
  const handleSelectOfficial = (provider: ModelProvider) => {
    const modelId = getOfficialProviderModel(provider);
    if (!modelId) return;

    const config: GlobalModelConfig = {
      providerId: provider.id,
      modelId,
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

  // 获取当前选中的值（用于下拉列表）
  const currentValue = useMemo(() => {
    if (!activeConfig) return '';
    if (activeConfig.isCustom && activeConfig.customProviderId) {
      return `custom:${activeConfig.customProviderId}`;
    }
    return `official:${activeConfig.providerId}`;
  }, [activeConfig]);

  // 获取当前选中的显示名称
  const currentDisplayName = useMemo(() => {
    if (!activeConfig) return '未选择';
    if (activeConfig.isCustom && activeConfig.customProviderId) {
      const provider = customProviders.find(p => p.id === activeConfig.customProviderId);
      return provider?.name || '自定义端点';
    }
    const provider = officialProviders.find(p => p.id === activeConfig.providerId);
    return provider?.name || '官方端点';
  }, [activeConfig, customProviders, officialProviders]);

  // 处理选择变化
  const handleSelectChange = (value: string) => {
    if (value.startsWith('official:')) {
      const providerId = value.replace('official:', '');
      const provider = officialProviders.find(p => p.id === providerId);
      if (provider) {
        handleSelectOfficial(provider);
      }
    } else if (value.startsWith('custom:')) {
      const customId = value.replace('custom:', '');
      const provider = customProviders.find(p => p.id === customId);
      if (provider) {
        handleSelectCustom(provider);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 说明 */}
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          选择全局使用的模型端点。此设置将应用到所有新建对话。
        </AlertDescription>
      </Alert>

      {/* 下拉选择器 */}
      <div className="space-y-2">
        <Label htmlFor="endpoint-selector">激活端点</Label>
        <Select value={currentValue} onValueChange={handleSelectChange}>
          <SelectTrigger id="endpoint-selector" className="w-full">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <SelectValue placeholder="选择一个端点">{currentDisplayName}</SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            {/* 官方端点组 */}
            <SelectGroup>
              <SelectLabel>官方端点</SelectLabel>
              {officialProviders.map((provider) => {
                const userSelectedModel = getOfficialProviderModel(provider);
                const hasApiKey = !!getStoredApiKey(provider.id as AIProviderType);
                return (
                  <SelectItem key={provider.id} value={`official:${provider.id}`}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{provider.name}</span>
                      <span className={`text-xs font-mono ${hasApiKey ? 'text-muted-foreground' : 'text-destructive'}`}>
                        {hasApiKey ? userSelectedModel : '未配置 Key'}
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>

            {/* 自定义端点组 */}
            {customProviders.length > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>自定义端点</SelectLabel>
                  {customProviders.map((provider) => {
                    const modelId = provider.models[0];
                    return (
                      <SelectItem key={provider.id} value={`custom:${provider.id}`}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{provider.name}</span>
                          {modelId && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {modelId}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 当前配置信息 */}
      {activeConfig && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {activeConfig.isCustom ? (
              <>
                {activeConfig.customEndpoint?.protocol === 'openai' && 'OpenAI 兼容'}
                {activeConfig.customEndpoint?.protocol === 'gemini' && 'Gemini 兼容'}
                {activeConfig.customEndpoint?.protocol === 'anthropic' && 'Claude 兼容'}
              </>
            ) : (
              <>
                {activeConfig.providerType === 'openai' && 'OpenAI'}
                {activeConfig.providerType === 'google' && 'Google'}
                {activeConfig.providerType === 'anthropic' && 'Anthropic'}
              </>
            )}
          </Badge>
          <span className="text-xs text-muted-foreground">
            模型: {activeConfig.modelId}
          </span>
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
