# Phase 1.3 实现文档：多模型支持与 UI 选择器

## 概述

Phase 1.3 实现了完整的多模型支持系统，包括：
- 内置三大官方提供商（OpenAI、Google Gemini、Anthropic Claude）
- 自定义端点支持（OpenAI/Gemini/Anthropic 协议兼容）
- 模型参数配置（temperature、top_p、max_tokens 等）
- 集成到对话设置的 UI 选择器

## 实现状态

✅ **已完成** - 所有核心功能已实现

### 已实现的功能

1. ✅ **类型定义系统**
   - `lib/ai/models/types.ts` - 完整的类型定义
   - `types/conversation.ts` - 对话模型配置类型（含参数支持）

2. ✅ **官方提供商支持**
   - `lib/ai/models/providers.ts` - OpenAI/Gemini/Claude 官方模型列表
   - 支持的模型：
     - OpenAI: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
     - Google: Gemini 2.0 Flash Exp, Gemini 1.5 Pro/Flash, Gemini Pro
     - Anthropic: Claude 3.5 Sonnet (New/Old), Claude 3 Opus/Sonnet/Haiku

3. ✅ **自定义端点管理**
   - `lib/ai/models/custom.ts` - 自定义端点 CRUD 操作
   - `components/settings/custom-provider-dialog.tsx` - 自定义端点配置 UI
   - 支持三种协议：OpenAI、Gemini、Anthropic (X-AI)
   - 连接测试功能
   - URL 验证

4. ✅ **模型选择器组件**
   - `components/chat/model-selector.tsx` - 完整的模型选择器
   - 支持搜索、分组显示
   - 显示模型详细信息（上下文窗口、价格、功能）
   - 官方模型和自定义端点分组

5. ✅ **模型参数配置组件**
   - `components/chat/model-parameters.tsx` - 新创建
   - 支持的参数：
     - Temperature (0-2)
     - Top P (0-1)
     - Max Tokens
     - Presence Penalty (-2 to 2)
     - Frequency Penalty (-2 to 2)
   - 每个参数都有说明提示

6. ✅ **对话设置集成**
   - `components/chat/conversation-settings-dialog.tsx` - 已更新
   - 新增"模型"标签页
   - 集成模型选择器和参数配置
   - 实时参数调整

7. ✅ **存储层支持**
   - `lib/storage/conversations.ts` - 已支持 modelConfig
   - `types/conversation.ts` - ConversationModelConfig 包含参数字段
   - 完整的模型配置持久化

8. ✅ **API 路由更新**
   - `app/api/chat/route.ts` - 已更新
   - 动态模型路由（根据 providerId 选择 SDK）
   - 支持自定义端点
   - 应用模型参数到 streamText 调用
   - 参数传递：temperature, topP, maxSteps, presencePenalty, frequencyPenalty

## 架构设计

### 数据流

```
用户选择模型 
  → ConversationSettingsDialog
  → modelConfig 保存到 conversation.json
  → API 读取 modelConfig
  → 创建对应 provider 的 model 实例
  → 应用模型参数
  → 调用 streamText
```

### 模型配置结构

```typescript
interface ConversationModelConfig {
  providerId: string;     // 'openai' | 'google' | 'anthropic' | 'custom-xxx'
  modelId: string;        // 'gpt-4o' | 'gemini-1.5-pro' | 'claude-3-opus-20240229'
  parameters?: {
    temperature?: number;        // 0-2
    topP?: number;              // 0-1
    maxTokens?: number;         // 最大输出 token
    presencePenalty?: number;   // -2 到 2
    frequencyPenalty?: number;  // -2 到 2
  };
}
```

## 使用说明

### 1. 选择官方模型

1. 打开对话设置（点击对话界面的设置按钮）
2. 切换到"模型"标签页
3. 从下拉列表选择模型（按提供商分组）
4. 调整模型参数（可选）
5. 保存设置

### 2. 添加自定义端点

1. 进入设置页面
2. 找到"自定义端点"部分
3. 点击"添加自定义端点"
4. 填写配置：
   - 端点名称
   - 协议类型（OpenAI/Gemini/Anthropic）
   - Base URL
   - API Key
   - 可用模型列表
5. 测试连接（可选）
6. 保存

### 3. 使用自定义端点

1. 添加自定义端点后，它会出现在模型选择器中
2. 在"自定义"分组下可以找到
3. 选择后即可使用

## API Key 配置

### 环境变量方式（推荐）

在 `.env.local` 中配置：

