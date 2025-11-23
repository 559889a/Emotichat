import type { PromptPreset } from '@/types/prompt';
import { defaultPreset } from './default';
import { creativePreset } from './creative';
import { precisePreset } from './precise';
import { roleplayPreset } from './roleplay';

/**
 * 所有内置预设
 */
export const builtInPresets: PromptPreset[] = [
  defaultPreset,
  creativePreset,
  precisePreset,
  roleplayPreset,
];

/**
 * 根据 ID 获取内置预设
 */
export function getBuiltInPreset(id: string): PromptPreset | undefined {
  return builtInPresets.find((preset) => preset.id === id);
}

/**
 * 获取所有内置预设 ID
 */
export function getBuiltInPresetIds(): string[] {
  return builtInPresets.map((preset) => preset.id);
}

// 导出各个预设
export { defaultPreset } from './default';
export { creativePreset } from './creative';
export { precisePreset } from './precise';
export { roleplayPreset } from './roleplay';