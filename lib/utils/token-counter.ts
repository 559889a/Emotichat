/**
 * Token 计数器工具
 * 支持多种 LLM 模型的 token 计数和限制管理
 */

import { Tiktoken, encodingForModel } from 'js-tiktoken';
import type { Message } from '@/types';

// 模型 Token 限制配置
export const MODEL_TOKEN_LIMITS: Record<string, number> = {
  // OpenAI Models
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-preview': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-16k': 16384,
  'gpt-3.5-turbo-1106': 16384,
  
  // Google Gemini Models
  'gemini-pro': 32760,
  'gemini-1.5-pro': 1048576,
  'gemini-1.5-flash': 1048576,
  'gemini-2.0-flash-exp': 1048576,
  
  // Anthropic Claude Models
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-3-5-sonnet': 200000,
  'claude-3-5-haiku': 200000,
  
  // X.AI Models
  'grok-beta': 128000,
  'grok-2': 128000,
  
  // 默认值
  'default': 4096,
};

// 警告级别
export type TokenWarningLevel = 'safe' | 'warning' | 'critical' | 'exceeded';

// Token 使用情况
export interface TokenUsage {
  used: number;           // 已使用的 token 数
  limit: number;          // token 限制
  remaining: number;      // 剩余可用 token
  percentage: number;     // 使用百分比
  warningLevel: TokenWarningLevel; // 警告级别
}

// Token 计数配置
export interface TokenCountConfig {
  model?: string;         // 模型名称（用于获取限制）
  customLimit?: number;   // 自定义限制（覆盖默认）
  estimateMode?: boolean; // 是否使用估算模式（对于不支持的模型）
}

/**
 * 获取模型的 token 限制
 */
export function getModelTokenLimit(model: string): number {
  // 精确匹配
  if (MODEL_TOKEN_LIMITS[model]) {
    return MODEL_TOKEN_LIMITS[model];
  }
  
  // 模糊匹配（例如 gpt-4-0613 匹配 gpt-4）
  for (const [key, limit] of Object.entries(MODEL_TOKEN_LIMITS)) {
    if (model.startsWith(key)) {
      return limit;
    }
  }
  
  // 返回默认值
  return MODEL_TOKEN_LIMITS['default'];
}

/**
 * 使用 tiktoken 计算精确的 token 数量（仅支持 OpenAI 模型）
 */
export function countTokensExact(text: string, model: string = 'gpt-4'): number {
  try {
    // 尝试为特定模型获取编码器
    let encoding: Tiktoken;
    
    // 支持的模型列表
    const supportedModels = [
      'gpt-4',
      'gpt-4-32k',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-3.5-turbo',
    ];
    
    // 检查是否是支持的模型
    const matchedModel = supportedModels.find(m => model.startsWith(m));
    
    if (matchedModel) {
      encoding = encodingForModel(matchedModel as any);
    } else {
      // 使用默认编码器
      encoding = encodingForModel('gpt-4');
    }
    
    const tokens = encoding.encode(text);
    return tokens.length;
  } catch (error) {
    console.warn('Token counting failed, falling back to estimation:', error);
    return countTokensEstimate(text);
  }
}

/**
 * 估算 token 数量（通用方法，适用于所有模型）
 * 规则：1 token ≈ 4 个字符（英文）或 ≈ 1.5 个中文字符
 */
export function countTokensEstimate(text: string): number {
  if (!text) return 0;
  
  // 分别计算中文和非中文字符
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const otherChars = text.replace(/[\u4e00-\u9fa5]/g, '');
  
  // 中文字符：1.5 个字符 ≈ 1 token
  // 其他字符：4 个字符 ≈ 1 token
  const chineseTokens = Math.ceil(chineseChars.length / 1.5);
  const otherTokens = Math.ceil(otherChars.length / 4);
  
  return chineseTokens + otherTokens;
}

/**
 * 计算文本的 token 数量
 * 自动选择精确计数或估算
 */
export function countTokens(
  text: string,
  config: TokenCountConfig = {}
): number {
  const { model = 'gpt-4', estimateMode = false } = config;
  
  if (!text) return 0;
  
  // 如果强制使用估算模式，或者不是 OpenAI 模型
  if (estimateMode || !model.startsWith('gpt-')) {
    return countTokensEstimate(text);
  }
  
  // 尝试使用精确计数
  return countTokensExact(text, model);
}

/**
 * 计算消息数组的总 token 数
 */
export function countMessagesTokens(
  messages: Message[],
  config: TokenCountConfig = {}
): number {
  if (!messages || messages.length === 0) return 0;
  
  let totalTokens = 0;
  
  for (const message of messages) {
    // 计算消息内容的 token
    const contentTokens = countTokens(message.content, config);
    
    // 添加消息格式的开销（大约 4 个 token per message）
    // 包括 role、content 等字段的格式化开销
    const formatOverhead = 4;
    
    totalTokens += contentTokens + formatOverhead;
  }
  
  return totalTokens;
}

/**
 * 计算 Token 使用情况
 */
export function calculateTokenUsage(
  usedTokens: number,
  config: TokenCountConfig = {}
): TokenUsage {
  const { model = 'gpt-4', customLimit } = config;
  const limit = customLimit || getModelTokenLimit(model);
  const remaining = Math.max(0, limit - usedTokens);
  const percentage = Math.min(100, (usedTokens / limit) * 100);
  
  // 确定警告级别
  let warningLevel: TokenWarningLevel = 'safe';
  if (percentage >= 100) {
    warningLevel = 'exceeded';
  } else if (percentage >= 90) {
    warningLevel = 'critical';
  } else if (percentage >= 80) {
    warningLevel = 'warning';
  }
  
  return {
    used: usedTokens,
    limit,
    remaining,
    percentage: Math.round(percentage * 10) / 10, // 保留一位小数
    warningLevel,
  };
}

/**
 * 获取警告消息
 */
export function getWarningMessage(usage: TokenUsage): string | null {
  switch (usage.warningLevel) {
    case 'exceeded':
      return `Token 数量已超过限制！当前：${usage.used}，限制：${usage.limit}。建议删除旧消息或开始新对话。`;
    case 'critical':
      return `Token 数量接近限制（${usage.percentage.toFixed(1)}%）。建议尽快清理旧消息。`;
    case 'warning':
      return `Token 使用量较高（${usage.percentage.toFixed(1)}%）。请注意控制对话长度。`;
    default:
      return null;
  }
}

/**
 * 获取警告颜色类名
 */
export function getWarningColorClass(level: TokenWarningLevel): string {
  switch (level) {
    case 'exceeded':
      return 'text-red-600 dark:text-red-400';
    case 'critical':
      return 'text-orange-600 dark:text-orange-400';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-green-600 dark:text-green-400';
  }
}

/**
 * 获取进度条颜色类名
 */
export function getProgressColorClass(level: TokenWarningLevel): string {
  switch (level) {
    case 'exceeded':
      return 'bg-red-600 dark:bg-red-500';
    case 'critical':
      return 'bg-orange-600 dark:bg-orange-500';
    case 'warning':
      return 'bg-yellow-600 dark:bg-yellow-500';
    default:
      return 'bg-green-600 dark:bg-green-500';
  }
}

/**
 * 格式化 token 数量显示
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}