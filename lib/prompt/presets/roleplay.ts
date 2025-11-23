import type { PromptPreset } from '@/types/prompt';

/**
 * 角色扮演预设
 * 针对角色扮演场景优化，强调角色一致性和沉浸感
 */
export const roleplayPreset: PromptPreset = {
  id: 'preset-roleplay',
  name: '角色扮演',
  description: '针对角色扮演场景优化，强调角色一致性和沉浸感',
  
  // 模型参数 - 平衡创造性和一致性
  parameters: {
    temperature: 0.85,
    topP: 0.9,
    maxTokens: 2560,
    presencePenalty: 0.4,
    frequencyPenalty: 0.4,
  },
  
  // 启用的参数
  enabledParameters: ['temperature', 'topP', 'maxTokens', 'presencePenalty', 'frequencyPenalty'],
  
  // 上下文限制 - 角色扮演通常需要更长的上下文
  contextLimit: {
    maxTokens: 6144,
    strategy: 'sliding_window',
    warningThreshold: 0.8,
  },
  
  // 提示词序列
  prompts: [
    {
      id: 'roleplay-system-1',
      order: 0,
      content: '你正在进行角色扮演。请始终保持角色设定，用角色的视角、性格和语气进行回复。',
      enabled: true,
      role: 'system',
      name: '角色扮演基础',
      description: '强调角色一致性',
    },
    {
      id: 'roleplay-system-2',
      order: 1,
      content: '在回复时，注重角色的情感表达、行为描写和环境互动。使用适合角色的语言风格和表达方式。',
      enabled: true,
      role: 'system',
      name: '角色表现指导',
      description: '细化角色表现要求',
    },
    {
      id: 'roleplay-system-3',
      order: 2,
      content: '避免打破第四面墙，不要提及你是 AI 或语言模型。完全沉浸在角色中。',
      enabled: true,
      role: 'system',
      name: '沉浸感要求',
      description: '保持角色扮演的沉浸感',
    },
  ],
  
  // 全局位置 - 在角色提示词之后
  globalPosition: 'after_character',
  
  // Scenario（情景设定）示例
  scenario: '这是一个开放的对话场景，具体情境由角色设定决定。',
  
  // Author's Note 示例
  authorsNote: '[场景氛围：轻松愉快]',
  authorsNoteDepth: 3,
  authorsNotePosition: 'after',
  
  // 元数据
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isBuiltIn: true,
};