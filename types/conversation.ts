import type { ConversationPromptConfig } from './prompt';

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息版本（用于编辑历史和重新生成）
export interface MessageVersion {
  id: string;                    // 版本 UUID
  content: string;               // 版本内容
  timestamp: string;             // ISO 8601 时间戳
  isActive: boolean;             // 是否为当前显示的版本
  model?: string;                // 生成该版本的模型（仅 assistant）
  tokenCount?: number;           // 版本的 token 数量
}

// 单条消息
export interface Message {
  id: string;                    // UUID
  role: MessageRole;             // 消息角色
  content: string;               // 消息内容（当前活动版本的内容）
  createdAt: string;             // ISO 8601 时间戳
  
  // 可选元数据
  model?: string;                // 生成该消息的模型（仅 assistant）
  tokenCount?: number;           // token 数量
  
  // Phase 1.4: 消息编辑与版本管理
  versions?: MessageVersion[];   // 消息的不同版本（包含编辑历史和重新生成的结果）
  parentId?: string;             // 父消息ID（用于分支对话）
  branchId?: string;             // 分支ID（标识属于哪个分支）
  editedAt?: string;             // 最后编辑时间（ISO 8601）
  isEdited?: boolean;            // 是否被编辑过
  regenerationCount?: number;    // 重新生成次数（用于统计）
}

// 模型配置（简化版，用于对话存储）
export interface ConversationModelConfig {
  providerId: string;            // 提供商 ID（如 'openai', 'google'）
  modelId: string;               // 模型 ID（如 'gpt-4o', 'gemini-1.5-flash'）
  
  // 模型参数（Phase 1.3）
  parameters?: {
    temperature?: number;        // 温度参数 (0-2)
    topP?: number;              // Top P 参数 (0-1)
    maxTokens?: number;         // 最大输出 token 数
    presencePenalty?: number;   // 存在惩罚 (-2 到 2)
    frequencyPenalty?: number;  // 频率惩罚 (-2 到 2)
  };
}

// 对话分支（Phase 1.4）
export interface ConversationBranch {
  id: string;                    // 分支 UUID
  name: string;                  // 分支名称（用户可自定义）
  parentMessageId: string;       // 分支起点的消息ID
  createdAt: string;             // ISO 8601 时间戳
  isActive: boolean;             // 是否为当前活动分支
  description?: string;          // 分支描述（可选）
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
  
  // 模型配置（Phase 1.3 新增）
  modelConfig?: ConversationModelConfig; // 对话使用的模型配置（可选）
  
  // Phase 1.4: 分支管理
  branches?: ConversationBranch[]; // 对话的分支列表（可选）
  currentBranchId?: string;      // 当前活动分支ID（可选，默认主分支）
  
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
  modelConfig?: ConversationModelConfig; // 可选的模型配置
}

// 更新对话输入
export interface UpdateConversationInput {
  title?: string;                // 可选，更新标题
  promptConfig?: ConversationPromptConfig; // 可选，更新提示词配置
  modelConfig?: ConversationModelConfig; // 可选，更新模型配置
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