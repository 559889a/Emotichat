/**
 * 占位符解析器
 * 处理占位符替换：{{user}}, {{chat_history}}, {{last_user_message}}
 */

import type { PromptBuildContext } from '@/types/prompt';

/**
 * 替换模板中的占位符
 * @param template - 包含占位符的模板字符串
 * @param context - 提示词构建上下文
 * @returns 替换后的字符串
 */
export function replacePlaceholders(template: string, context: PromptBuildContext): string {
  let result = template;

  // 替换 {{user}} - 用户名称（使用激活的用户角色名称或默认值）
  const userName = context.userName || 'User';
  result = result.replace(/\{\{user\}\}/gi, userName);

  // 替换 {{char}} / {{character}} - 角色名称（当前对话角色）
  const characterName = context.characterName || 'Assistant';
  result = result.replace(/\{\{char\}\}/gi, characterName);
  result = result.replace(/\{\{character\}\}/gi, characterName);

  // 替换 {{last_user_message}} - 最后一条用户消息
  if (context.lastUserMessage) {
    result = result.replace(/\{\{last_user_message\}\}/gi, context.lastUserMessage);
  }

  // 替换 {{chat_history}} - 对话窗口内所有上下文
  const chatHistory = formatChatHistory(context.messageHistory);
  result = result.replace(/\{\{chat_history\}\}/gi, chatHistory);

  return result;
}

/**
 * 格式化对话历史为可读字符串
 * @param messageHistory - 消息历史数组
 * @returns 格式化后的对话历史字符串
 */
function formatChatHistory(
  messageHistory: Array<{ role: string; content: string }>
): string {
  if (!messageHistory || messageHistory.length === 0) {
    return '';
  }
  
  return messageHistory
    .map(msg => {
      const roleLabel = getRoleLabel(msg.role);
      return `${roleLabel}: ${msg.content}`;
    })
    .join('\n\n');
}

/**
 * 获取角色标签
 * @param role - 消息角色
 * @returns 角色的可读标签
 */
function getRoleLabel(role: string): string {
  switch (role) {
    case 'user':
      return 'User';
    case 'assistant':
      return 'Assistant';
    case 'system':
      return 'System';
    default:
      return role;
  }
}