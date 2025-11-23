/**
 * 后处理器
 * 对最终提示词进行格式化和清理
 */

import type { ProcessedPromptMessage, PostProcessConfig } from '@/types';

/**
 * 默认后处理配置
 */
export const DEFAULT_POST_PROCESS_CONFIG: Required<PostProcessConfig> = {
  enableDeduplication: true,
  enableEmptyFilter: true,
  enableMerging: false, // 默认禁用，因为可能改变对话结构
  enableFormatting: true,
  enableLengthCheck: true,
  maxMessageLength: 32000, // 约8k tokens
  maxTotalTokens: 0, // 0表示不限制
  lengthExceededStrategy: 'warn',
};

/**
 * 后处理提示词内容
 * @param content - 原始内容
 * @returns 处理后的内容
 */
export function postProcess(content: string): string {
  let result = content;
  
  // 1. 去除多余的空行（连续多个空行替换为最多两个）
  result = removeExcessiveBlankLines(result);
  
  // 2. 去除首尾空白
  result = result.trim();
  
  // 3. 规范化换行符（确保使用 \n）
  result = normalizeLineEndings(result);
  
  // 4. 去除行尾空白
  result = removeTrailingWhitespace(result);
  
  return result;
}

/**
 * 去除多余的空行
 * 将连续3个或更多空行替换为2个空行
 */
function removeExcessiveBlankLines(content: string): string {
  // 匹配连续3个或更多的换行符，替换为2个
  return content.replace(/\n{3,}/g, '\n\n');
}

/**
 * 规范化换行符
 * 将 \r\n 和 \r 都转换为 \n
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * 去除行尾空白
 */
function removeTrailingWhitespace(content: string): string {
  return content
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');
}

/**
 * 批量后处理消息数组
 * @param messages - 消息数组
 * @returns 处理后的消息数组
 */
export function postProcessMessages<T extends { content: string }>(
  messages: T[]
): T[] {
  return messages.map(msg => ({
    ...msg,
    content: postProcess(msg.content),
  }));
}

/**
 * 检查内容是否为空或仅包含空白字符
 * @param content - 要检查的内容
 * @returns 是否为空
 */
export function isEmptyContent(content: string): boolean {
  return content.trim().length === 0;
}

/**
 * 过滤掉空内容的消息
 * @param messages - 消息数组
 * @returns 过滤后的消息数组
 */
export function filterEmptyMessages<T extends { content: string }>(
  messages: T[]
): T[] {
  return messages.filter(msg => !isEmptyContent(msg.content));
}

/**
 * 消息去重
 * 移除连续的重复消息（内容和角色都相同）
 * 注意：需要考虑 adaptedRole 字段
 * @param messages - 消息数组
 * @returns 去重后的消息数组
 */
export function deduplicateMessages(
  messages: ProcessedPromptMessage[]
): ProcessedPromptMessage[] {
  if (messages.length === 0) return messages;
  
  const result: ProcessedPromptMessage[] = [messages[0]];
  
  for (let i = 1; i < messages.length; i++) {
    const current = messages[i];
    const previous = result[result.length - 1];
    
    // 比较时使用 adaptedRole（如果存在）或原始 role
    const currentRole = current.adaptedRole || current.role;
    const previousRole = previous.adaptedRole || previous.role;
    
    // 如果角色和内容都不同，或者至少有一个不同，则保留
    if (
      currentRole !== previousRole ||
      current.content.trim() !== previous.content.trim()
    ) {
      result.push(current);
    }
    // 否则跳过（去重）
  }
  
  return result;
}

/**
 * 合并连续同角色消息
 * 将连续的相同角色的消息合并为一条（用双换行分隔）
 * @param messages - 消息数组
 * @param separator - 合并时使用的分隔符
 * @returns 合并后的消息数组
 */
export function mergeConsecutiveMessages(
  messages: ProcessedPromptMessage[],
  separator: string = '\n\n'
): ProcessedPromptMessage[] {
  if (messages.length === 0) return messages;
  
  const result: ProcessedPromptMessage[] = [];
  let currentGroup: ProcessedPromptMessage | null = null;
  
  for (const message of messages) {
    if (!currentGroup) {
      currentGroup = { ...message };
      continue;
    }
    
    // 比较时使用 adaptedRole（如果存在）或原始 role
    const currentRole = message.adaptedRole || message.role;
    const groupRole = currentGroup.adaptedRole || currentGroup.role;
    
    if (currentRole === groupRole) {
      // 同角色，合并内容
      currentGroup.content += separator + message.content;
    } else {
      // 不同角色，保存当前组并开始新组
      result.push(currentGroup);
      currentGroup = { ...message };
    }
  }
  
  // 保存最后一组
  if (currentGroup) {
    result.push(currentGroup);
  }
  
  return result;
}

/**
 * 检查消息长度
 * @param message - 消息
 * @param maxLength - 最大长度
 * @returns 检查结果
 */
