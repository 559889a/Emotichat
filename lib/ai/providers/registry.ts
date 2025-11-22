import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';

// 定义支持的模型提供商
export type AIProvider = 'openai' | 'google' | 'anthropic';

// 定义模型配置接口
export interface ModelConfig {
  provider: AIProvider;
  modelId: string;
  apiKey?: string;
  baseURL?: string;
}

// 创建 Provider 实例的工厂函数
export function createModel(config: ModelConfig) {
  switch (config.provider) {
    case 'openai':
      const openai = createOpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        baseURL: config.baseURL || process.env.OPENAI_BASE_URL,
      });
      return openai(config.modelId);

    case 'google':
      const google = createGoogleGenerativeAI({
        apiKey: config.apiKey || process.env.GOOGLE_API_KEY,
        baseURL: config.baseURL,
      });
      return google(config.modelId);

    case 'anthropic':
      const anthropic = createAnthropic({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
        baseURL: config.baseURL,
      });
      return anthropic(config.modelId);

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

// 解析 DEFAULT_MODEL 环境变量
function parseDefaultModel(defaultModel: string): ModelConfig | null {
  const parts = defaultModel.split(':');
  
  if (parts.length !== 2) {
    return null;
  }
  
  const [provider, modelId] = parts;
  
  // 验证 provider 是否有效
  if (!['openai', 'google', 'anthropic'].includes(provider)) {
    return null;
  }
  
  return {
    provider: provider as AIProvider,
    modelId: modelId.trim(),
  };
}

// 检查 provider 是否有对应的 API Key
function hasApiKey(provider: AIProvider): boolean {
  switch (provider) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'google':
      return !!process.env.GOOGLE_API_KEY;
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    default:
      return false;
  }
}

// 获取 API Key 环境变量名称
function getApiKeyName(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return 'OPENAI_API_KEY';
    case 'google':
      return 'GOOGLE_API_KEY';
    case 'anthropic':
      return 'ANTHROPIC_API_KEY';
    default:
      return 'UNKNOWN_API_KEY';
  }
}

// 获取默认模型配置
export function getDefaultModelConfig(): ModelConfig {
  // 1. 优先读取 DEFAULT_MODEL 环境变量
  const defaultModel = process.env.DEFAULT_MODEL;
  
  if (defaultModel) {
    const parsed = parseDefaultModel(defaultModel);
    
    if (parsed) {
      // 检查是否有对应的 API Key
      if (!hasApiKey(parsed.provider)) {
        const apiKeyName = getApiKeyName(parsed.provider);
        throw new Error(
          `DEFAULT_MODEL 指定了 ${parsed.provider}:${parsed.modelId}，但未配置对应的 API Key。\n` +
          `请在 .env.local 文件中配置 ${apiKeyName}=your-api-key-here`
        );
      }
      
      return parsed;
    } else {
      console.warn(
        `DEFAULT_MODEL 格式错误: "${defaultModel}"。\n` +
        `正确格式为 "provider:model-id"，例如 "google:gemini-2.0-flash-exp"。\n` +
        `将使用自动选择逻辑。`
      );
    }
  }
  
  // 2. 如果未设置或解析失败，使用自动选择逻辑
  // 优先使用 Google Gemini (通常有免费额度)
  if (process.env.GOOGLE_API_KEY) {
    return {
      provider: 'google',
      modelId: 'gemini-1.5-flash',
    };
  }

  // 其次 OpenAI
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      modelId: 'gpt-4o-mini',
    };
  }

  // 最后 Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      modelId: 'claude-3-haiku-20240307',
    };
  }

  // 如果都没有，抛出错误提示用户配置 API Key
  throw new Error(
    '未配置任何 AI 模型的 API Key。\n' +
    '请在 .env.local 文件中至少配置以下其中一个：\n' +
    '- OPENAI_API_KEY\n' +
    '- GOOGLE_API_KEY\n' +
    '- ANTHROPIC_API_KEY'
  );
}