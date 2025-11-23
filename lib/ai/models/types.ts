/**
 * 模型相关类型定义
 * 支持官方提供商（OpenAI、Gemini、Claude）和自定义端点
 */

// AI Provider 类型
export type AIProviderType = 'openai' | 'google' | 'anthropic';

// 协议类型（用于自定义端点）
export type ProtocolType = 'openai' | 'gemini' | 'anthropic';

// 模型信息
export interface ModelInfo {
  id: string;                    // 模型 ID，如 'gpt-4-turbo'
  name: string;                  // 显示名称，如 'GPT-4 Turbo'
  provider: string;              // 提供商 ID
  contextWindow: number;         // 上下文窗口大小
  maxOutputTokens?: number;      // 最大输出 token 数
  supportsVision?: boolean;      // 是否支持图像输入
  supportsTools?: boolean;       // 是否支持函数调用
  pricing?: {
    input: number;               // 输入价格（美元/百万 token）
    output: number;              // 输出价格（美元/百万 token）
  };
  deprecated?: boolean;          // 是否已弃用
  description?: string;          // 模型描述
}

// 模型提供商配置
export interface ModelProvider {
  id: string;                    // 提供商 ID
  name: string;                  // 提供商显示名称
  type: AIProviderType;          // 提供商类型
  isOfficial: boolean;           // 是否为官方提供商
  isCustom: boolean;             // 是否为自定义端点
  baseUrl?: string;              // 自定义端点的 base URL
  apiKey?: string;               // API Key（自定义端点）
  models: ModelInfo[];           // 可用模型列表
  requiresApiKey: boolean;       // 是否需要 API Key
  icon?: string;                 // 图标（可选）
  website?: string;              // 官网链接（可选）
}

// 自定义端点配置
export interface CustomProvider {
  id: string;                    // 自定义端点 ID（用户定义）
  name: string;                  // 自定义端点名称
  protocol: ProtocolType;        // 使用的协议类型
  baseUrl: string;               // API 端点 URL
  apiKey: string;                // API Key
  models: string[];              // 可用模型列表（用户手动添加）
  enabled: boolean;              // 是否启用
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
}

// 模型配置（用于 API 调用）
export interface ModelConfig {
  providerId: string;            // 提供商 ID
  modelId: string;               // 模型 ID
  providerType: AIProviderType;  // 提供商类型
  apiKey?: string;               // API Key（可选，优先使用）
  baseUrl?: string;              // Base URL（可选，用于自定义端点）
  
  // 模型参数（可选）
  temperature?: number;          // 温度参数 (0-2)
  topP?: number;                 // Top P 参数 (0-1)
  maxTokens?: number;            // 最大输出 token 数
  presencePenalty?: number;      // 存在惩罚 (-2 to 2)
  frequencyPenalty?: number;     // 频率惩罚 (-2 to 2)
}

// 模型选择器选项
export interface ModelSelectorOption {
  value: string;                 // 选项值（providerId:modelId）
  label: string;                 // 显示标签
  provider: string;              // 提供商名称
  model: string;                 // 模型名称
  contextWindow: number;         // 上下文窗口
  group: string;                 // 分组名称
  disabled?: boolean;            // 是否禁用
  icon?: string;                 // 图标
}