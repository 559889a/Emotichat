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
  PromptPreset,
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
  /** 激活的用户角色（用于 user_prompts 引用和 {{user}} 变量） */
  activeUserProfile?: Character;
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
 * @param activePreset - 活动预设（可选）
 * @returns 构建后的提示词消息数组
 */
export function buildPrompt(
  character: Character,
  conversation: Conversation,
  messages: Message[],
  provider: string,
  options: BuildPromptOptions = {},
  activePreset?: PromptPreset | null
): ProcessedPromptMessage[] {
  const result = buildPromptWithContext(character, conversation, messages, provider, options, activePreset);
  return result.messages;
}

/**
 * 带上下文的主构建函数
 * @param character - 角色信息
 * @param conversation - 对话信息
 * @param messages - 消息历史
 * @param provider - LLM 提供商
 * @param options - 构建选项
 * @param activePreset - 活动预设（可选）
 * @returns 构建结果（包含消息和更新的变量）
 */
export function buildPromptWithContext(
  character: Character,
  conversation: Conversation,
  messages: Message[],
  provider: string,
  options: BuildPromptOptions = {},
  activePreset?: PromptPreset | null
): BuildPromptResult {
  // 1. 构建上下文
  const context = createBuildContext(character, conversation, messages, options);

  // 2. 收集所有提示词项（使用预设或传统方式）
  console.log('[Prompt Builder] Active Preset:', activePreset ? `${activePreset.name} (${activePreset.id})` : 'None');
  const allPromptItems = activePreset
    ? collectPromptItemsWithPreset(character, conversation, activePreset, options.activeUserProfile)
    : collectPromptItems(character, conversation);
  console.log('[Prompt Builder] Collected Prompt Items:', allPromptItems.length, 'items');

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

  // 11. 后处理
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
 * 使用预设收集提示词项（支持引用展开）
 * 预设控制全局提示词顺序，引用项在此展开
 */
function collectPromptItemsWithPreset(
  character: Character,
  conversation: Conversation,
  preset: PromptPreset,
  activeUserProfile?: Character
): PromptItem[] {
  const result: PromptItem[] = [];

  // 按预设的提示词顺序处理
  const presetPrompts = [...preset.prompts].sort((a, b) => a.order - b.order);
  console.log('[collectPromptItemsWithPreset] Processing', presetPrompts.length, 'preset prompts');

  for (const presetItem of presetPrompts) {
    if (!presetItem.enabled) {
      console.log('[collectPromptItemsWithPreset] Skipping disabled item:', presetItem.name || presetItem.id);
      continue;
    }

    // 如果是引用类型，展开为实际内容
    if (presetItem.referenceType) {
      console.log('[collectPromptItemsWithPreset] Expanding reference:', presetItem.referenceType);
      const expandedItems = expandReferenceItem(presetItem, character, conversation, activeUserProfile);
      console.log('[collectPromptItemsWithPreset] Expanded to', expandedItems.length, 'items');
      result.push(...expandedItems);
    } else {
      // 普通提示词项，直接添加
      console.log('[collectPromptItemsWithPreset] Adding custom prompt:', presetItem.name || presetItem.id);
      result.push({ ...presetItem });
    }
  }

  console.log('[collectPromptItemsWithPreset] Total items collected:', result.length);
  return result;
}

/**
 * 展开引用项为实际的提示词项
 *
 * 重要：为避免重复，优先使用 promptConfig.prompts（新版配置）
 * 只有在 promptConfig.prompts 为空时才回退到 systemPrompt（旧版配置）
 */
function expandReferenceItem(
  refItem: PromptItem,
  character: Character,
  conversation: Conversation,
  activeUserProfile?: Character
): PromptItem[] {
  const items: PromptItem[] = [];
  // 使用引用项配置的 role，如果未配置则默认为 'system'
  const targetRole = refItem.role || 'system';

  switch (refItem.referenceType) {
    case 'character_prompts':
      // 引用：角色设定 - 角色的所有提示词
      const charHasNewConfig = character.promptConfig?.prompts && character.promptConfig.prompts.length > 0;
      console.log('[expandReferenceItem] character_prompts - has systemPrompt:', !!character.systemPrompt);
      console.log('[expandReferenceItem] character_prompts - has promptConfig.prompts:', charHasNewConfig, character.promptConfig?.prompts?.length || 0);
      console.log('[expandReferenceItem] character_prompts - using role:', targetRole);

      if (charHasNewConfig) {
        // 优先使用新版配置，并只添加启用的提示词项
        const enabledPrompts = character.promptConfig!.prompts.filter(p => p.enabled);
        console.log('[expandReferenceItem] character_prompts - using new config, enabled prompts:', enabledPrompts.length);
        // 使用引用项配置的 role 覆盖原本的 role
        items.push(...enabledPrompts.map(p => ({ ...p, order: refItem.order, role: targetRole })));
      } else if (character.systemPrompt) {
        // 回退到旧版 systemPrompt
        console.log('[expandReferenceItem] character_prompts - falling back to legacy systemPrompt');
        items.push({
          id: `ref-char-system-${character.id}`,
          order: refItem.order,
          content: character.systemPrompt,
          enabled: true,
          role: targetRole,
          name: '角色系统提示词',
        });
      }
      break;

    case 'user_prompts':
      // 引用：用户设定 - 使用激活的用户角色
      console.log('[expandReferenceItem] user_prompts - has activeUserProfile:', !!activeUserProfile);
      console.log('[expandReferenceItem] user_prompts - using role:', targetRole);
      if (activeUserProfile) {
        const userHasNewConfig = activeUserProfile.promptConfig?.prompts && activeUserProfile.promptConfig.prompts.length > 0;
        console.log('[expandReferenceItem] user_prompts - has systemPrompt:', !!activeUserProfile.systemPrompt);
        console.log('[expandReferenceItem] user_prompts - has promptConfig.prompts:', userHasNewConfig, activeUserProfile.promptConfig?.prompts?.length || 0);

        if (userHasNewConfig) {
          // 优先使用新版配置，并只添加启用的提示词项
          const enabledPrompts = activeUserProfile.promptConfig!.prompts.filter(p => p.enabled);
          console.log('[expandReferenceItem] user_prompts - using new config, enabled prompts:', enabledPrompts.length);
          // 使用引用项配置的 role 覆盖原本的 role
          items.push(...enabledPrompts.map(p => ({ ...p, order: refItem.order, role: targetRole })));
        } else if (activeUserProfile.systemPrompt) {
          // 回退到旧版 systemPrompt
          console.log('[expandReferenceItem] user_prompts - falling back to legacy systemPrompt');
          items.push({
            id: `ref-user-system-${activeUserProfile.id}`,
            order: refItem.order,
            content: activeUserProfile.systemPrompt,
            enabled: true,
            role: targetRole,
            name: '用户角色系统提示词',
          });
        }
      }
      // 如果没有激活的用户角色，不添加任何内容（引用为空）
      break;

    case 'chat_history':
      // 引用：聊天记录 - 不需要在这里处理
      // 历史消息会在 buildBaseMessages 中添加
      // 这里添加一个标记项，用于控制历史消息的插入位置
      // 注意：chat_history 的 role 不影响实际历史消息的 role
      console.log('[expandReferenceItem] chat_history - adding marker');
      items.push({
        id: `ref-history-marker`,
        order: refItem.order,
        content: '', // 特殊标记
        enabled: true,
        role: targetRole, // 标记项的 role（不影响实际历史消息）
        name: '聊天记录标记',
        description: '历史消息将插入此位置',
      });
      break;
  }

  console.log('[expandReferenceItem]', refItem.referenceType, '- returned', items.length, 'items');
  return items;
}

/**
 * 注入 Author's Note
 * Author's Note 是一种特殊的注入，通常用于引导对话方向
 */
function injectAuthorsNote(
  messages: ProcessedPromptMessage[],
  authorsNote: string,
  depth: number,
  position: 'before' | 'after' | 'replace',
  context: PromptBuildContext,
  macroStore: Map<string, string>
): ProcessedPromptMessage[] {
  // 处理 Author's Note 内容
  let processedNote = authorsNote;
  processedNote = replaceVariables(processedNote, context);
  processedNote = replacePlaceholders(processedNote, context);
  processedNote = expandMacros(processedNote, macroStore);

  // 创建 Author's Note 消息
  const noteMessage: ProcessedPromptMessage = {
    role: 'system',
    content: processedNote,
    layer: undefined,
  };

  // 找到注入位置（基于深度）
  // 深度 N = 往前第 N 条用户消息
  const userMessageIndices: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      userMessageIndices.push(i);
    }
  }

  if (userMessageIndices.length === 0) {
    // 没有用户消息，添加到末尾
    return [...messages, noteMessage];
  }

  // 从后往前数第 depth 条用户消息
  const targetIndex = userMessageIndices[userMessageIndices.length - Math.min(depth, userMessageIndices.length)];

  // 根据 position 决定插入位置
  let insertIndex: number;
  if (position === 'before') {
    insertIndex = targetIndex;
  } else if (position === 'after') {
    insertIndex = targetIndex + 1;
  } else {
    // replace - 替换目标消息
    return [
      ...messages.slice(0, targetIndex),
      noteMessage,
      ...messages.slice(targetIndex + 1),
    ];
  }

  // 插入 Author's Note
  return [
    ...messages.slice(0, insertIndex),
    noteMessage,
    ...messages.slice(insertIndex),
  ];
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
 * 支持聊天记录标记（ref-history-marker）来控制历史消息插入位置
 */
