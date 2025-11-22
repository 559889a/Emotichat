export interface Character {
  id: string;                    // UUID
  name: string;                  // 角色名称
  avatar?: string;               // 头像 URL（可选，默认使用首字母）
  description: string;           // 简短描述
  
  // 角色设定
  systemPrompt: string;          // 系统提示词
  personality: string[];         // 性格特征标签，如 ["温柔", "善解人意", "幽默"]
  background?: string;           // 背景故事（可选）
  exampleDialogues?: string[];   // 示例对话（可选）
  
  // 配置
  defaultModel?: string;         // 默认使用的模型 ID
  temperature?: number;          // 默认温度 (0-2)
  
  // 记忆
  memoryEnabled: boolean;        // 是否启用记忆功能
  
  // 元数据
  createdAt: string;             // ISO 8601 时间戳
  updatedAt: string;             // ISO 8601 时间戳
}

// 创建角色时的输入类型（不包含自动生成的字段）
export type CreateCharacterInput = Omit<Character, 'id' | 'createdAt' | 'updatedAt'>;

// 更新角色时的输入类型（所有字段可选）
export type UpdateCharacterInput = Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>;