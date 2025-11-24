import type { PromptPreset } from '@/types/prompt';

/**
 * 预设模板
 * 用户可以从模板创建自己的预设
 */

/**
 * 默认模板
 */
export const defaultTemplate: Omit<PromptPreset, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '默认预设',
  description: '平衡的通用设置，适合大多数对话场景',

  stream: true,

  parameters: {
    temperature: 0.9,
    topP: 0.9,
    maxTokens: 2048,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
  },

  enabledParameters: ['temperature', 'topP', 'maxTokens'],

  contextLimit: {
    maxTokens: 4096,
    strategy: 'sliding_window',
    warningThreshold: 0.8,
  },

  prompts: [
    {
      id: 'template-system-1',
      order: 0,
      content: '你是一个友好、乐于助人的 AI 助手。请以自然、真诚的方式与用户交流。',
      enabled: true,
      role: 'system',
      name: '系统提示',
      description: '基本的系统提示词',
    },
    {
      id: 'template-character_prompts',
      order: 1,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'character_prompts',
      isBuiltInReference: true,
      name: '角色设定',
      description: '引用当前对话角色的所有提示词配置',
    },
    {
      id: 'template-user_prompts',
      order: 2,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'user_prompts',
      isBuiltInReference: true,
      name: '用户设定',
      description: '引用当前用户角色的提示词配置',
    },
    {
      id: 'template-chat_history',
      order: 3,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'chat_history',
      isBuiltInReference: true,
      name: '聊天记录',
      description: '引用对话历史消息记录',
    },
  ],
};

/**
 * 创意写作模板
 */
export const creativeTemplate: Omit<PromptPreset, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '创意写作',
  description: '高温度设置，适合创意写作、角色扮演等需要更多随机性的场景',

  stream: true,

  parameters: {
    temperature: 1.2,
    topP: 0.95,
    maxTokens: 3072,
    presencePenalty: 0.3,
    frequencyPenalty: 0.3,
  },

  enabledParameters: ['temperature', 'topP', 'maxTokens', 'presencePenalty', 'frequencyPenalty'],

  contextLimit: {
    maxTokens: 6144,
    strategy: 'sliding_window',
    warningThreshold: 0.85,
  },

  prompts: [
    {
      id: 'template-creative-1',
      order: 0,
      content: '你是一位富有创造力的写作助手，擅长用生动、有趣的语言与用户交流。',
      enabled: true,
      role: 'system',
      name: '创意系统提示',
    },
    {
      id: 'template-character_prompts',
      order: 1,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'character_prompts',
      isBuiltInReference: true,
      name: '角色设定',
    },
    {
      id: 'template-user_prompts',
      order: 2,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'user_prompts',
      isBuiltInReference: true,
      name: '用户设定',
    },
    {
      id: 'template-chat_history',
      order: 3,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'chat_history',
      isBuiltInReference: true,
      name: '聊天记录',
    },
  ],
};

/**
 * 精确回答模板
 */
export const preciseTemplate: Omit<PromptPreset, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '精确回答',
  description: '低温度设置，适合技术问答、数学计算等需要精确答案的场景',

  stream: true,

  parameters: {
    temperature: 0.3,
    topP: 0.8,
    maxTokens: 2048,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
  },

  enabledParameters: ['temperature', 'topP', 'maxTokens'],

  contextLimit: {
    maxTokens: 4096,
    strategy: 'sliding_window',
    warningThreshold: 0.8,
  },

  prompts: [
    {
      id: 'template-precise-1',
      order: 0,
      content: '你是一位专业、严谨的助手，注重准确性和逻辑性。请提供清晰、准确的回答。',
      enabled: true,
      role: 'system',
      name: '精确系统提示',
    },
    {
      id: 'template-character_prompts',
      order: 1,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'character_prompts',
      isBuiltInReference: true,
      name: '角色设定',
    },
    {
      id: 'template-user_prompts',
      order: 2,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'user_prompts',
      isBuiltInReference: true,
      name: '用户设定',
    },
    {
      id: 'template-chat_history',
      order: 3,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'chat_history',
      isBuiltInReference: true,
      name: '聊天记录',
    },
  ],
};

/**
 * 角色扮演模板
 */
export const roleplayTemplate: Omit<PromptPreset, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '角色扮演',
  description: '针对角色扮演优化的设置，支持长上下文和细节描述',

  stream: true,

  parameters: {
    temperature: 1.0,
    topP: 0.92,
    maxTokens: 4096,
    presencePenalty: 0.2,
    frequencyPenalty: 0.2,
  },

  enabledParameters: ['temperature', 'topP', 'maxTokens', 'presencePenalty', 'frequencyPenalty'],

  contextLimit: {
    maxTokens: 8192,
    strategy: 'sliding_window',
    warningThreshold: 0.9,
  },

  prompts: [
    {
      id: 'template-character_prompts',
      order: 0,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'character_prompts',
      isBuiltInReference: true,
      name: '角色设定',
    },
    {
      id: 'template-user_prompts',
      order: 1,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'user_prompts',
      isBuiltInReference: true,
      name: '用户设定',
    },
    {
      id: 'template-chat_history',
      order: 2,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'chat_history',
      isBuiltInReference: true,
      name: '聊天记录',
    },
  ],
};

/**
 * 所有预设模板
 */
export const presetTemplates = [
  { id: 'default', ...defaultTemplate },
  { id: 'creative', ...creativeTemplate },
  { id: 'precise', ...preciseTemplate },
  { id: 'roleplay', ...roleplayTemplate },
];

/**
 * 根据模板ID创建新预设
 */
export function createPresetFromTemplate(
  templateId: string,
  customName?: string
): PromptPreset {
  const template = presetTemplates.find(t => t.id === templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  const now = new Date().toISOString();
  const newId = `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 深拷贝模板，生成新的 ID
  const preset: PromptPreset = {
    id: newId,
    name: customName || template.name,
    description: template.description,
    parameters: { ...template.parameters },
    enabledParameters: [...template.enabledParameters],
    contextLimit: { ...template.contextLimit },
    prompts: template.prompts.map(p => ({
      ...p,
      id: p.id.replace('template-', `${newId}-`),
    })),
    createdAt: now,
    updatedAt: now,
  };

  return preset;
}
