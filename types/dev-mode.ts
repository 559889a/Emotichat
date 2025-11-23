/**
 * EmotiChat 开发者模式类型定义
 * Phase 2.1: 开发者调试工具
 */

import type { PromptItem, ProcessedPromptMessage, PromptRole } from './prompt';

// ============================================================================
// 提示词构建信息
// ============================================================================

/**
 * 提示词构建结果
 */
export interface PromptBuildInfo {
  /** 构建时间戳 */
  timestamp: Date;
  /** 构建耗时（毫秒） */
  duration: number;
  /** 原始提示词项（构建前） */
  rawPromptItems: PromptItem[];
  /** 处理后的消息（发送给 API 的最终格式） */
  processedMessages: ProcessedPromptMessage[];
  /** 警告信息（如有） */
  warnings: string[];
  /** 提示词来源信息 */
  sources: {
    preset?: string;      // 预设名称
    character?: string;   // 角色名称
    conversation?: string; // 对话ID
  };
}

// ============================================================================
// API 请求信息
// ============================================================================

/**
 * 模型配置信息
 */
export interface ApiModelConfig {
  /** 提供商（openai, google, anthropic 等） */
  provider: string;
  /** 模型ID（gpt-4o, gemini-1.5-flash 等） */
  modelId: string;
  /** 模型参数 */
  parameters: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stopSequences?: string[];
    [key: string]: any;
  };
}

/**
 * API 请求信息
 */
export interface ApiRequestInfo {
  /** 请求时间戳 */
  timestamp: Date;
  /** 模型配置 */
  model: ApiModelConfig;
  /** 发送的消息数组 */
  messages: ProcessedPromptMessage[];
  /** 完整的请求体（JSON） */
  requestBody: any;
  /** 请求头（不包含敏感信息如 API Key） */
  headers?: Record<string, string>;
  /** API 端点 URL */
  endpoint?: string;
}

// ============================================================================
// API 响应信息
// ============================================================================

/**
 * Token 使用统计
 */
export interface TokenUsage {
  /** 输入 token 数 */
  promptTokens: number;
  /** 输出 token 数 */
  completionTokens: number;
  /** 总 token 数 */
  totalTokens: number;
  /** 缓存命中 token（如支持） */
  cachedTokens?: number;
}

/**
 * API 错误信息
 */
export interface ApiError {
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: string;
  /** 错误堆栈 */
  stack?: string;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 原始错误对象 */
  raw?: any;
}

/**
 * 流式响应块
 */
export interface StreamChunk {
  /** 块序号 */
  index: number;
  /** 块内容 */
  content: string;
  /** 块时间戳 */
  timestamp: Date;
  /** 是否为最后一块 */
  isLast?: boolean;
  /** 原始块数据 */
  raw?: any;
}

/**
 * API 响应信息
 */
export interface ApiResponseInfo {
  /** 响应时间戳 */
  timestamp: Date;
  /** 响应耗时（毫秒） */
  duration: number;
  /** Token 使用统计 */
  tokenUsage: TokenUsage;
  /** 流式响应的块（如果使用流式） */
  chunks?: StreamChunk[];
  /** 完整响应内容 */
  content?: string;
  /** 错误信息（如果请求失败） */
  error?: ApiError;
  /** 响应元数据 */
  metadata?: {
    finishReason?: string;  // stop, length, content_filter 等
    model?: string;          // 实际使用的模型（可能与请求不同）
    [key: string]: any;
  };
}

// ============================================================================
// Token 分析
// ============================================================================

/**
 * 单条消息的 Token 分析
 */
export interface MessageTokenAnalysis {
  /** 消息ID */
  messageId: string;
  /** 消息角色 */
  role: PromptRole;
  /** 消息内容（可能被截断以节省空间） */
  content: string;
  /** Token 数量 */
  tokens: number;
  /** 占总输入的百分比 */
  percentage: number;
  /** 字符数 */
  characters: number;
  /** 是否超长 */
  isTooLong?: boolean;
}

