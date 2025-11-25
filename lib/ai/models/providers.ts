/**
 * 官方模型提供商配置
 * 包含 OpenAI、Google Gemini、Anthropic Claude 三大官方提供商
 */

import type { ModelProvider, ModelInfo } from './types';

/**
 * OpenAI 官方提供商配置
 * 更新日期：2025-11-25
 * 参考：https://platform.openai.com/docs/models
 */
export const OPENAI_PROVIDER: ModelProvider = {
  id: 'openai',
  name: 'OpenAI',
  type: 'openai',
  isOfficial: true,
  isCustom: false,
  requiresApiKey: true,
  website: 'https://platform.openai.com/api-keys',
  models: [
    {
      id: 'o3',
      name: 'o3',
      provider: 'openai',
      contextWindow: 200000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 10.00,
        output: 40.00,
      },
      description: 'OpenAI 最强大的推理模型，在编程、数学、科学、视觉感知等方面表现卓越',
    },
    {
      id: 'o4-mini',
      name: 'o4-mini',
      provider: 'openai',
      contextWindow: 200000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 1.10,
        output: 4.40,
      },
      description: 'o4-mini 是高性价比的推理模型，在数学和编程任务上表现出色',
    },
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      provider: 'openai',
      contextWindow: 1000000,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 2.00,
        output: 8.00,
      },
      description: 'GPT-4.1 在编码和指令遵循方面大幅超越 GPT-4o，支持 100 万 token 上下文',
    },
    {
      id: 'gpt-4.1-mini',
      name: 'GPT-4.1 Mini',
      provider: 'openai',
      contextWindow: 1000000,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.40,
        output: 1.60,
      },
      description: 'GPT-4.1 的轻量版，保持高性能的同时更快更经济',
    },
    {
      id: 'gpt-4.1-nano',
      name: 'GPT-4.1 Nano',
      provider: 'openai',
      contextWindow: 1000000,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.10,
        output: 0.40,
      },
      description: 'GPT-4.1 的最轻量版，极致速度和成本效益',
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 2.50,
        output: 10.00,
      },
      description: 'GPT-4o 多模态模型，支持文本、视觉和音频输入',
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.15,
        output: 0.60,
      },
      description: 'GPT-4o 的轻量版，更快速且更经济',
    },
  ],
};

/**
 * Google Gemini 官方提供商配置
 * 更新日期：2025-11-25
 * 参考：https://ai.google.dev/gemini-api/docs/models
 */
export const GOOGLE_PROVIDER: ModelProvider = {
  id: 'google',
  name: 'Google Gemini',
  type: 'google',
  isOfficial: true,
  isCustom: false,
  requiresApiKey: true,
  website: 'https://aistudio.google.com/apikey',
  models: [
    {
      id: 'gemini-3-pro',
      name: 'Gemini 3 Pro',
      provider: 'google',
      contextWindow: 2000000,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 1.25,
        output: 5.00,
      },
      description: 'Gemini 3 Pro 是 Google 最智能的模型，在所有主要基准测试中领先',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'google',
      contextWindow: 1000000,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 1.25,
        output: 5.00,
      },
      description: 'Gemini 2.5 Pro 具备自适应思考能力，擅长编程和代理任务',
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'google',
      contextWindow: 1000000,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.15,
        output: 0.60,
      },
      description: 'Gemini 2.5 Flash 兼具思考能力与低延迟高效率',
    },
    {
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite',
      provider: 'google',
      contextWindow: 1000000,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.075,
        output: 0.30,
      },
      description: 'Gemini 2.5 Flash Lite 是高性价比的快速模型',
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.10,
        output: 0.40,
      },
      description: 'Gemini 2.0 Flash 提供出色的性价比，支持原生工具使用',
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash Lite',
      provider: 'google',
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.075,
        output: 0.30,
      },
      description: 'Gemini 2.0 Flash Lite 针对成本效率和低延迟优化',
    },
  ],
};

/**
 * Anthropic Claude 官方提供商配置
 * 更新日期：2025-11-25
 * 参考：https://docs.anthropic.com/en/docs/about-claude/models/overview
 */
export const ANTHROPIC_PROVIDER: ModelProvider = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  type: 'anthropic',
  isOfficial: true,
  isCustom: false,
  requiresApiKey: true,
  website: 'https://console.anthropic.com/settings/keys',
  models: [
    {
      id: 'claude-opus-4-5-20251101',
      name: 'Claude Opus 4.5',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 15.00,
        output: 75.00,
      },
      description: 'Claude Opus 4.5 是 Anthropic 最新最强大的旗舰模型，在代理编程方面领先',
    },
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 3.00,
        output: 15.00,
      },
      description: 'Claude Sonnet 4.5 在编程、代理和计算机使用方面表现卓越',
    },
    {
      id: 'claude-haiku-4-5-20251001',
      name: 'Claude Haiku 4.5',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 1.00,
        output: 5.00,
      },
      description: 'Claude Haiku 4.5 具有接近 Sonnet 4 的编程性能，但速度更快成本更低',
    },
    {
      id: 'claude-opus-4-1-20250805',
      name: 'Claude Opus 4.1',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 15.00,
        output: 75.00,
      },
      description: 'Claude Opus 4.1 专注于代理任务和实际编程场景',
    },
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 3.00,
        output: 15.00,
      },
      description: 'Claude Sonnet 4 是 Claude 4 系列的平衡型号',
    },
    {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 15.00,
        output: 75.00,
      },
      description: 'Claude Opus 4 是 Claude 4 系列的旗舰型号',
    },
  ],
};

