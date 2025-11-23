/**
 * 后处理器
 * 对最终提示词进行格式化和清理
 */

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