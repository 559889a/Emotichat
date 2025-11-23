# Role 适配器实现文档

## 概述

Role 适配器（`emotichat/lib/prompt/role-adapter.ts`）负责将统一的内部消息格式适配到不同 LLM 提供商的要求。这是提示词系统的关键组件，确保跨模型的兼容性。

## 核心功能

### 支持的提供商

1. **Gemini（Google）**
2. **OpenAI（GPT 系列）**
3. **Anthropic（Claude）**

## Gemini 特殊处理

### ⚠️ 关键设计决策

**Gemini API 不支持标准的 `system` role**，必须使用 **System Instructions** 参数。

### 实现方式

```typescript
// ❌ 错误：直接透传 system 消息给 Gemini
messages: [
  { role: 'system', content: '...' },  // Gemini 不认识
  { role: 'user', content: '...' }
]

// ✅ 正确：合并所有 system 消息为 System Instructions
systemInstruction: "合并所有 system 消息的内容",
messages: [
  { role: 'user', content: '...' },
  { role: 'model', content: '...' }
]
```

### 适配流程

1. **收集 system 消息**：遍历所有消息，提取 `role === 'system'` 的内容
2. **合并为单个 System Instructions**：用 `\n\n` 连接所有 system 消息
3. **标记为特殊角色**：添加 `adaptedRole: 'system_instruction'`
4. **转换其他角色**：
   - `assistant` → `adaptedRole: 'model'`
   - `user` → `adaptedRole: 'user'`（保持不变）

### 代码示例

```typescript
import { adaptRoleForProvider } from '@/lib/prompt/role-adapter';

// 输入：统一格式
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'system', content: 'Respond in Chinese.' },
  { role: 'user', content: 'Hello!' },
  { role: 'assistant', content: 'Hi there!' }
];

// 适配到 Gemini
const adapted = adaptRoleForProvider(messages, 'gemini');

// 结果：
// [
//   { 
//     role: 'system',
//     content: 'You are a helpful assistant.\n\nRespond in Chinese.',
//     adaptedRole: 'system_instruction'
//   },
//   { role: 'user', content: 'Hello!', adaptedRole: 'user' },
//   { role: 'assistant', content: 'Hi there!', adaptedRole: 'model' }
// ]
```

## OpenAI & Claude 处理

### 标准 Role 支持

OpenAI 和 Claude 都支持标准的 `system`/`user`/`assistant` 角色，因此无需特殊处理。

```typescript
// OpenAI/Claude: 保持原样
const adapted = adaptRoleForProvider(messages, 'openai');
// 或
const adapted = adaptRoleForProvider(messages, 'anthropic');

// 结果：每个消息添加 adaptedRole 字段（与原始 role 相同）
// [
//   { role: 'system', content: '...', adaptedRole: 'system' },
//   { role: 'user', content: '...', adaptedRole: 'user' },
//   { role: 'assistant', content: '...', adaptedRole: 'assistant' }
// ]
```

## 辅助工具函数

### 1. 提取 Gemini System Instructions

```typescript
import { extractGeminiSystemInstructions } from '@/lib/prompt/role-adapter';

const systemInstruction = extractGeminiSystemInstructions(adaptedMessages);
// 返回: "You are a helpful assistant.\n\nRespond in Chinese."
```

### 2. 过滤 System Instructions

```typescript
import { filterOutSystemInstructions } from '@/lib/prompt/role-adapter';

const filtered = filterOutSystemInstructions(adaptedMessages);
// 返回: 只包含 user/model 消息的数组
```

## 在提示词构建器中的集成

`emotichat/lib/prompt/builder.ts` 在第 111-112 行自动调用 role 适配：

```typescript
// 9. Role 适配
const providerType = normalizeProvider(provider);
processedMessages = adaptRoleForProvider(processedMessages, providerType);
```

### Provider 自动识别

```typescript
// normalizeProvider() 函数会自动识别：
normalizeProvider('gemini-1.5-flash') → 'gemini'
normalizeProvider('gpt-4o-mini') → 'openai'
normalizeProvider('claude-3-haiku') → 'anthropic'
```

## API 调用示例（伪代码）

### Gemini API

```typescript
const adaptedMessages = adaptRoleForProvider(messages, 'gemini');
const systemInstruction = extractGeminiSystemInstructions(adaptedMessages);
const chatMessages = filterOutSystemInstructions(adaptedMessages);

// 调用 Gemini API
const response = await gemini.generateContent({
  systemInstruction: systemInstruction,  // 单独传递
  contents: chatMessages.map(msg => ({
    role: msg.adaptedRole,  // 'user' 或 'model'
    parts: [{ text: msg.content }]
  }))
});
```

### OpenAI API

```typescript
const adaptedMessages = adaptRoleForProvider(messages, 'openai');

// 调用 OpenAI API
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: adaptedMessages.map(msg => ({
    role: msg.adaptedRole,  // 'system', 'user', 或 'assistant'
    content: msg.content
  }))
});
```

## 类型定义

```typescript
export type ProviderType = 'openai' | 'gemini' | 'anthropic';

interface ProcessedPromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  adaptedRole?: string;  // 适配后的角色名
  layer?: number;        // 楼层编号（可选）
}
```

## 测试场景

### 场景 1：多个 system 消息

```typescript
const messages = [
  { role: 'system', content: 'System prompt 1' },
  { role: 'system', content: 'System prompt 2' },
  { role: 'user', content: 'Hello' }
];

// Gemini: 合并为一个 System Instructions
// OpenAI/Claude: 保持多个 system 消息
```

### 场景 2：无 system 消息

```typescript
const messages = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi!' }
];

// Gemini: 无 System Instructions
// OpenAI/Claude: 正常处理
```

### 场景 3：混合消息顺序

```typescript
const messages = [
  { role: 'system', content: 'Prompt 1' },
  { role: 'user', content: 'Q1' },
  { role: 'system', content: 'Prompt 2' },  // 中间的 system
  { role: 'assistant', content: 'A1' }
];

// Gemini: 提取所有 system 消息（包括中间的）
// OpenAI/Claude: 保持原顺序
```

## 最佳实践

1. **始终使用统一的内部格式**：在应用内部使用 `system`/`user`/`assistant`
2. **在调用 API 前适配**：让 role-adapter 自动处理不同提供商的差异
3. **信任适配结果**：不要手动修改 `adaptedRole` 字段
4. **Gemini 专用函数**：使用 `extractGeminiSystemInstructions()` 和 `filterOutSystemInstructions()`

## 常见问题

### Q: 为什么 Gemini 需要特殊处理？

A: Gemini API 设计时使用了 `systemInstruction` 参数，而不是在消息数组中使用 `system` role。这是 Google 的设计决策，我们必须适配。

### Q: 多个 system 消息会丢失吗？

A: 不会。所有 system 消息都会合并（用 `\n\n` 连接），确保不丢失任何内容。

### Q: OpenAI/Claude 为什么不需要处理？

A: 它们支持标准的 role 格式，只需添加 `adaptedRole` 字段即可，内容保持不变。

### Q: 如何添加新的提供商？

在 `role-adapter.ts` 中：
1. 添加新的 `ProviderType`
2. 创建 `adaptForXXX()` 函数
3. 在 `adaptRoleForProvider()` 的 switch 中添加 case

## 版本历史

- **Phase 0.2**: 初始实现（与提示词构建器同步开发）
- **Phase 0.7**: 验证和文档完善

---

**维护者注意**：如果修改 role 适配逻辑，务必同时更新本文档。