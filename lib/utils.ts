import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 检测字符串是否可能是敏感信息（API Key等）
 */
function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    'key',
    'token',
    'secret',
    'password',
    'authorization',
    'auth',
    'api-key',
    'apikey',
    'bearer',
  ];
  const lowerKey = key.toLowerCase();
  return sensitivePatterns.some(pattern => lowerKey.includes(pattern));
}

/**
 * 遮罩敏感字符串，只显示前4位和后4位
 */
function maskString(value: string): string {
  if (value.length <= 8) {
    return '****';
  }
  const prefix = value.slice(0, 4);
  const suffix = value.slice(-4);
  const maskedLength = Math.min(value.length - 8, 32);
  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
}

/**
 * 递归遮罩对象中的敏感信息
 */
export function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  if (typeof data === 'object') {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveKey(key) && typeof value === 'string' && value.length > 0) {
        masked[key] = maskString(value);
      } else if (typeof value === 'object') {
        masked[key] = maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return data;
}
