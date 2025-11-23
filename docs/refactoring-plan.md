# EmotiChat 架构重构计划

> **创建日期**: 2025-11-23  
> **状态**: 进行中  
> **负责人**: 架构师 AI

---

## 📋 目录

1. [项目背景与目标](#1-项目背景与目标)
2. [当前架构问题](#2-当前架构问题)
3. [开发策略](#3-开发策略)
4. [UI 架构设计](#4-ui-架构设计)
5. [对话机制设计](#5-对话机制设计)
6. [人设/角色管理设计](#6-人设角色管理设计)
7. [存储层架构](#7-存储层架构)
8. [提示词系统设计](#8-提示词系统设计)
9. [实施路线图](#9-实施路线图)
10. [用户需求与反馈](#10-用户需求与反馈)

---

## 1. 项目背景与目标

### 1.1 项目定位

- **类型**: 个人开源项目
- **用途**: 自用为主的 roleplaying chat 应用
- **核心价值**: 高质量的角色对话体验

### 1.2 重构目标

1. **代码简洁性**: 减少冗余代码，提高可读性
2. **易于修改**: 建立良好架构基础，便于后续调整
3. **功能完整**: 实现核心的提示词系统
4. **长期可维护**: 个人项目需要自己长期维护

### 1.3 核心原则

```
提示词系统 > 功能完整性 > 架构优化 > 性能优化
   ↑
 产品的灵魂
```

---

## 2. 当前架构问题

### 2.1 严重问题（必须修复）

| 问题 | 位置 | 影响 | 修复方案 |
|------|------|------|---------|
| AI SDK 集成混乱 | `hooks/useMessages.ts` | 代码复杂、难维护 | 重写，使用原生 `useChat` |
| 手动流式处理 | `hooks/useMessages.ts:147` | 150+ 行冗余代码 | 使用 AI SDK 内置处理 |
| 消息格式转换冗余 | `hooks/useMessages.ts:42` | 每次渲染都转换 | 统一消息格式 |

### 2.2 可优化问题

| 问题 | 位置 | 影响 | 修复方案 |
|------|------|------|---------|
| 文件系统无并发控制 | `lib/storage/` | 数据覆盖风险 | 添加文件锁 |
| 缺少错误边界 | `app/layout.tsx` | 崩溃白屏 | 添加 ErrorBoundary |
| API 无输入验证 | `app/api/` | 安全风险 | 添加 Zod 验证 |

### 2.3 代码复杂度分析

**当前 `useMessages.ts` 问题**:
- 总行数: 258 行
- 引入了 `useChat` 但未使用其核心功能
- 手动实现流式处理（~100 行）
- 冗余的消息格式转换

**预期重构后**:
- 目标行数: ~60 行
- 减少代码量: 76%+

---

## 3. 开发策略

### 3.1 推荐策略: 核心优先，渐进优化

**策略 B**: 只修关键 Bug，优先实现提示词系统

**理由**:
1. ✅ 提示词是 roleplaying chat 的灵魂
2. ✅ 现有 Bug 都是非阻塞性的
3. ✅ 边开发边优化效率最高
4. ✅ 无时间压力，可以慢慢打磨

### 3.2 优先级决策矩阵

| Bug/功能 | 紧急度 | 重要度 | 影响范围 | 处理策略 |
|---------|--------|--------|---------|---------|
| **提示词系统（缺失）** | 🔴 高 | 🔴 高 | 核心功能 | ✅ **立即开发** |
| AI SDK 架构问题 | 🟡 中 | 🟡 中 | 代码质量 | 🔄 **边开发边重构** |
| 文件系统并发 | 🟡 中 | 🟢 低 | 极端情况 | ⏸️ **暂时延后** |
| 缺少错误边界 | 🟢 低 | 🟡 中 | 用户体验 | ⏸️ **Phase 11 添加** |

---

## 4. UI 架构设计

### 4.1 组件层级结构

```
app/
├── (main)/                       # 主布局（带侧边栏）
│   ├── layout.tsx               # 主布局组件
│   ├── chat/
│   │   └── page.tsx             # 聊天页面
│   ├── characters/
│   │   ├── page.tsx             # 角色列表
│   │   └── [id]/
│   │       └── page.tsx         # 角色详情/编辑
│   └── settings/
│       └── page.tsx             # 设置页面
│
components/
├── chat/                        # 聊天相关组件
│   ├── chat-container.tsx       # 聊天容器（布局）
│   ├── message-list.tsx         # 消息列表
│   ├── message-bubble.tsx       # 消息气泡
│   ├── chat-input.tsx           # 输入框
│   ├── conversation-list.tsx    # 对话列表
│   └── model-selector.tsx       # 模型选择器
│
├── character/                   # 角色相关组件
│   ├── character-card.tsx       # 角色卡片
│   ├── character-form.tsx       # 角色表单
│   └── character-avatar.tsx     # 角色头像
│
├── layout/                      # 布局组件
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── theme-toggle.tsx
│
└── ui/                          # shadcn/ui 基础组件
    └── ...
```

### 4.2 聊天界面布局

```tsx
// components/chat/chat-container.tsx
export function ChatContainer() {
  return (
    <div className="flex h-full">
      {/* 左侧：对话列表（可收起） */}
      <aside className="w-64 border-r hidden md:block">
        <ConversationList />
      </aside>
      
      {/* 中间：聊天区域 */}
      <main className="flex-1 flex flex-col">
        <ChatHeader />
        <MessageList />
        <ChatInput />
      </main>
      
      {/* 右侧：角色信息/设置（可选） */}
      <aside className="w-72 border-l hidden lg:block">
        <CharacterInfo />
      </aside>
    </div>
  );
}
```

### 4.3 响应式设计

- **移动端**: 侧边栏使用 Sheet 抽屉
- **平板**: 隐藏右侧角色信息栏
- **桌面**: 三栏布局

---

## 5. 对话机制设计

### 5.1 简化后的 useMessages Hook

```typescript
// hooks/useMessages.ts (重构后，约60行)

'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useState } from 'react';
import type { Message } from '@/types';

interface UseMessagesOptions {
  conversationId: string | null;
}

export function useMessages({ conversationId }: UseMessagesOptions) {
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  
  // 使用 AI SDK 的 useChat hook
  const {
    messages,
    append,
    isLoading,
    error,
    stop,
    reload,
  } = useChat({
    id: conversationId || undefined,
    api: conversationId ? `/api/chat/${conversationId}` : undefined,
    initialMessages: initialMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
  });

  // 加载历史消息
  useEffect(() => {
    if (!conversationId) {
      setInitialMessages([]);
      return;
    }

    async function loadMessages() {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        const data = await res.json();
        if (data.success) {
          setInitialMessages(data.data);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }

    loadMessages();
  }, [conversationId]);

  // 发送消息（简化版）
  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !content.trim()) return;
    
    await append({
      role: 'user',
      content: content.trim(),
    });
  }, [conversationId, append]);

  return {
    messages,
    sendMessage,
    isLoading,
    error: error?.message || null,
    stop,
    retry: reload,
  };
}
```

### 5.2 Chat API 重构

```typescript
// app/api/chat/[conversationId]/route.ts

import { streamText } from 'ai';
import { createModel, getDefaultModelConfig } from '@/lib/ai/providers/registry';
import { addMessage, getConversation } from '@/lib/storage/conversations';
import { getCharacterById } from '@/lib/storage/characters';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const { messages } = await request.json();

    // 1. 获取对话和角色信息
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return new Response('Conversation not found', { status: 404 });
    }

    const character = await getCharacterById(conversation.characterId);
    if (!character) {
      return new Response('Character not found', { status: 404 });
    }

    // 2. 保存用户消息
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      await addMessage(conversationId, {
        role: 'user',
        content: lastMessage.content,
      });
    }

    // 3. 构建完整消息（含系统提示词）
    const systemMessage = {
      role: 'system' as const,
      content: character.systemPrompt,
    };

    const fullMessages = [systemMessage, ...messages];

    // 4. 获取模型并调用
    const modelConfig = character.defaultModel 
      ? { provider: 'openai', modelId: character.defaultModel }
      : getDefaultModelConfig();
    const model = createModel(modelConfig);

    // 5. 流式响应
    const result = streamText({
      model,
      messages: fullMessages,
      temperature: character.temperature || 0.7,
      async onFinish({ text }) {
        await addMessage(conversationId, {
          role: 'assistant',
          content: text,
          model: modelConfig.modelId,
        });
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

### 5.3 关键改进点

- ✅ `conversationId` 从 URL 获取，不在 body 中
- ✅ 自动加载角色的 systemPrompt
- ✅ 使用 `toDataStreamResponse()` 而非 `toTextStreamResponse()`
- ✅ 支持角色的默认模型和温度设置

---

## 6. 人设/角色管理设计

### 6.1 角色数据模型

```typescript
// types/character.ts

export interface Character {
  id: string;                    // UUID
  name: string;                  // 角色名称
  avatar?: string;               // 头像 URL
  description: string;           // 简短描述
  
  // 角色设定（基础版）
  systemPrompt: string;          // 系统提示词
  personality: string[];         // 性格特征标签
  background?: string;           // 背景故事
  exampleDialogues?: string[];   // 示例对话
  
  // 模型配置
  defaultModel?: string;         // 默认模型
  temperature?: number;          // 温度 (0-2)
  
  // 记忆
  memoryEnabled: boolean;        // 是否启用记忆
  
  // 元数据
  createdAt: string;
  updatedAt: string;
}
```

### 6.2 角色表单 UI

```tsx
// components/character/character-form.tsx

export function CharacterForm({ character, onSave }: Props) {
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <Section title="基本信息">
        <Input name="name" label="角色名称" required />
        <Textarea name="description" label="角色简介" />
        <AvatarUpload name="avatar" />
      </Section>

      {/* 人设 */}
      <Section title="人设设定">
        <Textarea 
          name="systemPrompt" 
          label="系统提示词" 
          rows={8}
          placeholder="描述角色的性格、说话风格、行为模式..."
        />
        <TagInput name="personality" label="性格标签" />
        <Textarea name="background" label="背景故事" rows={4} />
      </Section>

      {/* 对话示例 */}
      <Section title="对话示例">
        <ExampleDialogueEditor name="exampleDialogues" />
      </Section>

      {/* 高级设置 */}
      <Collapsible title="高级设置">
        <ModelSelector name="defaultModel" />
        <Slider 
          name="temperature" 
          label="创造性 (温度)" 
          min={0} max={2} step={0.1}
        />
        <Switch name="memoryEnabled" label="启用记忆功能" />
      </Collapsible>

      <Button type="submit">保存角色</Button>
    </form>
  );
}
```

---

## 7. 存储层架构

### 7.1 文件系统结构

```
data/
├── characters/                  # 角色数据
│   ├── {uuid}.json             # 单个角色
│   └── ...
│
├── conversations/               # 对话数据
│   ├── {uuid}/                 # 对话目录
│   │   ├── meta.json          # 对话元数据
│   │   └── messages.json      # 消息列表
│   └── ...
│
├── config/                      # 配置数据
│   ├── settings.json           # 用户设置
│   └── endpoints.json          # 自定义端点
│
└── memories/                    # 记忆数据（Phase 10）
    └── ...
```

### 7.2 存储层基类（带文件锁）

```typescript
// lib/storage/base.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import lockfile from 'proper-lockfile';

export class FileStorage<T> {
  constructor(private basePath: string) {}

  async get(id: string): Promise<T | null> {
    try {
      const filePath = path.join(this.basePath, `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async set(id: string, data: T): Promise<void> {
    const filePath = path.join(this.basePath, `${id}.json`);
    await fs.mkdir(this.basePath, { recursive: true });
    
    const release = await lockfile.lock(filePath, {
      retries: 3,
      realpath: false,
    }).catch(() => null);

    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } finally {
      if (release) await release();
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<T[]> {
    try {
      const files = await fs.readdir(this.basePath);
      const items: T[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(
            path.join(this.basePath, file), 
            'utf-8'
          );
          items.push(JSON.parse(content));
        }
      }
      
      return items;
    } catch {
      return [];
    }
  }
}
```

### 7.3 依赖更新

```json
{
  "dependencies": {
    "proper-lockfile": "^4.1.2"
  },
  "devDependencies": {
    "@types/proper-lockfile": "^4.1.4"
  }
}
```

---

## 8. 提示词系统设计

> ⚠️ **待补充**: 等待用户提供具体需求

### 8.1 初步设计（等待确认）

**数据模型**:
```typescript
// types/prompt.ts

export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  fewShotExamples?: FewShotExample[];
  variables: PromptVariable[];
  category: PromptCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FewShotExample {
  id: string;
  user: string;
  assistant: string;
  order: number;
}

export interface PromptVariable {
  name: string;
  displayName: string;
  type: 'text' | 'number' | 'boolean';
  defaultValue?: any;
  required: boolean;
}

export type PromptCategory = 
  | 'roleplay'
  | 'assistant'
  | 'creative'
  | 'custom';
```

**功能模块**:
- [ ] 提示词模板管理（CRUD）
- [ ] 变量解析（`{{char}}`、`{{user}}` 等）
- [ ] Few-shot 示例管理
- [ ] 上下文长度管理
- [ ] 模板库/分享功能

### 8.2 用户需求（待填充）

**【此处等待用户输入具体需求】**

---

## 9. 实施路线图

### 9.1 Phase -1：架构清理（2-3 天）

**Day 1：AI SDK 集成重构**
- [ ] 重写 `useMessages.ts`（60 行以内）
- [ ] 创建 `/api/chat/[conversationId]/route.ts`
- [ ] 测试流式响应

**Day 2：存储层优化**
- [ ] 添加 `proper-lockfile` 依赖
- [ ] 实现 `FileStorage` 基类
- [ ] 重构 characters、conversations 存储

**Day 3：代码清理**
- [ ] 移除冗余代码
- [ ] 统一 API 响应格式
- [ ] 添加 ErrorBoundary

### 9.2 Phase 0：提示词系统（5 天）

**Day 1：数据模型**
- [ ] 定义 `PromptTemplate` 等类型
- [ ] 创建默认模板

**Day 2-3：核心逻辑**
- [ ] 变量解析器
- [ ] 上下文管理器
- [ ] Chat API 集成

**Day 4-5：UI 实现**
- [ ] 提示词模板库页面
- [ ] 模板编辑器
- [ ] 角色提示词配置

### 9.3 后续 Phase

- **Phase 8**: 多模型支持（4 天）
- **Phase 9**: 自定义端点（5 天）
- **Phase 10**: Memory Bank（7 天）
- **Phase 11-12**: 测试与发布（8 天）

---

## 10. 用户需求与反馈

### 10.1 用户背景

- **项目性质**: 个人开源项目，自用为主
- **核心关注**: 代码可维护性，易于修改
- **时间压力**: 无，可以慢慢打磨

### 10.2 用户反馈

**关于架构设计**:
> "LLM 设计出来的许多东西我都不满意，后续修改会不会特别麻烦？"

**应对策略**:
- ✅ 先优化架构，建立良好基础
- ✅ 代码简洁，便于后续调整
- ✅ 预留扩展点，不过度设计

### 10.3 待确认事项

- [ ] 提示词系统的具体功能需求
- [ ] UI 风格偏好
- [ ] 其他自定义需求

---

## 附录

### A. 技术依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.x | 框架 |
| React | 19.x | UI |
| @ai-sdk/react | latest | AI 对话 |
| Zustand | 5.x | 状态管理 |
| Tailwind CSS | 3.x | 样式 |
| shadcn/ui | latest | UI 组件 |
| proper-lockfile | 4.x | 文件锁 |

### B. 参考文档

- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [Next.js App Router](https://nextjs.org/docs/app)

---

**文档版本**: v1.0  
**最后更新**: 2025-11-23

---

## 8. 提示词系统设计（核心功能）

> 🎯 **设计目标**: 构建专业级、高度解耦的提示词处理系统  
> 📌 **核心原则**: 所有功能均用独立单元模块实现，保证高度解耦  
> 📚 **详细需求**: 见 [user-requirements-detailed.md](./user-requirements-detailed.md)

### 8.1 核心设计理念

**项目定位**:
> 提示词工程 + 以函数调用、MCP为主的AI Agent，专门用于**情感陪护、角色扮演**的LLM对话客户端

**核心组成**:
1. 特殊的提示词处理机制（最核心）
2. 函数调用（Function Calling）
3. MCP（Model Context Protocol）
4. JavaScript运行时
5. 正则表达式处理

### 8.2 核心概念（重点）

#### 8.2.1 楼层（Layer）系统

**定义**: 对对话中第 n 条消息的位置定位

- **第 0 层楼**: 开场白（AI 的第一条消息）
- **第 n 层楼**: 第 n+1 条消息
- **公式**: `楼层编号 = 消息序号 - 1`

#### 8.2.2 深度（Depth）系统

**定义**: 对用户消息的位置定位（用于注入机制）

- **深度 0**: 注入位置（最高优先级，LLM强遵守）
- **深度 1**: 用户当前消息
- **深度 n**: 往前第 n 条用户消息

#### 8.2.3 注入（Injection）机制

**定义**: 将提示词后处理到指定位置，而非原始序列

**用途**: 实现强制遵守的提示词、紧急规则注入

### 8.3 统一提示词编辑器

全局使用统一的编辑器组件，支持：

1. **排序** - 拖拽排序
2. **注入** - 深度控制、位置控制
3. **开关** - 是否发送给AI
4. **Role设定** - system/user/assistant，自动适配API

### 8.4 提示词后处理系统（最重要）

#### 处理流程

```
原始提示词
  ↓
变量替换 ({{time}}, {{location}}, {{device_info}})
  ↓
占位符替换 ({{user}}, {{chat_history}}, {{last_user_message}})
  ↓
宏展开 ({{setvar}}, {{getvar}}, {{random}})
  ↓
Role适配 (根据API类型：OpenAI/Gemini/Anthropic)
  ↓
排序整合 (预设→角色→对话窗口→用户消息)
  ↓
注入处理 (深度0优先级最高)
  ↓
最终发送给LLM
```

#### Role适配规则（关键）

⚠️ **绝对不可以透传！**

- **Gemini**: 强制合并所有 system → System Instructions
- **OpenAI**: 标准格式
- **Anthropic**: system 独立字段

### 8.5 变量/占位符/宏系统

**变量**（实时获取）:
- `{{time}}` - 年月日时分
- `{{location}}` - 省市
- `{{device_info}}` - 设备类型

**占位符**:
- `{{user}}` - 用户名称
- `{{chat_history}}` - 所有上下文
- `{{last_user_message}}` - 最后一条用户消息

**宏**:
- `{{setvar::变量名::变量值}}`
- `{{getvar::变量名}}`
- `{{random::选项1::选项2::...}}`

### 8.6 角色编辑页面（改造）

**移除**:
- ❌ 系统提示词
- ❌ 背景故事
- ❌ 高级配置

**保留（不发送给LLM）**:
- 角色名称（仅UI显示）
- 角色描述（仅用户备注）

**新增**:
- ✅ 开场白编辑窗口（第0层楼）
- ✅ 提示词配置（使用统一编辑器）

### 8.7 预设系统

**功能**:
1. 模型参数（温度、top_p等）+ 打勾选择发送
2. 上下文限制（本地计数器，不走LLM）
3. 提示词编辑区（自由增减条目）
4. 全局位置调节

### 8.8 其他核心功能

1. **渲染系统**
   - Markdown/HTML支持
   - 代码高亮（可选）
   - 特殊字段渲染（引号、括号）
   - CSS完全自定义工具

2. **流式计时器** - 显示耗时

3. **思维链折叠** - `<think>`标签可配置

4. **Token计数器** - 三种API对应三种计数器，本地实现

5. **Dev Mode** - 页面一半为Log面板

6. **函数调用** - 计算器等工具

7. **MCP集成** - 专门配置页面

8. **JavaScript运行时** - 动态提示词生成

9. **正则表达式** - 后处理输入/输出，支持实际修改和视觉修改

### 8.9 模块化架构（强制要求）

> ⚠️ **所有功能均用独立单元模块实现，保证高度解耦**

```
lib/
├── prompt/
│   ├── processor.ts        # 提示词后处理器
│   ├── variables.ts        # 变量解析器
│   ├── macros.ts          # 宏处理器
│   ├── placeholders.ts    # 占位符解析器
│   ├── injection.ts       # 注入处理器
│   ├── role-adapter.ts    # Role适配器
│   └── composer.ts        # 提示词组装器
├── rendering/
│   ├── markdown.ts        # Markdown渲染
│   ├── code-highlight.ts  # 代码高亮
│   └── special-fields.ts  # 特殊字段
├── token-counter/
│   ├── openai.ts
│   ├── gemini.ts
│   └── anthropic.ts
├── function-calling/
│   └── registry.ts
├── mcp/
│   └── client.ts
└── javascript/
    └── runtime.ts
```

---

## 9. 更新后的实施路线图

### Phase -1：架构清理（2-3 天）

保持不变，见原计划。

### Phase 0：提示词系统（NEW，10-12 天）

**核心优先级最高！**

#### Week 1: 核心概念与基础

**Day 1-2: 数据模型与基础设施**
- [ ] 定义楼层/深度/注入数据模型
- [ ] 创建统一提示词编辑器基础组件
- [ ] 设置模块化目录结构

**Day 3-4: 变量/占位符/宏系统**
- [ ] 实现变量解析器（time, location, device_info）
- [ ] 实现占位符解析器（user, chat_history, last_user_message）
- [ ] 实现宏处理器（setvar, getvar, random）

**Day 5: Role适配系统**
- [ ] 实现Role适配器（OpenAI/Gemini/Anthropic）
- [ ] Gemini特殊处理：合并system → System Instructions

#### Week 2: UI与集成

**Day 6-7: 统一提示词编辑器**
- [ ] 排序功能（拖拽）
- [ ] 注入功能（深度控制）
- [ ] 开关功能
- [ ] Role设定功能

**Day 8-9: 角色编辑页面改造**
- [ ] 移除旧字段（system_prompt, background等）
- [ ] 新增开场白编辑器
- [ ] 集成统一提示词编辑器

**Day 10: 预设系统**
- [ ] 预设编辑器UI
- [ ] 参数打勾选择
- [ ] 上下文限制（本地计数器）

**Day 11-12: 提示词后处理集成**
- [ ] 整合所有处理器
- [ ] Chat API集成
- [ ] 完整流程测试

### Phase 1：渲染与UI优化（5-7 天）

**Day 1-2: 渲染系统**
- [ ] Markdown/HTML渲染
- [ ] 代码高亮（可选开关）
- [ ] 特殊字段渲染（引号、括号）

**Day 3-4: CSS自定义工具**
- [ ] CSS编辑器组件
- [ ] 实时预览
- [ ] 预设主题

**Day 5: 流式计时器**
- [ ] 计时器组件
- [ ] 思维链折叠（`<think>`标签）

**Day 6-7: UI/UX优化**
- [ ] 客户端风格调整
- [ ] 响应式优化
- [ ] 细节打磨

### Phase 2：高级功能（8-10 天）

**Day 1-3: Token计数器**
- [ ] OpenAI计数器（tiktoken）
- [ ] Gemini计数器（本地估算）
- [ ] Anthropic计数器（本地估算）
- [ ] UI集成显示

**Day 4-5: Dev Mode**
- [ ] 日志收集系统
- [ ] Log面板UI（50%页面）
- [ ] 请求/响应查看器

**Day 6-7: 函数调用框架**
- [ ] 函数注册表
- [ ] 内置工具（计算器等）
- [ ] UI配置界面

**Day 8-9: MCP集成**
- [ ] MCP配置页面
- [ ] JSON配置编辑器
- [ ] 测试MCP工具

**Day 10: JavaScript运行时**
- [ ] 沙箱环境
- [ ] 动态提示词生成
- [ ] 安全策略

### Phase 3：测试与发布（5-7 天）

保持不变，见原计划。

---

## 10. 关键决策与权衡

### 为什么调整优先级？

**原计划**: Phase 8-12（模型管理 → 端点 → MCP → 测试）

**新计划**: Phase 0（提示词）→ Phase 1（渲染）→ Phase 2（高级功能）

**原因**:
1. ✅ 提示词是项目灵魂，必须优先
2. ✅ 用户需求明确且复杂，需要充分时间
3. ✅ 模块化架构要求从头做好，避免返工

### 技术债务如何处理？

**策略**: 在Phase 0实施时，顺便优化AI SDK集成

**理由**:
- 提示词系统需要干净的对话机制
- 边开发边重构效率更高
- 避免技术债累积

### 时间估算合理性

| Phase | 预估时间 | 复杂度 | 风险 |
|-------|---------|--------|------|
| Phase -1 | 2-3天 | 中 | 低 |
| Phase 0 | 10-12天 | 高 | 中 |
| Phase 1 | 5-7天 | 中 | 低 |
| Phase 2 | 8-10天 | 高 | 中 |
| Phase 3 | 5-7天 | 低 | 低 |
| **总计** | **30-39天** | - | - |

**关键风险**:
- Phase 0 的Role适配可能需要更多调试时间
- JavaScript运行时需要仔细考虑安全性

---

**文档更新**: 2025-11-23  
**版本**: v2.0（已整合用户需求）