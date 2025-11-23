import type { ConversationPromptConfig } from './prompt';

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 单条消息
export interface Message {
  id: string;                    // UUID
  role: MessageRole;             // 消息角色
  content: string;               // 消息内容
  createdAt: string;             // ISO 8601 时间戳
  
  // 可选元数据
  model?: string;                // 生成该消息的模型（仅 assistant）
  tokenCount?: number;           // token 数量
}

// 对话
export interface Conversation {
  id: string;                    // UUID
  title: string;                 // 对话标题（可自动生成或用户设置）
  characterId: string;           // 关联的角色 ID
  
  // 消息存储在单独文件中，这里只存引用
  messageCount: number;          // 消息数量
  
  // 提示词配置（新提示词系统）
  promptConfig?: ConversationPromptConfig; // 对话级提示词配置（可选）
  
  // 元数据
  createdAt: string;             // ISO 8601 时间戳
  updatedAt: string;             // ISO 8601 时间戳
  lastMessageAt?: string;        // 最后一条消息时间
}

// 创建对话输入
export interface CreateConversationInput {
  title?: string;                // 可选，默认为"新对话"
  characterId: string;           // 必须关联角色
  promptConfig?: ConversationPromptConfig; // 可选的提示词配置
}

// 更新对话输入
export interface UpdateConversationInput {
  title?: string;                // 可选，更新标题
  promptConfig?: ConversationPromptConfig; // 可选，更新提示词配置
}

// 对话概要（列表展示用）
export interface ConversationSummary {
  id: string;
  title: string;
  characterId: string;
  characterName: string;         // 关联的角色名称
  messageCount: number;
  lastMessageAt?: string;
  updatedAt: string;
}