function buildBaseMessages(
  promptItems: PromptItem[],
  historyMessages: Message[],
  context: PromptBuildContext,
  macroStore: Map<string, string>
): ProcessedPromptMessage[] {
  const result: ProcessedPromptMessage[] = [];
  console.log('[buildBaseMessages] Processing', promptItems.length, 'prompt items and', historyMessages.length, 'history messages');

  // 处理历史消息（将在遇到标记时插入）
  const processedHistoryMessages: ProcessedPromptMessage[] = [];
  for (let i = 0; i < historyMessages.length; i++) {
    const msg = historyMessages[i];
    let content = msg.content;

    // 对历史消息也进行处理
    content = replaceVariables(content, context);
    content = replacePlaceholders(content, context);
    content = expandMacros(content, macroStore);

    processedHistoryMessages.push({
      role: msg.role as PromptRole,
      content,
      layer: i, // 设置楼层编号
    });
  }

  // 检查是否有聊天记录标记
  const hasHistoryMarker = promptItems.some(
    item => item.id === 'ref-history-marker' && item.enabled && !item.injection?.enabled
  );
  console.log('[buildBaseMessages] Has history marker:', hasHistoryMarker);

  // 遍历提示词项
  for (const item of promptItems) {
    if (!item.enabled || item.injection?.enabled) continue;

    // 遇到聊天记录标记，插入历史消息
    if (item.id === 'ref-history-marker') {
      console.log('[buildBaseMessages] Inserting', processedHistoryMessages.length, 'history messages at marker position');
      result.push(...processedHistoryMessages);
      continue;
    }

    // 跳过空内容的占位符（如 ref-user-placeholder）
    if (item.content.trim() === '' && item.id.startsWith('ref-')) {
      console.log('[buildBaseMessages] Skipping empty reference placeholder:', item.id);
      continue;
    }

    // 添加普通提示词项
    console.log('[buildBaseMessages] Adding prompt item:', item.name || item.id, '- content length:', item.content.length);
    result.push({
      role: item.role,
      content: item.content,
      layer: undefined,
    });
  }

  // 如果没有聊天记录标记，默认将历史消息添加到末尾（向后兼容）
  if (!hasHistoryMarker) {
    console.log('[buildBaseMessages] No history marker found, appending', processedHistoryMessages.length, 'history messages to end');
    result.push(...processedHistoryMessages);
  }

  console.log('[buildBaseMessages] Final result:', result.length, 'messages');
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