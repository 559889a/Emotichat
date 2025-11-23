/**
 * 注入处理器
 * 按深度（depth）将提示词注入到指定位置
 * 
 * 深度（Depth）概念：
 * - 深度0: 最高优先级注入位置（LLM 强遵守）
 * - 深度1: 当前用户消息位置
 * - 深度N: 往前第 N 条用户消息
 */

import type { ProcessedPromptMessage, PromptItem, PromptRole } from '@/types/prompt';

/**
 * 处理提示词注入
 * @param messages - 当前消息数组
 * @param injections - 需要注入的提示词项
 * @returns 注入后的消息数组
 */
export function processInjections(
  messages: ProcessedPromptMessage[],
  injections: PromptItem[]
): ProcessedPromptMessage[] {
  // 过滤出启用的注入项
  const enabledInjections = injections.filter(
    item => item.enabled && item.injection?.enabled
  );
  
  if (enabledInjections.length === 0) {
    return messages;
  }
  
  // 按深度分组注入项（深度0优先级最高）
  const injectionsByDepth = groupInjectionsByDepth(enabledInjections);
  
  // 计算每个深度的注入位置
  const userMessageIndices = findUserMessageIndices(messages);
  
  // 创建结果数组（深拷贝）
  let result = [...messages];
  
  // 按深度从高到低处理注入（深度0最先注入，在最后位置）
  const sortedDepths = Array.from(injectionsByDepth.keys()).sort((a, b) => a - b);
  
  for (const depth of sortedDepths) {
    const depthInjections = injectionsByDepth.get(depth) || [];
    result = injectAtDepth(result, depthInjections, depth, userMessageIndices);
  }
  
  return result;
}

/**
 * 按深度分组注入项
 */
function groupInjectionsByDepth(injections: PromptItem[]): Map<number, PromptItem[]> {
  const grouped = new Map<number, PromptItem[]>();
  
  for (const item of injections) {
    const depth = item.injection?.depth ?? 0;
    const existing = grouped.get(depth) || [];
    existing.push(item);
    grouped.set(depth, existing);
  }
  
  return grouped;
}

/**
 * 找到所有用户消息的索引
 */
function findUserMessageIndices(messages: ProcessedPromptMessage[]): number[] {
  const indices: number[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      indices.push(i);
    }
  }
  
  return indices;
}

/**
 * 在指定深度注入提示词
 */
function injectAtDepth(
  messages: ProcessedPromptMessage[],
  injections: PromptItem[],
  depth: number,
  userMessageIndices: number[]
): ProcessedPromptMessage[] {
  if (injections.length === 0) {
    return messages;
  }
  
  // 计算注入位置
  const insertPosition = calculateInsertPosition(depth, userMessageIndices, messages.length);
  
  // 将注入项转换为消息
  const injectionMessages = injections
    .sort((a, b) => a.order - b.order)
    .map(item => convertToMessage(item));
  
  // 在指定位置注入
  const result = [...messages];
  result.splice(insertPosition, 0, ...injectionMessages);
  
  return result;
}

/**
 * 计算插入位置
 * @param depth - 深度
 * @param userMessageIndices - 用户消息索引数组
 * @param totalMessages - 总消息数
 * @returns 插入位置索引
 */
function calculateInsertPosition(
  depth: number,
  userMessageIndices: number[],
  totalMessages: number
): number {
  // 深度0：在最后一条用户消息之前（最高优先级位置）
  if (depth === 0) {
    if (userMessageIndices.length === 0) {
      // 没有用户消息，插入到末尾
      return totalMessages;
    }
    // 插入到最后一条用户消息之前
    return userMessageIndices[userMessageIndices.length - 1];
  }
  
  // 深度 N：从最后一条用户消息往前数第 N 条
  const targetIndex = userMessageIndices.length - depth;
  
  if (targetIndex < 0) {
    // 深度超过用户消息数量，插入到开头
    return 0;
  }
  
  // 插入到目标用户消息之前
  return userMessageIndices[targetIndex];
}

/**
 * 将 PromptItem 转换为 ProcessedPromptMessage
 */
function convertToMessage(item: PromptItem): ProcessedPromptMessage {
  return {
    role: item.role as PromptRole,
    content: item.content,
    layer: undefined, // 注入的消息不设置楼层
  };
}

/**
 * 创建注入消息
 * @param content - 消息内容
 * @param role - 消息角色
 * @param depth - 注入深度
 * @returns 处理后的提示词消息
 */
export function createInjectionMessage(
  content: string,
  role: PromptRole = 'system',
  depth: number = 0
): ProcessedPromptMessage {
  return {
    role,
    content,
    layer: undefined,
  };
}