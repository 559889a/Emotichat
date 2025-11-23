/**
 * Role 适配器
 * 将统一的内部角色格式适配到不同 LLM 提供商的要求
 * 
 * ⚠️ 特别注意：Gemini 必须合并所有 system 消息为 System Instructions
 */

import type { ProcessedPromptMessage } from '@/types/prompt';

/**
 * 支持的 LLM 提供商类型
 */
export type ProviderType = 'openai' | 'gemini' | 'anthropic';

/**
 * 适配角色到指定提供商的格式
 * @param messages - 处理后的提示词消息数组
 * @param provider - LLM 提供商类型
 * @returns 适配后的消息数组
 */
export function adaptRoleForProvider(
  messages: ProcessedPromptMessage[],
  provider: ProviderType
): ProcessedPromptMessage[] {
  switch (provider) {
    case 'gemini':
      return adaptForGemini(messages);
    case 'openai':
      return adaptForOpenAI(messages);
    case 'anthropic':
      return adaptForAnthropic(messages);
    default:
      // 默认保持原样
      return messages;
  }
}

/**
 * 适配到 Gemini 格式
 * ⚠️ 关键：Gemini 不支持 system role，需要特殊处理
 * - 所有 system 消息合并为 System Instructions（单独传递）
 * - assistant -> model
 * - user 保持不变
 */
function adaptForGemini(messages: ProcessedPromptMessage[]): ProcessedPromptMessage[] {
  const result: ProcessedPromptMessage[] = [];
  const systemMessages: string[] = [];
  
  // 第一步：收集所有 system 消息
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemMessages.push(msg.content);
    }
  }
  
  // 第二步：如果有 system 消息，创建一个 System Instructions 消息
  // 注意：这个消息需要在调用 Gemini API 时特殊处理
  if (systemMessages.length > 0) {
    const combinedSystemContent = systemMessages.join('\n\n');
    result.push({
      role: 'system',
      content: combinedSystemContent,
      adaptedRole: 'system_instruction', // 标记为 System Instructions
    });
  }
  
  // 第三步：处理其他消息
  for (const msg of messages) {
    if (msg.role === 'system') {
      // system 消息已经合并，跳过
      continue;
    }
    
    if (msg.role === 'assistant') {
      // assistant -> model
      result.push({
        ...msg,
        adaptedRole: 'model',
      });
    } else if (msg.role === 'user') {
      // user 保持不变
      result.push({
        ...msg,
        adaptedRole: 'user',
      });
    } else {
      // 其他未知角色保持原样
      result.push(msg);
    }
  }
  
  return result;
}

/**
 * 适配到 OpenAI 格式
 * OpenAI 支持标准的 system/user/assistant 角色
 */
function adaptForOpenAI(messages: ProcessedPromptMessage[]): ProcessedPromptMessage[] {
  return messages.map(msg => ({
    ...msg,
    adaptedRole: msg.role, // 保持原样
  }));
}

/**
 * 适配到 Anthropic (Claude) 格式
 * Claude 支持标准的 system/user/assistant 角色
 * 注意：Claude 的 system 消息通常作为独立参数传递，但这里保持与 OpenAI 一致
 */
function adaptForAnthropic(messages: ProcessedPromptMessage[]): ProcessedPromptMessage[] {
  return messages.map(msg => ({
    ...msg,
    adaptedRole: msg.role, // 保持原样
  }));
}

/**
 * 从适配后的消息中提取 Gemini 的 System Instructions
 * @param messages - 适配后的消息数组
 * @returns System Instructions 内容（如果存在）
 */
export function extractGeminiSystemInstructions(
  messages: ProcessedPromptMessage[]
): string | undefined {
  const systemMsg = messages.find(msg => msg.adaptedRole === 'system_instruction');
  return systemMsg?.content;
}

/**
 * 从适配后的消息中过滤掉 System Instructions（用于 Gemini）
 * @param messages - 适配后的消息数组
 * @returns 过滤后的消息数组（不包含 System Instructions）
 */
export function filterOutSystemInstructions(
  messages: ProcessedPromptMessage[]
): ProcessedPromptMessage[] {
  return messages.filter(msg => msg.adaptedRole !== 'system_instruction');
}