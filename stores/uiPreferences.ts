import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 特殊字段渲染规则
export interface SpecialFieldRule {
  id: string;
  name: string;
  enabled: boolean;
  pattern: string; // 正则表达式模式
  className: string; // CSS 类名
  style?: string; // 内联 CSS 样式
  keepDelimiters: boolean; // 是否保留分隔符（引号、括号等）
}

// 思维链标签配置
export interface ThinkingTagConfig {
  id: string;
  openTag: string;
  closeTag: string;
  enabled: boolean;
}

interface UIPreferences {
  // 侧边栏状态
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // 聊天界面偏好
  messageTextSize: 'small' | 'medium' | 'large';
  setMessageTextSize: (size: 'small' | 'medium' | 'large') => void;

  // 窗口大小偏好
  chatWindowWidth: number | null;
  setChatWindowWidth: (width: number | null) => void;

  // 思维链折叠设置
  thinkingCollapsed: boolean; // 默认是否折叠
  setThinkingCollapsed: (collapsed: boolean) => void;
  thinkingAutoComplete: boolean; // 自动补全不完整的思考标签（闭合标签）
  setThinkingAutoComplete: (enabled: boolean) => void;
  thinkingLLMAssist: boolean; // 使用 LLM 辅助判断无标签的思维链内容
  setThinkingLLMAssist: (enabled: boolean) => void;
  thinkingLLMProtocol: 'openai' | 'gemini' | 'anthropic'; // LLM 协议类型
  setThinkingLLMProtocol: (protocol: 'openai' | 'gemini' | 'anthropic') => void;
  thinkingLLMEndpoint: string; // LLM API 端点
  setThinkingLLMEndpoint: (endpoint: string) => void;
  thinkingLLMApiKey: string; // LLM API 密钥
  setThinkingLLMApiKey: (apiKey: string) => void;
  thinkingLLMModel: string; // LLM 模型名称
  setThinkingLLMModel: (model: string) => void;
  thinkingTags: ThinkingTagConfig[]; // 思维链标签配置
  setThinkingTags: (tags: ThinkingTagConfig[]) => void;
  addThinkingTag: (tag: Omit<ThinkingTagConfig, 'id'>) => void;
  removeThinkingTag: (id: string) => void;
  updateThinkingTag: (id: string, updates: Partial<Omit<ThinkingTagConfig, 'id'>>) => void;

  // 特殊字段渲染设置
  specialFieldRules: SpecialFieldRule[];
  setSpecialFieldRules: (rules: SpecialFieldRule[]) => void;
  addSpecialFieldRule: (rule: Omit<SpecialFieldRule, 'id'>) => void;
  removeSpecialFieldRule: (id: string) => void;
  updateSpecialFieldRule: (id: string, updates: Partial<Omit<SpecialFieldRule, 'id'>>) => void;

  // HTML/CSS 渲染设置
  enableHtmlRendering: boolean;
  setEnableHtmlRendering: (enabled: boolean) => void;

  // 重置所有偏好
  resetPreferences: () => void;
}

// 默认思维链标签（内置标签）
const defaultThinkingTags: ThinkingTagConfig[] = [
  { id: 'think', openTag: '<think>', closeTag: '</think>', enabled: true },
  { id: 'thinking', openTag: '<thinking>', closeTag: '</thinking>', enabled: true },
  { id: 'thought', openTag: '<thought>', closeTag: '</thought>', enabled: true },
];

// 默认特殊字段规则
const defaultSpecialFieldRules: SpecialFieldRule[] = [
  {
    id: 'double-quotes',
    name: '双引号内容',
    enabled: false,
    pattern: '"([^"]+)"',
    className: 'special-field-quotes',
    style: 'background-color: rgba(255, 193, 7, 0.15); padding: 0 2px; border-radius: 2px;',
    keepDelimiters: true,
  },
  {
    id: 'parentheses',
    name: '括号内容',
    enabled: false,
    pattern: '\\(([^)]+)\\)',
    className: 'special-field-parentheses',
    style: 'background-color: rgba(33, 150, 243, 0.15); padding: 0 2px; border-radius: 2px;',
    keepDelimiters: true,
  },
  {
    id: 'asterisk-action',
    name: '星号动作',
    enabled: false,
    pattern: '\\*([^*]+)\\*',
    className: 'special-field-action',
    style: 'font-style: italic; color: rgb(156, 163, 175);',
    keepDelimiters: false,
  },
];

const defaultPreferences = {
  sidebarCollapsed: false,
  messageTextSize: 'medium' as const,
  chatWindowWidth: null,
  thinkingCollapsed: true,
  thinkingAutoComplete: true,
  thinkingLLMAssist: false,
  thinkingLLMProtocol: 'openai' as const,
  thinkingLLMEndpoint: '',
  thinkingLLMApiKey: '',
  thinkingLLMModel: '',
  thinkingTags: defaultThinkingTags,
  specialFieldRules: defaultSpecialFieldRules,
  enableHtmlRendering: true,
};

export const useUIPreferences = create<UIPreferences>()(
  persist(
    (set) => ({
      ...defaultPreferences,

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setMessageTextSize: (size) => set({ messageTextSize: size }),

      setChatWindowWidth: (width) => set({ chatWindowWidth: width }),

      // 思维链折叠设置
      setThinkingCollapsed: (collapsed) => set({ thinkingCollapsed: collapsed }),
      setThinkingAutoComplete: (enabled) => set({ thinkingAutoComplete: enabled }),
      setThinkingLLMAssist: (enabled) => set({ thinkingLLMAssist: enabled }),
      setThinkingLLMProtocol: (protocol) => set({ thinkingLLMProtocol: protocol }),
      setThinkingLLMEndpoint: (endpoint) => set({ thinkingLLMEndpoint: endpoint }),
      setThinkingLLMApiKey: (apiKey) => set({ thinkingLLMApiKey: apiKey }),
      setThinkingLLMModel: (model) => set({ thinkingLLMModel: model }),
      setThinkingTags: (tags) => set({ thinkingTags: tags }),
      addThinkingTag: (tag) =>
        set((state) => ({
          thinkingTags: [
            ...state.thinkingTags,
            { ...tag, id: `custom-${Date.now()}` },
          ],
        })),
      removeThinkingTag: (id) =>
        set((state) => ({
          thinkingTags: state.thinkingTags.filter((t) => t.id !== id),
        })),
      updateThinkingTag: (id, updates) =>
        set((state) => ({
          thinkingTags: state.thinkingTags.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      // 特殊字段渲染设置
      setSpecialFieldRules: (rules) => set({ specialFieldRules: rules }),
      addSpecialFieldRule: (rule) =>
        set((state) => ({
          specialFieldRules: [
            ...state.specialFieldRules,
            { ...rule, id: `custom-${Date.now()}` },
          ],
        })),
      removeSpecialFieldRule: (id) =>
        set((state) => ({
          specialFieldRules: state.specialFieldRules.filter((r) => r.id !== id),
        })),
      updateSpecialFieldRule: (id, updates) =>
        set((state) => ({
          specialFieldRules: state.specialFieldRules.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      // HTML/CSS 渲染设置
      setEnableHtmlRendering: (enabled) => set({ enableHtmlRendering: enabled }),

      resetPreferences: () => set(defaultPreferences),
    }),
    {
      name: 'emotichat-ui-preferences', // localStorage key
    }
  )
);