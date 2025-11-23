/**
 * 提示词主构建器
 * 整合所有模块，按流程处理提示词：
 * 
 * 处理流程：
 * 原始提示词 → 变量替换 → 占位符替换 → 宏展开 → 排序整合 → 注入处理 → Role适配 → 后处理 → 最终输出
 */

import type {
  Character,
  Conversation,
  Message,
  ProcessedPromptMessage,
  PromptBuildContext,
  PromptItem,
  PromptRole,
} from '@/types';

import { replaceVariables, getCurrentSystemVariables } from './variables';
import { replacePlaceholders } from './placeholders';
import { expandMacros, createMacroStore, macroStoreToRecord } from './macros';
import { adaptRoleForProvider, type ProviderType } from './role-adapter';
import { processInjections } from './injection';
import {
  postProcess,
  filterEmptyMessages,
  advancedPostProcess,
  DEFAULT_POST_PROCESS_CONFIG
} from './post-processor';
import type { PostProcessConfig } from '@/types';

/**
 * 构建选项
 */
export interface BuildPromptOptions {
  /** 是否跳过后处理 */
  skipPostProcess?: boolean;
  /** 后处理配置 */
  postProcessConfig?: PostProcessConfig;
  /** 自定义用户名 */
  userName?: string;
  /** 额外的系统变量 */
  extraVariables?: Record<string, string>;
}

/**
 * 构建结果
 */
export interface BuildPromptResult {
  /** 处理后的消息数组 */
  messages: ProcessedPromptMessage[];
  /** 更新后的宏变量（用于持久化） */
  updatedVariables?: Record<string, string>;
  /** 后处理警告信息 */
  warnings?: string[];
}

/**
 * 主构建函数
 * @param character - 角色信息
 * @param conversation - 对话信息
 * @param messages - 消息历史
 * @param provider - LLM 提供商
 * @param options - 构建选项
 * @returns 构建后的提示词消息数组
 */
export function buildPrompt(
  character: Character,
  conversation: Conversation,
  messages: Message[],
  provider: string,
  options: BuildPromptOptions = {}
): ProcessedPromptMessage[] {
  const result = buildPromptWithContext(character, conversation, messages, provider, options);
  return result.messages;
}

/**
 * 带上下文的主构建函数
 * @param character - 角色信息
 * @param conversation - 对话信息
 * @param messages - 消息历史
 * @param provider - LLM 提供商
 * @param options - 构建选项
 * @returns 构建结果（包含消息和更新的变量）
 */
export function buildPromptWithContext(
  character: Character,
  conversation: Conversation,
  messages: Message[],
  provider: string,
  options: BuildPromptOptions = {}
): BuildPromptResult {
  // 1. 构建上下文
  const context = createBuildContext(character, conversation, messages, options);
  
  // 2. 收集所有提示词项
  const allPromptItems = collectPromptItems(character, conversation);
  
  // 3. 创建宏存储（从对话变量初始化）
  const macroStore = createMacroStore(conversation.promptConfig?.variables);
  
  // 4. 处理每个提示词项
  const processedPromptItems = allPromptItems.map(item => 
    processPromptItem(item, context, macroStore)
  );
  
  // 5. 排序提示词项
  const sortedPromptItems = sortPromptItems(processedPromptItems);
  
  // 6. 分离普通消息和注入消息
  const { normalItems, injectionItems } = separateInjectionItems(sortedPromptItems);
  
  // 7. 构建基础消息数组（包含历史消息）
  let processedMessages = buildBaseMessages(normalItems, messages, context, macroStore);
  
  // 8. 处理注入
  processedMessages = processInjections(processedMessages, injectionItems);
  
  // 9. Role 适配
  const providerType = normalizeProvider(provider);
  processedMessages = adaptRoleForProvider(processedMessages, providerType);
  
  // 10. 后处理
  let warnings: string[] | undefined;
  if (!options.skipPostProcess) {
    const postProcessResult = advancedPostProcess(
      processedMessages,
      options.postProcessConfig || DEFAULT_POST_PROCESS_CONFIG
    );
    processedMessages = postProcessResult.messages;
    warnings = postProcessResult.warnings.length > 0 ? postProcessResult.warnings : undefined;
  }
  
  return {
    messages: processedMessages,
    updatedVariables: macroStoreToRecord(macroStore),
    warnings,
  };
}

/**
 * 创建构建上下文
 */