/**
 * Token 使用总览
 */
export interface TotalTokenAnalysis {
  /** 总输入 token 数 */
  input: number;
  /** 总输出 token 数 */
  output: number;
  /** 总计 */
  total: number;
  /** 模型上下文限制 */
  limit: number;
  /** 使用百分比 */
  percentage: number;
  /** 成本估算（USD，如有定价信息） */
  estimatedCost?: {
    input: number;
    output: number;
    total: number;
    currency: string;
  };
}

/**
 * Token 分析结果
 */
export interface TokenAnalysis {
  /** 每条消息的详细分析 */
  perMessage: MessageTokenAnalysis[];
  /** 总览统计 */
  total: TotalTokenAnalysis;
  /** 警告信息 */
  warnings: string[];
}

// ============================================================================
// 性能分析
// ============================================================================

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 提示词构建耗时（毫秒） */
  promptBuildDuration: number;
  /** API 请求发送耗时（毫秒） */
  requestDuration: number;
  /** 首个响应块耗时（TTFB，毫秒） */
  firstChunkDuration?: number;
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** 平均每个 token 的生成时间（毫秒） */
  avgTokenTime?: number;
  /** 吞吐量（tokens/秒） */
  throughput?: number;
}

// ============================================================================
// 完整的 Dev Mode 数据
// ============================================================================

/**
 * 开发者模式完整数据
 */
export interface DevModeData {
  /** 数据ID */
  id: string;
  /** 对话ID */
  conversationId: string;
  /** 消息ID（触发此次请求的用户消息） */
  messageId?: string;
  
  /** 提示词构建信息 */
  promptBuild: PromptBuildInfo;
  /** API 请求信息 */
  apiRequest: ApiRequestInfo;
  /** API 响应信息（可能为空，如果还未收到响应） */
  apiResponse?: ApiResponseInfo;
  /** Token 分析 */
  tokenAnalysis: TokenAnalysis;
  /** 性能指标 */
  performance: PerformanceMetrics;
  
  /** 创建时间 */
  createdAt: Date;
}

// ============================================================================
// Dev Mode 设置
// ============================================================================

/**
 * Dev Mode 用户设置
 */
export interface DevModeSettings {
  /** 是否启用开发者模式 */
  enabled: boolean;
  /** 是否自动展开面板 */
  autoOpen: boolean;
  /** 默认显示的标签页 */
  defaultTab: 'prompt' | 'request' | 'response' | 'tokens' | 'performance';
  /** 是否记录所有请求（用于导出） */
  logAllRequests: boolean;
  /** 最多保留多少条历史记录 */
  maxHistorySize: number;
  /** 是否显示原始 JSON */
  showRawJson: boolean;
  /** 是否显示敏感信息（API Key 等，默认隐藏） */
  showSensitiveInfo: boolean;
}

/**
 * 默认 Dev Mode 设置
 */
export function getDefaultDevModeSettings(): DevModeSettings {
  return {
    enabled: false,
    autoOpen: false,
    defaultTab: 'prompt',
    logAllRequests: false,
    maxHistorySize: 10,
    showRawJson: false,
    showSensitiveInfo: false,
  };
}

// ============================================================================
// 导出工具类型
// ============================================================================

/**
 * 导出数据格式
 */
export interface DevModeExportData {
  /** 导出时间 */
  exportedAt: Date;
  /** 应用版本 */
  appVersion?: string;
  /** 导出的数据列表 */
  data: DevModeData[];
  /** 元数据 */
  metadata?: {
    conversationTitle?: string;
    characterName?: string;
    [key: string]: any;
  };
}

/**
 * 导出选项
 */
export interface DevModeExportOptions {
  /** 是否包含敏感信息 */
  includeSensitive?: boolean;
  /** 是否美化 JSON */
  prettify?: boolean;
  /** 导出格式 */
  format?: 'json' | 'markdown' | 'text';
}