```bash
OPENAI_API_KEY=sk-xxx
GOOGLE_API_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

### 自定义端点方式

自定义端点的 API Key 存储在浏览器 localStorage 中，通过配置对话框设置。

## 技术细节

### 1. 提供商类型映射

```typescript
// 自定义端点协议 → AI SDK 提供商类型
'openai' → AIProviderType.openai → createOpenAI()
'gemini' → AIProviderType.google → createGoogleGenerativeAI()
'anthropic' → AIProviderType.anthropic → createAnthropic()
```

### 2. 参数传递

AI SDK 的 `streamText` 函数接受以下参数：
- `temperature`: 直接传递
- `topP`: 直接传递
- `maxSteps`: 用于限制输出 token（而非 maxTokens）
- `presencePenalty`: 直接传递
- `frequencyPenalty`: 直接传递

### 3. 模型实例创建

```typescript
// OpenAI
const openai = createOpenAI({
  apiKey: apiKey || process.env.OPENAI_API_KEY,
  baseURL: baseUrl, // 可选，用于自定义端点
});
const model = openai(modelId);

// Google
const google = createGoogleGenerativeAI({
  apiKey: apiKey || process.env.GOOGLE_API_KEY,
  baseURL: baseUrl,
});
const model = google(modelId);

// Anthropic
const anthropic = createAnthropic({
  apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
  baseURL: baseUrl,
});
const model = anthropic(modelId);
```

## 已知限制

1. **环境变量 vs 客户端存储**
   - 官方提供商的 API Key 需要配置在服务端环境变量中
   - 自定义端点的 API Key 存储在客户端 localStorage
   - 未来可能需要更安全的 API Key 管理方案

2. **模型信息准确性**
   - 自定义端点的模型信息（上下文窗口、定价）使用默认值
   - 用户无法获取准确的模型元数据

3. **参数兼容性**
   - 不是所有提供商都支持所有参数
   - 某些参数可能被忽略（取决于提供商）

## 测试建议

### 功能测试

1. **官方模型切换**
   - [ ] 测试 OpenAI 模型
   - [ ] 测试 Google Gemini 模型
   - [ ] 测试 Anthropic Claude 模型
   - [ ] 验证模型响应正确

2. **模型参数**
   - [ ] 调整 temperature，验证输出随机性变化
   - [ ] 调整 top_p，验证采样多样性
   - [ ] 设置 max_tokens，验证输出长度限制
   - [ ] 测试 penalty 参数对重复的影响

3. **自定义端点**
   - [ ] 添加 OpenAI 兼容端点（如 LocalAI）
   - [ ] 测试连接功能
   - [ ] 验证模型调用
   - [ ] 测试编辑和删除

4. **持久化**
   - [ ] 保存模型配置后刷新页面
   - [ ] 验证配置被正确加载
   - [ ] 切换对话，验证不同对话的配置独立

### 集成测试

1. **与提示词系统集成**
   - [ ] 验证模型参数不影响提示词构建
   - [ ] 测试角色提示词 + 模型参数组合

2. **与 Token 计数集成**
   - [ ] 验证 Token 计数根据模型调整
   - [ ] 测试不同模型的 context window

## 未来改进

1. **API Key 管理**
   - 支持在 UI 中配置官方提供商的 API Key
   - 服务端加密存储 API Key
   - 支持多个 API Key 轮换

2. **模型推荐**
   - 根据任务类型推荐合适的模型
   - 成本估算和建议

3. **高级参数**
   - 支持更多提供商特定参数
   - 预设参数配置（创造性、精确、平衡）

4. **性能监控**
   - 记录每个模型的响应时间
   - Token 使用统计
   - 成本追踪

## 相关文件

### 新创建的文件
- `components/chat/model-parameters.tsx` - 模型参数配置组件

### 修改的文件
- `types/conversation.ts` - 添加参数字段到 ConversationModelConfig
- `components/chat/conversation-settings-dialog.tsx` - 集成模型选择器和参数
- `app/api/chat/route.ts` - 支持模型参数

### 已存在的文件（Phase 1.3 之前已实现）
- `lib/ai/models/types.ts`
- `lib/ai/models/providers.ts`
- `lib/ai/models/custom.ts`
- `lib/ai/models/index.ts`
- `components/chat/model-selector.tsx`
- `components/settings/custom-provider-dialog.tsx`

## 总结

Phase 1.3 成功实现了完整的多模型支持系统，为用户提供了：
- 灵活的模型选择（官方 + 自定义）
- 细粒度的参数控制
- 友好的 UI 配置界面
- 完整的持久化支持

系统架构清晰，易于扩展，为后续的 Phase 2（Dev Mode）和 Phase 3（MCP 集成）奠定了良好基础。

---

**完成日期**: 2025-11-23  
**实现者**: Claude Code  
**状态**: ✅ 完成