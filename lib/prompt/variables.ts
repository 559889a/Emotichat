/**
 * 变量解析器
 * 处理系统变量替换：{{time}}, {{location}}, {{device_info}}
 */

import type { PromptBuildContext } from '@/types/prompt';

/**
 * 替换模板中的系统变量
 * @param template - 包含变量的模板字符串
 * @param context - 提示词构建上下文
 * @returns 替换后的字符串
 */
export function replaceVariables(template: string, context: PromptBuildContext): string {
  let result = template;
  
  // 替换 {{time}} - 当前时间
  if (context.systemVariables.time) {
    result = result.replace(/\{\{time\}\}/g, context.systemVariables.time);
  }
  
  // 替换 {{location}} - 当前位置
  if (context.systemVariables.location) {
    result = result.replace(/\{\{location\}\}/g, context.systemVariables.location);
  }
  
  // 替换 {{device_info}} - 设备信息
  if (context.systemVariables.deviceInfo) {
    result = result.replace(/\{\{device_info\}\}/g, context.systemVariables.deviceInfo);
  }
  
  return result;
}

/**
 * 获取当前系统变量值（用于构建上下文）
 * @returns 系统变量对象
 */
export function getCurrentSystemVariables(): {
  time?: string;
  location?: string;
  deviceInfo?: string;
} {
  // 获取当前时间（格式化为易读形式）
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  
  // 获取设备信息
  const deviceInfo = typeof navigator !== 'undefined'
    ? `${navigator.platform} - ${navigator.userAgent}`
    : 'Unknown Device';
  
  return {
    time,
    deviceInfo,
    // location 需要通过 Geolocation API 获取，暂时不实现
    location: undefined
  };
}
