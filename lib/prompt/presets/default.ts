import type { PromptPreset } from '@/types/prompt';

/**
 * 默认预设
 * 平衡的通用设置，适合大多数对话场景
 */
export const defaultPreset: PromptPreset = {
  id: 'preset-default',
  name: '默认预设',
  description: '平衡的通用设置，适合大多数对话场景',
  
  // 模型参数
  parameters: {
    temperature: 0.9,
    topP: 0.9,
    maxTokens: 2048,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
  },
  
  // 启用的参数
  enabledParameters: ['temperature', 'topP', 'maxTokens'],
  
  // 上下文限制
  contextLimit: {
    maxTokens: 4096,
    strategy: 'sliding_window',
    warningThreshold: 0.8,
  },
  
  // 提示词序列（包含引用项）
  prompts: [
    // 自定义系统提示词
    {
      id: 'default-system-1',
      order: 0,
      content: '你是一个友好、乐于助人的 AI 助手。请以自然、真诚的方式与用户交流。',
      enabled: true,
      role: 'system',
      name: '系统提示',
      description: '基本的系统提示词',
    },
    // 引用：角色设定
    {
      id: 'builtin-character_prompts',
      order: 1,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'character_prompts',
      isBuiltInReference: true,
      name: '角色设定',
      description: '引用当前对话角色的所有提示词配置',
    },
    // 引用：用户设定
    {
      id: 'builtin-user_prompts',
      order: 2,
      content: '',
      enabled: true,
      role: 'system',
      referenceType: 'user_prompts',
      isBuiltInReference: true,
      name: '用户设定',
      description: '引用当前用户角色的提示词配置',
    },
    // 引用：聊天记录
    {
      id: 'builtin-chat_history',
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
  
  // 全局位置
  globalPosition: 'before_all',
  
  // 元数据
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isBuiltIn: true,
};