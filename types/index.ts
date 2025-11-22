// EmotiChat 类型定义

// 用户相关
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
}

// 消息相关
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

// 会话相关
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  characterId?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// 角色相关
export interface Character {
  id: string;
  name: string;
  avatar?: string;
  description: string;
  systemPrompt: string;
  createdAt: Date;
}

// AI 模型配置
export interface ModelConfig {
  provider: 'openai' | 'gemini' | 'claude';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}