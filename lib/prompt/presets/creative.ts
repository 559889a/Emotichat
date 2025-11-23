import type { PromptPreset } from '@/types/prompt';

/**
 * 创意写作预设
 * 高温度设置，适合创意写作、故事生成等需要想象力的场景
 */
export const creativePreset: PromptPreset = {
  id: 'preset-creative',
  name: '创意写作',
  description: '高温度设置，适合创意写作、故事生成等需要想象力的场景',
  
  // 模型参数 - 高温度，鼓励创造性
  parameters: {
    temperature: 1.2,
    topP: 0.95,
    maxTokens: 3072,
    presencePenalty: 0.6,
    frequencyPenalty: 0.6,
  },
  
  // 启用的参数
  enabledParameters: ['temperature', 'topP', 'maxTokens', 'presencePenalty', 'frequencyPenalty'],
  
  // 上下文限制
  contextLimit: {
    maxTokens: 8192,
    strategy: 'sliding_window',
    warningThreshold: 0.85,
  },
  
  // 提示词序列
  prompts: [
    {
      id: 'creative-system-1',
      order: 0,
      content: '你是一位富有创造力的作家和故事讲述者。请发挥想象力，创造引人入胜的内容。',
      enabled: true,
      role: 'system',
      name: '创意系统提示',
      description: '鼓励创造性思维',
    },
    {
      id: 'creative-system-2',
      order: 1,
      content: '在创作时，注重细节描写、情感表达和氛围营造。使用生动的语言和丰富的修辞手法。',
      enabled: true,
      role: 'system',
      name: '写作风格指导',
      description: '强调写作技巧',
    },
  ],
  
  // 全局位置
  globalPosition: 'before_all',
  
  // 元数据
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isBuiltIn: true,
};