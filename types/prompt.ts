/**
 * EmotiChat 提示词系统类型定义
 * 
 * 核心概念：
 * - 楼层（Layer）：消息位置定位，公式为 `楼层 = 消息序号 - 1`
 * - 深度（Depth）：用户消息位置，深度0为最高优先级注入位置
 * - 注入（Injection）：将提示词后处理到指定位置
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 提示词角色类型
 * 注意：这是统一的内部格式，会在后处理时根据不同 API 自动适配
 * - Gemini: system -> System Instructions, assistant -> model
 * - OpenAI: 保持 system/user/assistant
 * - Anthropic: 保持 system/user/assistant
 */
export type PromptRole = 'system' | 'user' | 'assistant';

/**
 * 深度枚举（注入位置）
 * - DEPTH_0: 最高优先级，LLM 强遵守的位置
 * - DEPTH_1: 用户当前消息位置
 * - DEPTH_N: 往前第 N 条用户消息
 */
export enum PromptDepth {
  DEPTH_0 = 0,    // 最高优先级注入位置
  DEPTH_1 = 1,    // 当前用户消息
  DEPTH_2 = 2,    // 上一条用户消息
  DEPTH_3 = 3,    // 上上条用户消息
  CUSTOM = -1,    // 自定义深度
}

/**
 * 注入位置类型
 */
export type InjectionPosition = 'before' | 'after' | 'replace';

// ============================================================================
// 核心接口
// ============================================================================

/**
 * 楼层接口（消息位置定位）
 * 楼层编号 = 消息序号 - 1
 * 例：第一条消息（开场白）= 第0层楼
 */
export interface PromptLayer {
  layer: number;              // 楼层编号（从0开始）
  messageId?: string;         // 关联的消息ID（可选）
  role: PromptRole;           // 消息角色
}

/**
 * 注入配置接口
 * 用于将提示词后处理到指定位置
 */
export interface PromptInjection {
  enabled: boolean;           // 是否启用注入
  depth: number;              // 注入深度（0为最高优先级）
  position: InjectionPosition; // 注入位置：之前/之后/替换
  targetLayer?: number;       // 目标楼层（可选）
}

/**
 * 变量接口（实时获取的系统变量）
 */
export interface PromptVariable {
  name: string;               // 变量名（如：time, location, device_info）
  type: 'time' | 'location' | 'device_info' | 'custom';
  format?: string;            // 格式化字符串（可选）
  value?: string;             // 当前值（运行时填充）
}

/**
 * 宏接口（宏处理系统）
 * 支持的宏类型：
 * - setvar: {{setvar::变量名::变量值}}
 * - getvar: {{getvar::变量名}}
 * - random: {{random::选项1::选项2::...}}
 */
export interface PromptMacro {
  type: 'setvar' | 'getvar' | 'random';
  name: string;               // 宏名称/变量名
  args?: string[];            // 宏参数（用于 setvar 和 random）
}

/**
 * 后处理配置接口
 */
export interface PostProcessConfig {
  /** 是否启用消息去重 */
  enableDeduplication?: boolean;
  /** 是否启用空消息过滤 */
  enableEmptyFilter?: boolean;
  /** 是否启用消息合并（合并连续同角色消息） */
  enableMerging?: boolean;
  /** 是否启用格式标准化 */
  enableFormatting?: boolean;
  /** 是否启用长度限制检查 */
  enableLengthCheck?: boolean;
  /** 单条消息最大长度（字符数，0表示不限制） */
  maxMessageLength?: number;
  /** 总消息最大token数（0表示不限制，需要tokenizer） */
  maxTotalTokens?: number;
  /** 超长消息处理策略 */
  lengthExceededStrategy?: 'warn' | 'truncate' | 'error';
}

/**
 * 提示词项（基础单元）
 * 用于统一提示词编辑器
 */
export interface PromptItem {
  id: string;                 // 唯一标识符
  order: number;              // 排序序号（决定提示词顺序）
  content: string;            // 提示词内容（支持变量、占位符、宏）
  enabled: boolean;           // 是否启用（开关功能）
  role: PromptRole;           // 角色类型
  
  // 注入配置（可选）
  injection?: PromptInjection;
  
  // 元数据
  name?: string;              // 提示词名称（用于UI显示）
  description?: string;       // 描述信息
}

// ============================================================================
// 预设系统
// ============================================================================

/**
 * 模型参数接口
 */
export interface ModelParameters {
  temperature?: number;       // 温度 (0-2)
  topP?: number;              // top_p (0-1)
  topK?: number;              // top_k (Gemini)
  maxTokens?: number;         // 最大生成 tokens
  presencePenalty?: number;   // 存在惩罚 (OpenAI)
  frequencyPenalty?: number;  // 频率惩罚 (OpenAI)
  stopSequences?: string[];   // 停止序列
}

/**
 * 上下文限制配置
 */
export interface ContextLimitConfig {
  maxTokens: number;          // 最大上下文 tokens
  strategy: 'sliding_window' | 'summary' | 'truncate'; // 处理策略
  warningThreshold?: number;  // 警告阈值（百分比，如 0.8 = 80%）
}

/**
 * 全局预设接口
 * 用于全局提示词和参数配置
 */
export interface PromptPreset {
  id: string;                 // 预设唯一标识符
  name: string;               // 预设名称
  description?: string;       // 预设描述
  
  // 模型参数
  parameters: ModelParameters;
  enabledParameters: string[]; // 已启用的参数列表（打勾选择）
  
