/**
 * 提示词构建引擎
 * 
 * 导出所有提示词处理模块
 */

// 主构建器
export {
  buildPrompt,
  buildPromptWithContext,
  buildSimplePrompt,
  type BuildPromptOptions,
  type BuildPromptResult,
} from './builder';

// 变量解析器
export {
  replaceVariables,
  getCurrentSystemVariables,
} from './variables';

// 占位符解析器
export {
  replacePlaceholders,
} from './placeholders';

// 宏处理器
export {
  expandMacros,
  createMacroStore,
  macroStoreToRecord,
} from './macros';

// Role 适配器
export {
  adaptRoleForProvider,
  extractGeminiSystemInstructions,
  filterOutSystemInstructions,
  type ProviderType,
} from './role-adapter';

// 注入处理器
export {
  processInjections,
  createInjectionMessage,
} from './injection';

// 后处理器
export {
  postProcess,
  postProcessMessages,
  isEmptyContent,
  filterEmptyMessages,
  format,
  type FormatOptions,
} from './post-processor';