/**
 * 所有官方提供商
 */
export const OFFICIAL_PROVIDERS: Record<string, ModelProvider> = {
  openai: OPENAI_PROVIDER,
  google: GOOGLE_PROVIDER,
  anthropic: ANTHROPIC_PROVIDER,
};

/**
 * 获取所有官方模型列表
 */
export function getAllOfficialModels(): ModelProvider[] {
  return Object.values(OFFICIAL_PROVIDERS);
}

/**
 * 根据 provider ID 获取提供商配置
 */
export function getProviderById(providerId: string): ModelProvider | undefined {
  return OFFICIAL_PROVIDERS[providerId];
}

/**
 * 根据 model ID 查找所属的提供商
 */
export function findProviderByModel(modelId: string): ModelProvider | undefined {
  for (const provider of Object.values(OFFICIAL_PROVIDERS)) {
    if (provider.models.some(m => m.id === modelId)) {
      return provider;
    }
  }
  return undefined;
}

/**
 * 获取模型信息
 */
export function getModelInfo(providerId: string, modelId: string): ModelInfo | undefined {
  const provider = getProviderById(providerId);
  if (!provider) return undefined;
  
  return provider.models.find(m => m.id === modelId);
}

/**
 * 获取模型的 Token 限制
 */
export function getModelTokenLimit(providerId: string, modelId: string): number {
  const modelInfo = getModelInfo(providerId, modelId);
  return modelInfo?.contextWindow || 4096; // 默认 4096
}

/**
 * 从官方 API 动态拉取模型列表
 * 失败时返回硬编码的 fallback 列表
 */
export async function fetchOfficialModels(
  providerId: 'openai' | 'google' | 'anthropic',
  apiKey?: string
): Promise<ModelInfo[]> {
  const provider = OFFICIAL_PROVIDERS[providerId];
  if (!provider) {
    return [];
  }

  // 如果没有提供 API Key，直接返回硬编码列表
  if (!apiKey) {
    return provider.models;
  }

  try {
    // 根据 provider 类型构建不同的 URL
    let baseUrl: string;
    
    switch (providerId) {
      case 'openai':
        baseUrl = 'https://api.openai.com';
        break;
      case 'google':
        baseUrl = 'https://generativelanguage.googleapis.com';
        break;
      case 'anthropic':
        // Anthropic 没有公开的模型列表 API，直接返回硬编码列表
        return provider.models;
      default:
        return provider.models;
    }

    // 调用我们的 API 端点
    const response = await fetch(
      `/api/models?protocol=${providerId}&baseUrl=${encodeURIComponent(baseUrl)}&apiKey=${encodeURIComponent(apiKey)}`
    );

    if (!response.ok) {
      console.warn(`Failed to fetch ${providerId} models, using fallback`);
      return provider.models;
    }

    const data = await response.json();
    
    if (!data.success || !data.models || data.models.length === 0) {
      console.warn(`Invalid response from ${providerId}, using fallback`);
      return provider.models;
    }

    // 合并动态拉取的模型和硬编码模型
    // 优先使用硬编码的详细信息（因为包含 pricing、description 等）
    const hardcodedModelIds = new Set(provider.models.map(m => m.id));
    
    // 保留所有硬编码模型
    const mergedModels = [...provider.models];
    
    // 添加新发现的模型（硬编码中没有的）
    for (const fetchedModel of data.models) {
      if (!hardcodedModelIds.has(fetchedModel.id)) {
        mergedModels.push({
          id: fetchedModel.id,
          name: fetchedModel.name || fetchedModel.id,
          provider: providerId,
          contextWindow: fetchedModel.contextWindow || 4096,
          maxOutputTokens: fetchedModel.maxOutputTokens,
          description: fetchedModel.description || `${provider.name} model: ${fetchedModel.id}`,
        });
      }
    }
    
    return mergedModels;
  } catch (error) {
    console.error(`Error fetching ${providerId} models:`, error);
    // 出错时返回硬编码列表作为 fallback
    return provider.models;
  }
}

/**
 * 获取增强的提供商配置（包含动态拉取的模型）
 */
export async function getEnhancedProvider(
  providerId: 'openai' | 'google' | 'anthropic',
  apiKey?: string
): Promise<ModelProvider> {
  const provider = OFFICIAL_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const models = await fetchOfficialModels(providerId, apiKey);
  
  return {
    ...provider,
    models,
  };
}