  // 上下文限制（本地计数器）
  contextLimit: ContextLimitConfig;
  
  // 提示词序列
  prompts: PromptItem[];
  
  // 全局位置
  globalPosition: 'before_all' | 'after_character' | 'before_user' | 'custom';
  customOrder?: number;       // 自定义排序（当 globalPosition = 'custom' 时）
  
  // Scenario（情景设定）
  scenario?: string;          // 对话场景设定
  
  // Author's Note（作者注释）
  authorsNote?: string;       // 作者注释，用于引导对话
  authorsNoteDepth?: number;  // Author's Note 注入深度（默认为3）
  authorsNotePosition?: InjectionPosition; // 注入位置（默认为'after'）
  
  // 元数据
  createdAt: string;          // ISO 8601 时间戳
  updatedAt: string;          // ISO 8601 时间戳
  isBuiltIn?: boolean;        // 是否为内置预设（不可删除）
}

// ============================================================================
// 角色级配置
// ============================================================================

/**
 * 角色级提示词配置
 * 关联到特定角色的提示词设置
 */
export interface CharacterPromptConfig {
  // 开场白（第0层楼）
  openingMessage: string;     // AI的第一条消息
  
  // 提示词序列
  prompts: PromptItem[];
  
  // 继承设置
  inheritFromPreset?: string; // 继承的预设ID（可选）
  overridePreset?: boolean;   // 是否覆盖预设（默认false，合并）
  
  // 示例对话（Few-shot Learning）
  exampleDialogues?: ExampleDialogue[];
}

/**
 * 示例对话接口（Few-shot）
 */
export interface ExampleDialogue {
  id: string;                 // 唯一标识符
  order: number;              // 排序
  user: string;               // 用户消息
  assistant: string;          // AI回复
  enabled: boolean;           // 是否启用
}

// ============================================================================
// 对话级配置
// ============================================================================

/**
 * 对话级提示词配置
 * 特定对话窗口的提示词设置
 */
export interface ConversationPromptConfig {
  // 主提示词
  mainPrompt?: string;        // 对话主提示词（可选）
  
  // 提示词序列（对话特定）
  prompts: PromptItem[];
  
  // 覆盖设置
  overrideCharacter?: boolean; // 是否覆盖角色提示词（默认false，合并）
  overridePreset?: boolean;    // 是否覆盖预设（默认false，合并）
  
  // 临时变量存储（用于 setvar/getvar 宏）
  variables?: Record<string, string>;
}

// ============================================================================
// 占位符系统
// ============================================================================

/**
 * 占位符类型
 * - user: 用户名称
 * - chat_history: 对话窗口内所有上下文
 * - last_user_message: 最后一条用户消息
 */
export type PlaceholderType = 'user' | 'chat_history' | 'last_user_message';

/**
 * 占位符接口
 */
export interface Placeholder {
  type: PlaceholderType;
  value?: string;             // 运行时填充的值
}

// ============================================================================
// 提示词构建相关
// ============================================================================

/**
 * 提示词构建上下文
 * 用于提示词后处理器
 */
export interface PromptBuildContext {
  // 角色信息
  characterId: string;
  characterName: string;
  
  // 对话信息
  conversationId: string;
  
  // 当前用户名
  userName?: string;
  
  // 消息历史
  messageHistory: Array<{
    role: PromptRole;
    content: string;
  }>;
  
  // 最后一条用户消息
  lastUserMessage?: string;
  
  // 系统变量
  systemVariables: {
    time?: string;            // 当前时间
    location?: string;        // 当前位置
    deviceInfo?: string;      // 设备信息
  };
  
  // 临时变量（宏系统）
  temporaryVariables?: Record<string, string>;
}

/**
 * 构建后的提示词消息
 * 发送给 LLM 的最终格式
 */
export interface ProcessedPromptMessage {
  role: PromptRole;           // 原始角色
  content: string;            // 处理后的内容
  layer?: number;             // 楼层编号（可选）
  
  // API 特定字段（运行时填充）
  adaptedRole?: string;       // 适配后的角色（如 Gemini 的 'model'）
}

// ============================================================================
// 提示词合并相关
// ============================================================================

/**
 * 提示词继承源类型
 */
export type PromptInheritanceSource = 'character' | 'conversation' | 'preset';

/**
 * 合并后的提示词项（包含来源信息）
 */
export interface MergedPromptItem extends PromptItem {
  source: PromptInheritanceSource;  // 来源
  isInherited: boolean;              // 是否继承
  isOverridden: boolean;             // 是否被覆盖
  originalId?: string;               // 原始ID（覆盖时）
}

/**
 * 提示词合并选项
 */
export interface PromptMergeOptions {
  /** 是否完全覆盖角色提示词（默认false，合并） */
  overrideCharacter?: boolean;
  /** 是否完全覆盖预设（默认false，合并） */
  overridePreset?: boolean;
  /** 是否包含禁用的提示词（默认false） */
  includeDisabled?: boolean;
}

/**
 * 默认的对话提示词配置
 */
export function getDefaultConversationPromptConfig(): ConversationPromptConfig {
  return {
    prompts: [],
    overrideCharacter: false,
    overridePreset: false,
    variables: {},
  };
}

// ============================================================================
// 导出类型工具
// ============================================================================

/**
 * 创建提示词项的输入类型
 */
export type CreatePromptItemInput = Omit<PromptItem, 'id'>;

/**
 * 更新提示词项的输入类型
 */
export type UpdatePromptItemInput = Partial<Omit<PromptItem, 'id'>>;