/**
 * 提示词编辑器组件导出
 * 
 * 统一提示词编辑器，支持：
 * - 排序功能（上下移动按钮）
 * - 注入功能（深度控制）
 * - 开关功能（决定是否发送给AI）
 * - Role设定功能（system/user/assistant）
 * - 实时预览和 Token 计数
 */

// 主编辑器组件
export { PromptEditor } from './prompt-editor';

// 子组件
export { PromptItemEditor } from './prompt-item-editor';
export { PromptPreview, estimateTokenCount, estimateTotalTokens } from './prompt-preview';
export { 
  VariableInsertMenu, 
  getAllVariables, 
  getVariablesByCategory,
  type VariableDefinition,
} from './variable-insert-menu';