import type { CharacterPromptConfig } from './prompt';

export interface Character {
  id: string;                    // UUID
  name: string;                  // 角色名称
  avatar?: string;               // 头像 URL（可选，默认使用首字母）
  description: string;           // 简短描述

  // 角色设定（向后兼容字段）
  systemPrompt?: string;         // 系统提示词（已废弃，使用 promptConfig 代替）
  personality: string[];         // 性格特征标签，如 ["温柔", "善解人意", "幽默"]
  background?: string;           // 背景故事（可选，已废弃）
  exampleDialogues?: string[];   // 示例对话（可选，已废弃）

  // 配置（向后兼容，已废弃）
  defaultModel?: string;         // 默认使用的模型 ID（已废弃，使用全局模型）
  temperature?: number;          // 默认温度（已废弃，使用预设管理）
  memoryEnabled?: boolean;       // 是否启用记忆功能（已废弃，在特殊功能页面管理）

  // 提示词配置（新提示词系统）
  promptConfig?: CharacterPromptConfig; // 角色级提示词配置（可选）

  // 角色类型标识
  isUserProfile?: boolean;       // 是否为用户角色（true=用户角色，false/undefined=AI对话角色）

  // 元数据
  createdAt: string;             // ISO 8601 时间戳
  updatedAt: string;             // ISO 8601 时间戳
}

// 创建角色时的输入类型（不包含自动生成的字段）
export type CreateCharacterInput = Omit<Character, 'id' | 'createdAt' | 'updatedAt'>;

// 更新角色时的输入类型（所有字段可选）
export type UpdateCharacterInput = Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>;