export function checkMessageLength(
  message: ProcessedPromptMessage,
  maxLength: number
): { exceeded: boolean; length: number; maxLength: number } {
  const length = message.content.length;
  return {
    exceeded: length > maxLength,
    length,
    maxLength,
  };
}

/**
 * 截断过长的消息
 * @param message - 消息
 * @param maxLength - 最大长度
 * @param suffix - 截断后添加的后缀
 * @returns 截断后的消息
 */
export function truncateMessage(
  message: ProcessedPromptMessage,
  maxLength: number,
  suffix: string = '...[truncated]'
): ProcessedPromptMessage {
  if (message.content.length <= maxLength) {
    return message;
  }
  
  return {
    ...message,
    content: message.content.substring(0, maxLength - suffix.length) + suffix,
  };
}

/**
 * 高级后处理函数（支持完整配置）
 * @param messages - 消息数组
 * @param config - 后处理配置
 * @returns 处理后的消息数组和警告信息
 */
export function advancedPostProcess(
  messages: ProcessedPromptMessage[],
  config: PostProcessConfig = {}
): {
  messages: ProcessedPromptMessage[];
  warnings: string[];
} {
  const fullConfig = { ...DEFAULT_POST_PROCESS_CONFIG, ...config };
  const warnings: string[] = [];
  let result = [...messages];
  
  // 1. 格式化每条消息内容
  if (fullConfig.enableFormatting) {
    result = result.map(msg => ({
      ...msg,
      content: postProcess(msg.content),
    }));
  }
  
  // 2. 过滤空消息
  if (fullConfig.enableEmptyFilter) {
    const beforeCount = result.length;
    result = filterEmptyMessages(result);
    const removedCount = beforeCount - result.length;
    if (removedCount > 0) {
      warnings.push(`已过滤 ${removedCount} 条空消息`);
    }
  }
  
  // 3. 消息去重
  if (fullConfig.enableDeduplication) {
    const beforeCount = result.length;
    result = deduplicateMessages(result);
    const removedCount = beforeCount - result.length;
    if (removedCount > 0) {
      warnings.push(`已去除 ${removedCount} 条重复消息`);
    }
  }
  
  // 4. 合并连续同角色消息（可选）
  if (fullConfig.enableMerging) {
    const beforeCount = result.length;
    result = mergeConsecutiveMessages(result);
    const mergedCount = beforeCount - result.length;
    if (mergedCount > 0) {
      warnings.push(`已合并 ${mergedCount} 条连续同角色消息`);
    }
  }
  
  // 5. 长度检查
  if (fullConfig.enableLengthCheck && fullConfig.maxMessageLength > 0) {
    for (let i = 0; i < result.length; i++) {
      const check = checkMessageLength(result[i], fullConfig.maxMessageLength);
      if (check.exceeded) {
        const warningMsg = `消息 #${i + 1} 超长: ${check.length}/${check.maxLength} 字符`;
        
        if (fullConfig.lengthExceededStrategy === 'truncate') {
          result[i] = truncateMessage(result[i], fullConfig.maxMessageLength);
          warnings.push(`${warningMsg} (已截断)`);
        } else if (fullConfig.lengthExceededStrategy === 'error') {
          throw new Error(warningMsg);
        } else {
          warnings.push(warningMsg);
        }
      }
    }
  }
  
  // 6. 总Token数检查（如果配置了）
  if (fullConfig.enableLengthCheck && fullConfig.maxTotalTokens > 0) {
    // 简单估算：1 token ≈ 4 字符（英文），中文可能更少
    const estimatedTokens = result.reduce(
      (sum, msg) => sum + Math.ceil(msg.content.length / 3),
      0
    );
    
    if (estimatedTokens > fullConfig.maxTotalTokens) {
      warnings.push(
        `总Token数估算: ${estimatedTokens}/${fullConfig.maxTotalTokens} (可能超限)`
      );
    }
  }
  
  return { messages: result, warnings };
}

/**
 * 格式化选项
 */
export interface FormatOptions {
  maxConsecutiveBlankLines?: number;  // 最大连续空行数
  trimLines?: boolean;                // 是否去除行尾空白
  normalizeEndings?: boolean;         // 是否规范化换行符
}

/**
 * 高级格式化函数（可配置选项）
 * @param content - 原始内容
 * @param options - 格式化选项
 * @returns 格式化后的内容
 */
export function format(content: string, options: FormatOptions = {}): string {
  const {
    maxConsecutiveBlankLines = 2,
    trimLines = true,
    normalizeEndings = true,
  } = options;
  
  let result = content;
  
  // 规范化换行符
  if (normalizeEndings) {
    result = normalizeLineEndings(result);
  }
  
  // 去除多余空行
  if (maxConsecutiveBlankLines > 0) {
    const pattern = new RegExp(`\n{${maxConsecutiveBlankLines + 1},}`, 'g');
    result = result.replace(pattern, '\n'.repeat(maxConsecutiveBlankLines));
  }
  
  // 去除行尾空白
  if (trimLines) {
    result = removeTrailingWhitespace(result);
  }
  
  // 去除首尾空白
  result = result.trim();
  
  return result;
}