function createBuildContext(
  character: Character,
  conversation: Conversation,
  messages: Message[],
  options: BuildPromptOptions
): PromptBuildContext {
  // 获取系统变量
  const systemVariables = getCurrentSystemVariables();
  
  // 找到最后一条用户消息
  const lastUserMessage = messages
    .filter(m => m.role === 'user')
    .pop()?.content;
  
  // 构建消息历史
  const messageHistory = messages.map(m => ({
    role: m.role as PromptRole,
    content: m.content,
  }));
  
  return {
    characterId: character.id,
    characterName: character.name,
    conversationId: conversation.id,
    userName: options.userName || 'User',
    messageHistory,
    lastUserMessage,
    systemVariables: {
      ...systemVariables,
      ...options.extraVariables,
    },
    temporaryVariables: conversation.promptConfig?.variables,
  };
}

/**
 * 收集所有提示词项
 */
function collectPromptItems(
  character: Character,
  conversation: Conversation
): PromptItem[] {
  const items: PromptItem[] = [];
  
  // 1. 添加角色系统提示词
  if (character.systemPrompt) {
    items.push({
      id: `system-${character.id}`,
      order: 0,
      content: character.systemPrompt,
      enabled: true,
      role: 'system',
      name: 'System Prompt',
    });
  }
  
  // 2. 添加角色级提示词配置
  if (character.promptConfig?.prompts) {
    items.push(...character.promptConfig.prompts);
  }
  
  // 3. 添加对话级提示词配置
  if (conversation.promptConfig?.prompts) {
    items.push(...conversation.promptConfig.prompts);
  }
  
  // 4. 添加对话主提示词
  if (conversation.promptConfig?.mainPrompt) {
    items.push({
      id: `main-${conversation.id}`,
      order: 1000, // 高优先级
      content: conversation.promptConfig.mainPrompt,
      enabled: true,
      role: 'system',
      name: 'Main Prompt',
    });
  }
  
  return items;
}

/**
 * 处理单个提示词项
 */
function processPromptItem(
  item: PromptItem,
  context: PromptBuildContext,
  macroStore: Map<string, string>
): PromptItem {
  if (!item.enabled) {
    return item;
  }
  
  let content = item.content;
  
  // 1. 变量替换
  content = replaceVariables(content, context);
  
  // 2. 占位符替换
  content = replacePlaceholders(content, context);
  
  // 3. 宏展开
  content = expandMacros(content, macroStore);
  
  return {
    ...item,
    content,
  };
}

/**
 * 排序提示词项
 */
function sortPromptItems(items: PromptItem[]): PromptItem[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/**
 * 分离普通消息和注入消息
 */
function separateInjectionItems(items: PromptItem[]): {
  normalItems: PromptItem[];
  injectionItems: PromptItem[];
} {
  const normalItems: PromptItem[] = [];
  const injectionItems: PromptItem[] = [];
  
  for (const item of items) {
    if (item.injection?.enabled) {
      injectionItems.push(item);
    } else {
      normalItems.push(item);
    }
  }
  
  return { normalItems, injectionItems };
}

/**
 * 构建基础消息数组
 */
function buildBaseMessages(
  promptItems: PromptItem[],
  historyMessages: Message[],
  context: PromptBuildContext,
  macroStore: Map<string, string>
): ProcessedPromptMessage[] {
  const result: ProcessedPromptMessage[] = [];
  
  // 1. 添加启用的提示词项（非注入类型）
  for (const item of promptItems) {
    if (item.enabled && !item.injection?.enabled) {
      result.push({
        role: item.role,
        content: item.content,
        layer: undefined,
      });
    }
  }
  
  // 2. 添加历史消息
  for (let i = 0; i < historyMessages.length; i++) {
    const msg = historyMessages[i];
    let content = msg.content;
    
    // 对历史消息也进行处理
    content = replaceVariables(content, context);
    content = replacePlaceholders(content, context);
    content = expandMacros(content, macroStore);
    
    result.push({
      role: msg.role as PromptRole,
      content,
      layer: i, // 设置楼层编号
    });
  }
  
  return result;
}

/**
 * 规范化提供商名称
 */
function normalizeProvider(provider: string): ProviderType {
  const normalized = provider.toLowerCase();
  
  if (normalized.includes('gemini') || normalized.includes('google')) {
    return 'gemini';
  }
  
  if (normalized.includes('claude') || normalized.includes('anthropic')) {
    return 'anthropic';
  }
  
  if (normalized.includes('openai') || normalized.includes('gpt')) {
    return 'openai';
  }
  
  // 默认使用 OpenAI 格式
  return 'openai';
}

/**
 * 简化版构建函数（仅用于快速测试）
 */
export function buildSimplePrompt(
  systemPrompt: string,
  messages: Array<{ role: PromptRole; content: string }>,
  provider: string = 'openai'
): ProcessedPromptMessage[] {
  const result: ProcessedPromptMessage[] = [
    {
      role: 'system',
      content: postProcess(systemPrompt),
    },
    ...messages.map(msg => ({
      role: msg.role,
      content: postProcess(msg.content),
    })),
  ];
  
  const providerType = normalizeProvider(provider);
  return adaptRoleForProvider(result, providerType);
}