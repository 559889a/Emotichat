import type { PromptPreset } from '@/types/prompt';

/**
 * 精确回答预设
 * 低温度设置，适合需要准确、一致性回答的场景
 */
export const precisePreset: PromptPreset = {
  id: 'preset-precise',
  name: '精确回答',
  description: '低温度设置，适合需要准确、一致性回答的场景，如技术支持、事实查询等',
  
  // 模型参数 - 低温度，强调准确性
  parameters: {
    temperature: 0.3,
    topP: 0.7,
    maxTokens: 2048,
    presencePenalty: 0.0,
    frequencyPenalty: 0.3,
  },
  
  // 启用的参数
  enabledParameters: ['temperature', 'topP', 'maxTokens', 'frequencyPenalty'],
  
  // 上下文限制
  contextLimit: {
    maxTokens: 4096,
    strategy: 'sliding_window',
    warningThreshold: 0.75,
  },
  
  // 提示词序列
  prompts: [
    {
      id: 'precise-system-1',
      order: 0,
      content: '你是一个专业、准确的 AI 助手。请提供精确、事实性的回答，避免猜测或臆断。',
      enabled: true,
      role: 'system',
      name: '精确系统提示',
      description: '强调准确性和专业性',
    },
    {
      id: 'precise-system-2',
      order: 1,
      content: '如果你不确定某个信息，请明确说明。优先提供可验证的事实和逻辑推理。',
      enabled: true,
      role: 'system',
      name: '准确性要求',
      description: '强调不确定性的处理',
    },
  ],
  
  // 全局位置
  globalPosition: 'before_all',
  
  // 元数据
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isBuiltIn: true,
};