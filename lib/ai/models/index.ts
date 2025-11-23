/**
 * 模型系统统一导出
 * 整合官方提供商、自定义端点和模型配置
 */

// 导出类型
export type {
  AIProviderType,
  ProtocolType,
  ModelInfo,
  ModelProvider,
  CustomProvider,
  ModelConfig,
  ModelSelectorOption,
} from './types';

// 导出官方提供商
export {
  OPENAI_PROVIDER,
  GOOGLE_PROVIDER,
  ANTHROPIC_PROVIDER,
  OFFICIAL_PROVIDERS,
  getAllOfficialModels,
  getProviderById,
  findProviderByModel,
  getModelInfo,
  getModelTokenLimit,
} from './providers';

// 导出自定义端点管理
export {
  getCustomProviders,
  addCustomProvider,
  updateCustomProvider,
  deleteCustomProvider,
  toggleCustomProvider,
  customProviderToModelProvider,
  getCustomProvidersAsModelProviders,
  testCustomProviderConnection,
  validateUrl,
} from './custom';

// 导出工具函数
import { getAllOfficialModels, getProviderById, getModelInfo } from './providers';
import { getCustomProvidersAsModelProviders } from './custom';
import type { ModelProvider, ModelSelectorOption, ModelConfig, AIProviderType } from './types';

/**
 * 获取所有可用的提供商（官方 + 自定义）
 */
export function getAllProviders(): ModelProvider[] {
  const official = getAllOfficialModels();
  const custom = getCustomProvidersAsModelProviders();
  return [...official, ...custom];
}

/**
 * 获取所有可用的模型（用于选择器）
 */
export function getAllModelsForSelector(): ModelSelectorOption[] {
  const providers = getAllProviders();
  const options: ModelSelectorOption[] = [];
  
  for (const provider of providers) {
    for (const model of provider.models) {
      options.push({
        value: `${provider.id}:${model.id}`,
        label: model.name,
        provider: provider.name,
        model: model.name,
        contextWindow: model.contextWindow,
        group: provider.name,
        disabled: false,
        icon: provider.icon,
      });
    }
  }
  
  return options;
}

/**
 * 解析模型选择器的值（providerId:modelId）
 */
export function parseModelValue(value: string): { providerId: string; modelId: string } | null {
  const parts = value.split(':');
  if (parts.length !== 2) return null;
  
  return {
    providerId: parts[0],
    modelId: parts[1],
  };
}

/**
 * 从模型配置创建 AI SDK 模型实例
 */
export function createModelFromConfig(config: ModelConfig) {
  // 这个函数将在后续集成到 API route 中使用
  // 暂时返回配置对象本身
  return config;
}

/**
 * 获取环境变量中的 API Key
 */
export function getApiKeyFromEnv(providerType: AIProviderType): string | undefined {
  if (typeof window !== 'undefined') {
    // 客户端不应访问环境变量
    return undefined;
  }
  
  switch (providerType) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'google':
      return process.env.GOOGLE_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    default:
      return undefined;
  }
}

/**
 * 创建默认模型配置
 */
export function createDefaultModelConfig(): ModelConfig {
  // 优先使用 Google Gemini（通常有免费额度）
  return {
    providerId: 'google',
    modelId: 'gemini-1.5-flash',
    providerType: 'google',
  };
}

/**
 * 验证模型配置是否有效
 */
export function validateModelConfig(config: ModelConfig): { valid: boolean; error?: string } {
  // 检查 providerId 和 modelId 是否存在
  if (!config.providerId || !config.modelId) {
    return {
      valid: false,
      error: '缺少 providerId 或 modelId',
    };
  }
  
  // 检查提供商是否存在
  const provider = getProviderById(config.providerId);
  if (!provider) {
    // 可能是自定义端点，暂时认为有效
    return { valid: true };
  }
  
  // 检查模型是否存在
  const model = getModelInfo(config.providerId, config.modelId);
  if (!model) {
    return {
      valid: false,
      error: `模型 ${config.modelId} 在提供商 ${config.providerId} 中不存在`,
    };
  }
  
  return { valid: true };
}

/**
 * 格式化模型显示名称
 */
export function formatModelDisplayName(providerId: string, modelId: string): string {
  const provider = getProviderById(providerId);
  if (!provider) return modelId;
  
  const model = provider.models.find(m => m.id === modelId);
  if (!model) return modelId;
  
  return `${provider.name} - ${model.name}`;
}