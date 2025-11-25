/**
 * Token 计数器工具
 * 支持多种 LLM 模型的 token 计数和限制管理
 *
 * 支持的模型分词器估算：
 * - GPT/OpenAI: tiktoken (cl100k_base)
 * - Claude: 类似 GPT 的估算
 * - Gemini: Google 分词器估算
 * - DeepSeek: 中文优化分词器
 * - Qwen (通义千问): 中文优化分词器
 * - GLM (智谱): 中文优化分词器
 * - Kimi (月之暗面): 中文优化分词器
 * - Grok: 类似 GPT 的估算
 */

import { Tiktoken, encodingForModel } from 'js-tiktoken';
import type { Message } from '@/types';

/**
 * 模型分词器类型
 */
export type TokenizerType = 'openai' | 'claude' | 'gemini' | 'chinese_optimized' | 'grok';

/**
 * 模型关键字到分词器类型的映射
 */
const MODEL_TOKENIZER_MAP: Record<string, TokenizerType> = {
  // OpenAI 系列
  'gpt': 'openai',
  // Anthropic 系列
  'claude': 'claude',
  // Google 系列
  'gemini': 'gemini',
  // 中文优化模型
  'deepseek': 'chinese_optimized',
  'qwen': 'chinese_optimized',
  'glm': 'chinese_optimized',
  'kimi': 'chinese_optimized',
  // X.AI
  'grok': 'grok',
};

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
 * 检测模型名称中的分词器类型
 * 忽略大小写匹配关键字
 */
export function detectTokenizerType(modelName: string): TokenizerType {
  if (!modelName) return 'openai';

  const lowerName = modelName.toLowerCase();

  // 按优先级检测关键字
  for (const [keyword, tokenizerType] of Object.entries(MODEL_TOKENIZER_MAP)) {
    if (lowerName.includes(keyword)) {
      return tokenizerType;
    }
  }

  // 默认使用 OpenAI 分词器
  return 'openai';
}

/**
 * 根据分词器类型估算 token 数量
 *
 * 各分词器的估算规则（基于实际分词器特性）：
 * - openai: 英文约 4 字符/token，中文约 1.5 字符/token
 * - claude: 与 OpenAI 类似，略有差异（英文 4，中文 1.4）
 * - gemini: Google 的 SentencePiece 分词器（英文 4.5，中文 1.8）
 * - chinese_optimized: 中文优化模型（英文 4，中文 0.7-0.9）
 * - grok: 与 OpenAI 类似
 */
export function countTokensByTokenizer(text: string, tokenizer: TokenizerType): number {
  if (!text) return 0;

  // 分别计算中文和非中文字符
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const otherChars = text.replace(/[\u4e00-\u9fa5]/g, '');

  let chineseRatio: number;
  let otherRatio: number;

  switch (tokenizer) {
    case 'openai':
    case 'grok':
      // OpenAI/Grok: cl100k_base 编码
      // 中文约 1.5 字符/token，英文约 4 字符/token
      chineseRatio = 1.5;
      otherRatio = 4;
      break;

    case 'claude':
      // Claude: 使用自定义分词器，与 OpenAI 类似但对某些符号处理不同
      // 中文约 1.4 字符/token，英文约 4 字符/token
      chineseRatio = 1.4;
      otherRatio = 4;
      break;

    case 'gemini':
      // Gemini: 使用 SentencePiece 分词器
      // 中文约 1.8 字符/token，英文约 4.5 字符/token
      chineseRatio = 1.8;
      otherRatio = 4.5;
      break;

    case 'chinese_optimized':
      // 中文优化模型（DeepSeek、Qwen、GLM、Kimi）
      // 这些模型对中文做了特殊优化，中文约 0.8 字符/token
      // 英文处理与 OpenAI 类似
      chineseRatio = 0.8;
      otherRatio = 4;
      break;

    default:
      // 默认使用 OpenAI 的估算
      chineseRatio = 1.5;
      otherRatio = 4;
  }

  const chineseTokens = Math.ceil(chineseChars.length / chineseRatio);
  const otherTokens = Math.ceil(otherChars.length / otherRatio);

  return chineseTokens + otherTokens;
}

/**
 * 根据全局模型配置估算 token 数量
 * 这是推荐使用的主函数，会自动检测模型类型并使用对应分词器
 */
export function countTokensForModel(text: string, modelName?: string): number {
  if (!text) return 0;

  // 如果没有指定模型，尝试从全局配置获取
  let model = modelName;
  if (!model && typeof window !== 'undefined') {
    try {
      const globalConfig = localStorage.getItem('globalModelConfig');
      if (globalConfig) {
        const config = JSON.parse(globalConfig);
        model = config.modelId;
      }
    } catch (error) {
      // 忽略解析错误
    }
  }

  // 检测分词器类型
  const tokenizerType = detectTokenizerType(model || '');

  // 使用对应分词器估算
  return countTokensByTokenizer(text, tokenizerType);
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
 * 使用 countTokensForModel 自动检测模型类型并使用对应的分词器估算
 */
export function countMessagesTokens(
  messages: Message[],
  config: TokenCountConfig = {}
): number {
  if (!messages || messages.length === 0) return 0;

  let totalTokens = 0;

  for (const message of messages) {
    // 使用 countTokensForModel 自动检测模型类型
    // 如果 config 指定了 model，使用指定的；否则自动从全局配置获取
    const contentTokens = countTokensForModel(message.content, config.model);

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