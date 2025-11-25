/**
 * 思维链标签辅助工具
 * 用于检测完全没有标签的思维链内容
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
 * 检测无标签的思维链内容
 * 如果内容是思维链，返回需要包裹的标签对；否则返回 undefined
 */
export async function detectUntaggedThinking(
  content: string,
  thinkingTags: ThinkingTagConfig[],
  llmConfig: LLMAssistConfig
): Promise<{ openTag: string; closeTag: string } | undefined> {
  // 如果 LLM 辅助未启用或配置不完整，跳过
  if (!llmConfig.enabled || !llmConfig.endpoint || !llmConfig.apiKey || !llmConfig.model) {
    return undefined;
  }

  // 检测内容是否完全没有任何思维链标签
  if (!hasNoThinkingTags(content, thinkingTags)) {
    // 有标签的情况由自动补全处理
    return undefined;
  }

  // 调用 LLM 判断内容是否是思维链
  const isThinking = await checkIsThinkingContent(content, llmConfig);

  if (isThinking) {
    // 使用第一个启用的标签
    const defaultTag = thinkingTags.find((t) => t.enabled);
    if (defaultTag) {
      console.log('[ThinkingTagAssist] LLM determined content is thinking, wrapping with tags');
      return {
        openTag: defaultTag.openTag,
        closeTag: defaultTag.closeTag,
      };
    }
  }

  return undefined;
}
