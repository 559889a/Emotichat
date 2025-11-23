# Phase 1.3: 多模型支持实现文档

## 实现日期
2025-11-23

## 概述
Phase 1.3 实现了完整的多模型支持系统，允许用户在 OpenAI、Google Gemini 和 Anthropic Claude 三大 LLM 提供商之间自由切换，并支持添加自定义 API 端点。

## 已实现功能

### 1. 模型配置系统 (`lib/ai/models/`)

#### 文件结构
- `types.ts` - 类型定义（ModelInfo, ModelProvider, CustomProvider, ModelConfig 等）
- `providers.ts` - 官方提供商配置（OpenAI, Gemini, Claude）
- `custom.ts` - 自定义端点管理（添加、更新、删除、测试连接）
- `index.ts` - 统一导出和工具函数

#### 支持的官方模型
**OpenAI:**
- GPT-4o (128K 上下文)
- GPT-4o Mini (128K 上下文)
- GPT-4 Turbo (128K 上下文)
- GPT-4 (8K 上下文)
- GPT-3.5 Turbo (16K 上下文)

**Google Gemini:**
- Gemini 2.0 Flash Experimental (1M 上下文，免费)
- Gemini 1.5 Pro (2M 上下文)
- Gemini 1.5 Flash (1M 上下文)
- Gemini Pro (32K 上下文)

**Anthropic Claude:**
- Claude 3.5 Sonnet (New) (200K 上下文)
- Claude 3.5 Sonnet (200K 上下文)
- Claude 3 Opus (200K 上下文)
- Claude 3 Sonnet (200K 上下文)
- Claude 3 Haiku (200K 上下文)

### 2. UI 组件

#### 模型选择器 (`components/chat/model-selector.tsx`)
- 完整版选择器：显示模型详细信息（上下文窗口、价格、特性）
- 简化版选择器：仅显示模型名称
- 支持搜索过滤
- 分组显示（按提供商）
- 显示自定义端点

#### API Key 管理界面 (`components/settings/api-keys.tsx`)
- 管理三大官方提供商的 API Key
- API Key 可见性切换
- 简单的格式验证
- 连接测试（基础版）
- 本地存储（localStorage）

#### 自定义端点管理 (`components/settings/custom-provider-dialog.tsx`)
- 添加/编辑/删除自定义端点
- 支持三种协议类型：
  - OpenAI 兼容 (LocalAI, Ollama, vLLM 等)
  - Gemini 兼容
  - Claude (X-AI) 兼容
- URL 格式验证
- 连接测试功能
- 自定义模型列表

### 3. 数据存储

#### Conversation 类型更新 (`types/conversation.ts`)
```typescript
export interface ConversationModelConfig {
  providerId: string;
  modelId: string;
}

export interface Conversation {
  // ...existing fields
  modelConfig?: ConversationModelConfig;
}
```

#### 存储层更新 (`lib/storage/conversations.ts`)
- `createConversation`: 支持保存模型配置
- `updateConversation`: 支持更新模型配置

### 4. API 路由更新 (`app/api/chat/route.ts`)

#### 动态模型路由
- 从对话配置中读取模型设置
- 支持官方提供商自动选择
- 支持自定义端点
- API Key 优先级：
  1. 自定义端点配置的 API Key
  2. 环境变量中的 API Key
- 错误处理和降级

### 5. 对话设置集成 (`components/chat/conversation-settings-dialog.tsx`)

#### 高级设置标签页
- 集成模型选择器
- 保存模型配置到对话
- 显示当前选择的模型

### 6. 设置页面 (`app/(main)/settings/page.tsx`)

#### 三个标签页
1. **API 密钥** - 管理官方 API Key
2. **自定义端点** - 管理自定义 API 端点
3. **模型信息** - 查看所有支持的模型及特性

## 使用流程

### 配置 API Key
1. 进入设置页面
2. 选择"API 密钥"标签
3. 输入对应提供商的 API Key
4. 点击"保存"按钮
5. （可选）点击"测试连接"验证

### 添加自定义端点
1. 进入设置页面
2. 选择"自定义端点"标签
3. 点击"添加自定义端点"按钮
4. 填写配置信息：
   - 端点名称
   - 协议类型（OpenAI/Gemini/Claude 兼容）
   - Base URL
   - API Key
   - 可用模型列表
5. （可选）测试连接
6. 点击"添加"保存

### 为对话选择模型
1. 打开对话设置
2. 切换到"高级设置"标签
3. 使用模型选择器选择模型
4. 点击"保存"

## 技术特点

### 安全性
- API Key 存储在 localStorage（客户端）
- 服务端优先使用环境变量
- 支持 HTTPS 端点（生产环境推荐）
- 自定义端点 URL 验证

### 扩展性
- 易于添加新的提供商
- 支持自定义端点协议
- 模型信息结构化存储
- 类型安全的配置系统

### 用户体验
- 搜索过滤模型
- 模型详细信息展示
- 连接测试功能
- 清晰的错误提示

## 依赖项

### 新增依赖
- `cmdk` - Command Menu 组件
- `@radix-ui/react-popover` - Popover 组件

### 现有依赖
- `@ai-sdk/openai` - OpenAI SDK
- `@ai-sdk/google` - Google Gemini SDK
- `@ai-sdk/anthropic` - Anthropic Claude SDK
- `ai` - Vercel AI SDK

## 环境变量

```env
# 官方 API Keys（可选，至少配置一个）
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AI...
ANTHROPIC_API_KEY=sk-ant-...

# 默认模型（可选）
DEFAULT_MODEL=google:gemini-1.5-flash
```

## 后续优化建议

### 短期优化
1. 实现真实的 API 连接测试
2. 添加模型参数配置（temperature, top_p, max_tokens）
3. 显示实时 Token 使用统计
4. 添加模型使用成本计算

### 中期优化
1. 服务端 API Key 加密存储
2. 模型性能监控
3. 自动模型选择（根据任务类型）
4. 模型响应质量评分

### 长期优化
1. 支持更多 LLM 提供商
2. 模型微调集成
3. 多模型协作（Mixture of Agents）
4. 自定义模型部署支持

## 相关文档
- [用户需求文档](./user-requirements-detailed.md)
- [重构计划](./refactoring-plan.md)
- [TODO 清单](./todo.md)

## Git 提交信息
```
feat: 实现多模型支持

- 添加模型配置系统（官方 + 自定义端点）
- 创建模型选择器组件
- 实现 API Key 管理界面
- 实现自定义端点管理
- 集成到对话设置
- 更新 API 路由支持动态模型选择
- 更新设置页面
- 支持 OpenAI、Gemini、Claude 三大提供商
- 支持 OpenAI/Gemini/Claude 兼容的自定义端点

Phase 1.3 完成