/**
 * 思维链标签辅助工具
 * 用于检测完全没有标签或缺少开头标签的思维链内容
 */

export type ProtocolType = 'openai' | 'gemini' | 'anthropic';

export interface ThinkingTagConfig {
  openTag: string;
  closeTag: string;
  enabled: boolean;
}

export interface LLMAssistConfig {
  enabled: boolean;
  protocol: ProtocolType;
  endpoint: string;
  apiKey: string;
  model: string;
}

/**
 * 检测内容是否完全没有任何思维链标签
 */
export function hasNoThinkingTags(
  content: string,
  thinkingTags: ThinkingTagConfig[]
): boolean {
  const enabledTags = thinkingTags.filter((tag) => tag.enabled);

  for (const tag of enabledTags) {
    const escapedOpen = tag.openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedClose = tag.closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 如果内容中有任何开头或闭合标签，返回 false
    if (
      new RegExp(escapedOpen, 'gi').test(content) ||
      new RegExp(escapedClose, 'gi').test(content)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 检测内容是否包含完整配对的思维链标签
 * 完整配对意味着：开头标签数量 === 闭合标签数量 && 数量 > 0
 * @returns true 表示有正确完整的标签配对（不需要修复）
 */
export function hasCompleteThinkingTags(
  content: string,
  thinkingTags: ThinkingTagConfig[]
): boolean {
  const enabledTags = thinkingTags.filter((tag) => tag.enabled);

  for (const tag of enabledTags) {
    const escapedOpen = tag.openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedClose = tag.closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const openMatches = content.match(new RegExp(escapedOpen, 'gi')) || [];
    const closeMatches = content.match(new RegExp(escapedClose, 'gi')) || [];

    const openCount = openMatches.length;
    const closeCount = closeMatches.length;

    // 如果有标签且数量匹配，说明是完整的
    if (openCount > 0 && openCount === closeCount) {
      return true;
    }
  }

  return false;
}

/**
 * 思维链标签检测结果
 */
export interface ThinkingTagDetectResult {
  prependTag?: string;  // 需要前置的开头标签
  appendTag?: string;   // 需要追加的闭合标签
  isComplete: boolean;  // 标签是否完整（不需要任何修复）
}

/**
 * 检测思维链标签的完整性
 * 返回需要补全的标签信息
 */
export function detectThinkingTagCompleteness(
  content: string,
  thinkingTags: ThinkingTagConfig[]
): ThinkingTagDetectResult {
  const enabledTags = thinkingTags.filter((tag) => tag.enabled);

  for (const tag of enabledTags) {
    const escapedOpen = tag.openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedClose = tag.closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const openMatches = content.match(new RegExp(escapedOpen, 'gi')) || [];
    const closeMatches = content.match(new RegExp(escapedClose, 'gi')) || [];

    const openCount = openMatches.length;
    const closeCount = closeMatches.length;

    // 如果闭合标签多于开头标签，需要前置开头标签
    if (closeCount > openCount) {
      return {
        prependTag: tag.openTag,
        isComplete: false,
      };
    }

    // 如果开头标签多于闭合标签，需要追加闭合标签
    if (openCount > closeCount) {
      return {
        appendTag: tag.closeTag,
        isComplete: false,
      };
    }
  }

  // 标签数量匹配，认为是完整的
  return { isComplete: true };
}

/**
 * 检测是否有闭合标签但缺少开头标签（需要补全开头标签）
 * 返回需要补全的开头标签，如果不需要则返回 undefined
 * @deprecated 使用 detectThinkingTagCompleteness 代替
 */
export function detectMissingOpenTag(
  content: string,
  thinkingTags: ThinkingTagConfig[]
): { openTag: string; closeTag: string } | undefined {
  const result = detectThinkingTagCompleteness(content, thinkingTags);
  if (result.prependTag) {
    const tag = thinkingTags.find((t) => t.enabled && t.openTag === result.prependTag);
    if (tag) {
      return { openTag: tag.openTag, closeTag: tag.closeTag };
    }
  }
  return undefined;
}

/**
 * 调用 LLM API 判断内容是否是思维链
 */
export async function checkIsThinkingContent(
  content: string,
  config: LLMAssistConfig
): Promise<boolean> {
  try {
    const response = await fetch('/api/thinking-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        protocol: config.protocol,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: config.model,
      }),
    });

    if (!response.ok) {
      console.error('[ThinkingTagAssist] API failed:', response.status);
      return false;
    }

    const result = await response.json();
    return result.isThinking === true;
  } catch (error) {
    console.error('[ThinkingTagAssist] Error:', error);
    return false;
  }
}

/**
 * 思维链标签修复结果
 */
export interface ThinkingTagFixResult {
  prependTag?: string;  // 需要前置的开头标签
  appendTag?: string;   // 需要追加的闭合标签
  needsFix: boolean;    // 是否需要修复
}

/**
 * 检测并修复思维链标签
 * 处理三种情况：
 * 1. 有闭合标签但缺少开头标签 - 返回需要前置的开头标签
 * 2. 有开头标签但缺少闭合标签 - 返回需要追加的闭合标签
 * 3. 完全没有标签 - 使用 LLM 辅助判断是否为思维链
 *
 * @returns 修复结果，包含需要前置或追加的标签
 */
export async function detectAndFixThinkingTags(
  content: string,
  thinkingTags: ThinkingTagConfig[],
  llmConfig: LLMAssistConfig
): Promise<ThinkingTagFixResult> {
  // 情况1和2：检测标签完整性
  const completeness = detectThinkingTagCompleteness(content, thinkingTags);

  if (!completeness.isComplete) {
    console.log('[ThinkingTagAssist] Detected incomplete tags:', completeness);
    return {
      prependTag: completeness.prependTag,
      appendTag: completeness.appendTag,
      needsFix: true,
    };
  }

  // 情况3：完全没有标签，使用 LLM 辅助判断
  // 如果 LLM 辅助未启用或配置不完整，跳过
  if (!llmConfig.enabled || !llmConfig.endpoint || !llmConfig.apiKey || !llmConfig.model) {
    return { needsFix: false };
  }

  // 检测内容是否完全没有任何思维链标签
  if (!hasNoThinkingTags(content, thinkingTags)) {
    // 有完整标签的情况，不需要处理
    return { needsFix: false };
  }

  // 调用 LLM 判断内容是否是思维链
  const isThinking = await checkIsThinkingContent(content, llmConfig);

  if (isThinking) {
    // 使用第一个启用的标签，需要同时前置和追加
    const defaultTag = thinkingTags.find((t) => t.enabled);
    if (defaultTag) {
      console.log('[ThinkingTagAssist] LLM determined content is thinking, wrapping with tags');
      return {
        prependTag: defaultTag.openTag,
        appendTag: defaultTag.closeTag,
        needsFix: true,
      };
    }
  }

  return { needsFix: false };
}

/**
 * 检测需要补全标签的思维链内容
 * @deprecated 使用 detectAndFixThinkingTags 代替
 */
export async function detectUntaggedThinking(
  content: string,
  thinkingTags: ThinkingTagConfig[],
  llmConfig: LLMAssistConfig
): Promise<{ openTag: string; closeTag: string } | undefined> {
  const result = await detectAndFixThinkingTags(content, thinkingTags, llmConfig);
  if (result.needsFix && result.prependTag) {
    const tag = thinkingTags.find((t) => t.enabled && t.openTag === result.prependTag);
    if (tag) {
      return { openTag: tag.openTag, closeTag: tag.closeTag };
    }
  }
  return undefined;
}
