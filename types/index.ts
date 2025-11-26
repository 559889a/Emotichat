// EmotiChat 类型定义

// 用户相关
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
}

// 角色相关 - 导出详细的角色类型定义
export type { Character, CreateCharacterInput, UpdateCharacterInput } from './character';

// 对话和消息相关 - 导出详细的对话类型定义
export type {
  MessageRole,
  Message,
  MessageVersion,
  ConversationModelConfig,
  ConversationBranch,
  Conversation,
  CreateConversationInput,
  UpdateConversationInput,
  ConversationSummary
} from './conversation';

// 提示词相关 - 导出详细的提示词类型定义
export type {
  PromptRole,
  PromptDepth,
  InjectionPosition,
  PromptLayer,
  PromptInjection,
  PromptVariable,
  RuntimeVariables,
  PromptMacro,
  PromptItem,
  PostProcessConfig,
  ModelParameters,
  ContextLimitConfig,
  PromptPreset,
  CharacterPromptConfig,
  ConversationPromptConfig,
  PlaceholderType,
  Placeholder,
  PromptBuildContext,
  ProcessedPromptMessage,
  CreatePromptItemInput,
  UpdatePromptItemInput,
  PromptInheritanceSource,
  MergedPromptItem,
  PromptMergeOptions
} from './prompt';

// 导出提示词工具函数
export { getDefaultConversationPromptConfig } from './prompt';

// 开发者模式相关 - 导出 Dev Mode 类型定义
export type {
  PromptBuildInfo,
  ApiModelConfig,
  ApiRequestInfo,
  TokenUsage,
  ApiError,
  StreamChunk,
  ApiResponseInfo,
  MessageTokenAnalysis,
  TotalTokenAnalysis,
  TokenAnalysis,
  PerformanceMetrics,
  DevModeData,
  DevModeSettings,
  DevModeExportData,
  DevModeExportOptions
} from './dev-mode';

// 导出 Dev Mode 工具函数
export { getDefaultDevModeSettings } from './dev-mode';

// 高级功能/集成
export type { AdvancedFeatureConfig, FunctionCallProfile, JsRuntimeConfig, McpServerConfig } from './advanced';

// 正则后处理
export type { RegexRule, RegexScope, RegexMode, RegexTestResult } from './regex';

// 记忆相关
export interface Memory {
  filename: string;
  content: string;
  createdAt: Date;
}

// AI 模型配置
export interface ModelConfig {
  provider: 'openai' | 'gemini' | 'claude';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

// 应用配置
export interface AppConfig {
  modelProvider: 'openai' | 'gemini' | 'claude' | 'xai';
  modelName: string;
  apiKeys: {
    openai: string;
    gemini: string;
    claude: string;
    xai?: string;
  };
  customEndpoints: {
    openai: string;
    gemini: string;
    xai: string;
  };
}
