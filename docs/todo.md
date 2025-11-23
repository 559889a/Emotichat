# EmotiChat 开发任务清单

> **自动维护文件** - 此文件由开发工作流自动更新  
> **最后更新**: 2025-11-23  
> **总任务数**: 241

---

## 已完成任务

- [x] Phase 1-7: 基础功能开发完成（已提交 Git: 2fc9e2c）
- [x] Bug 修复：角色卡片交互优化
- [x] Bug 修复："开始对话"按钮功能
- [x] 架构分析与重构计划制定
- [x] Phase -1.1: 文件系统并发写入问题修复
- [x] Phase -1.1.1: 阅读 emotichat/lib/storage/*.ts 了解当前实现
- [x] Phase -1.1.2: 设计文件锁机制（使用 proper-lockfile 或类似库）
- [x] Phase -1.1.3: 在 emotichat/lib/storage/lock.ts 实现文件锁工具函数
- [x] Phase -1.1.4: 修改 emotichat/lib/storage/characters.ts 添加文件锁
- [x] Phase -1.1.5: 修改 emotichat/lib/storage/conversations.ts 添加文件锁
- [x] Phase -1.1.6: 修改 emotichat/lib/storage/memories.ts 添加文件锁
- [x] Phase -1.1.7: 测试并发写入场景（多个对话同时保存）
- [x] Phase -1.2: 添加 React Error Boundary
- [x] Phase -1.2.1: 在 emotichat/components/layout/error-boundary.tsx 创建 Error Boundary 组件
- [x] Phase -1.2.2: 在 emotichat/app/layout.tsx 根层级添加 Error Boundary
- [x] Phase -1.2.3: 在关键功能组件添加局部 Error Boundary（角色管理、对话列表）
- [x] Phase -1.2.4: 实现错误日志记录（可选：发送到服务端）
- [x] Phase -1.3: 重构 useMessages.ts AI SDK 集成
- [x] Phase -1.3.1: 阅读当前 emotichat/hooks/useMessages.ts 实现
- [x] Phase -1.3.2: 研究 @ai-sdk/react 的 useChat hook 正确用法
- [x] Phase -1.3.3: 移除手动 fetch 实现，使用 useChat hook
- [x] Phase -1.3.4: 调整 API 路由 emotichat/app/api/chat/route.ts 以兼容 useChat
- [x] Phase -1.3.5: 测试流式响应是否正常工作
- [x] Phase -1.3.6: Git commit: "fix: 重构 AI SDK 集成"

---

## 进行中任务

### Phase 0: 提示词系统（核心功能，最高优先级）

#### 0.0 开始前必读文档
- [x] 0.0.1: 完整阅读 emotichat/docs/refactoring-plan.md 的 Phase 0 部分
- [x] 0.0.2: 完整阅读 emotichat/docs/user-requirements-detailed.md 的提示词系统需求
- [x] 0.0.3: 理解楼层/深度/注入机制的概念

#### 0.1 设计提示词数据结构
- [x] 0.1.1: 在 emotichat/types/prompt.ts 定义 PromptLayer 接口（楼层概念）
- [x] 0.1.2: 定义 PromptDepth 枚举（位置：顶部/底部等）
- [x] 0.1.3: 定义 PromptInjection 接口（注入时机：Character/Depth）
- [x] 0.1.4: 定义 PromptRole 类型（system/user/assistant）
- [x] 0.1.5: 定义 PromptVariable 接口（变量系统：{{user}}, {{char}}等）
- [x] 0.1.6: 定义 PromptMacro 接口（宏系统）
- [x] 0.1.7: 定义 PromptPreset 接口（全局预设：Scenario/Author's Note）
- [x] 0.1.8: 定义 CharacterPromptConfig 接口（角色级提示词配置）
- [x] 0.1.9: 定义 ConversationPromptConfig 接口（对话级提示词配置）
- [x] 0.1.10: 更新 emotichat/types/character.ts 添加 promptConfig 字段
- [x] 0.1.11: 更新 emotichat/types/conversation.ts 添加 promptConfig 字段
- [ ] 0.1.12: Git commit: "feat: 定义提示词系统数据结构"

#### 0.2 实现提示词构建引擎
- [ ] 0.2.1: 在 emotichat/lib/prompt/builder.ts 创建提示词构建器
- [ ] 0.2.2: 实现变量替换函数 replaceVariables(template, variables)
- [ ] 0.2.3: 实现宏展开函数 expandMacros(template, macros)
- [ ] 0.2.4: 实现楼层排序逻辑（按 depth 和 priority 排序）
- [ ] 0.2.5: 实现提示词注入逻辑（Character/Depth 注入）
- [ ] 0.2.6: 实现 Role 自动适配（Gemini: user/model, OpenAI/Claude: system/user/assistant）
- [ ] 0.2.7: 实现提示词后处理（去除多余空行、格式化）
- [ ] 0.2.8: 实现主构建函数 buildPrompt(character, conversation, messages)
- [ ] 0.2.9: 添加单元测试 emotichat/lib/prompt/__tests__/builder.test.ts
- [ ] 0.2.10: Git commit: "feat: 实现提示词构建引擎"

#### 0.3 创建统一提示词编辑器组件
- [ ] 0.3.1: 在 emotichat/components/prompt/prompt-editor.tsx 创建编辑器
- [ ] 0.3.2: 实现多行文本编辑（使用 Textarea 组件）
- [ ] 0.3.3: 实现变量插入按钮（{{user}}, {{char}}, {{random}}等）
- [ ] 0.3.4: 实现宏插入按钮（预定义宏列表）
- [ ] 0.3.5: 实现实时预览功能（显示替换后的提示词）
- [ ] 0.3.6: 实现 Token 计数显示（使用 tiktoken 或类似库）
- [ ] 0.3.7: 实现语法高亮（可选：使用 CodeMirror 或 Monaco Editor）
- [ ] 0.3.8: 实现保存/取消按钮
- [ ] 0.3.9: 添加响应式设计（移动端适配）
- [ ] 0.3.10: Git commit: "feat: 创建统一提示词编辑器"

#### 0.4 实现角色提示词管理
- [ ] 0.4.1: 在 emotichat/components/character/prompt-config.tsx 创建配置面板
- [ ] 0.4.2: 实现 System Prompt 编辑（角色定义、性格、背景）
- [ ] 0.4.3: 实现 Jailbreak Prompt 编辑（可选，用于绕过限制）
- [ ] 0.4.4: 实现 NSFW Prompt 编辑（可选，成人内容提示）
- [ ] 0.4.5: 实现 First Message 编辑（开场白）
- [ ] 0.4.6: 实现 Example Dialogs 编辑（示例对话，Few-shot Learning）
- [ ] 0.4.7: 实现提示词层级管理（添加/删除/排序楼层）
- [ ] 0.4.8: 实现深度选择器（顶部/底部等位置）
- [ ] 0.4.9: 在 emotichat/components/character/character-form.tsx 集成提示词配置
- [ ] 0.4.10: 更新 emotichat/lib/storage/characters.ts 保存提示词配置
- [ ] 0.4.11: Git commit: "feat: 实现角色提示词管理"

#### 0.5 实现对话提示词配置
- [ ] 0.5.1: 在 emotichat/components/chat/conversation-prompt-config.tsx 创建配置
- [ ] 0.5.2: 实现 Main Prompt 编辑（对话主提示词）
- [ ] 0.5.3: 实现 Override Prompts 编辑（覆盖角色提示词）
- [ ] 0.5.4: 实现提示词继承逻辑（从角色继承 + 对话覆盖）
- [ ] 0.5.5: 在对话设置页面集成提示词配置
- [ ] 0.5.6: 更新 emotichat/lib/storage/conversations.ts 保存提示词配置
- [ ] 0.5.7: Git commit: "feat: 实现对话提示词配置"

#### 0.6 实现全局预设管理
- [ ] 0.6.1: 在 emotichat/app/(main)/settings/prompts/page.tsx 创建预设管理页面
- [ ] 0.6.2: 实现 Scenario 预设编辑（情景设定）
- [ ] 0.6.3: 实现 Author's Note 预设编辑（作者注释）
- [ ] 0.6.4: 实现预设导入/导出功能（JSON 格式）
- [ ] 0.6.5: 实现预设模板库（内置常用预设）
- [ ] 0.6.6: 在 emotichat/lib/storage/config.ts 保存全局预设
- [ ] 0.6.7: Git commit: "feat: 实现全局预设管理"

#### 0.7 实现 Role 自动适配（Gemini 特殊处理）
- [ ] 0.7.1: 在 emotichat/lib/prompt/role-adapter.ts 创建 Role 适配器
- [ ] 0.7.2: 实现 Gemini 角色映射（system -> user, assistant -> model）
- [ ] 0.7.3: 实现 OpenAI 角色映射（保持 system/user/assistant）
- [ ] 0.7.4: 实现 Claude 角色映射（保持 system/user/assistant）
- [ ] 0.7.5: 在提示词构建器中集成 Role 适配
- [ ] 0.7.6: 测试不同模型的提示词渲染
- [ ] 0.7.7: Git commit: "feat: 实现 Role 自动适配"

#### 0.8 实现提示词后处理系统
- [ ] 0.8.1: 在 emotichat/lib/prompt/post-processor.ts 创建后处理器
- [ ] 0.8.2: 实现空行清理（移除多余换行）
- [ ] 0.8.3: 实现格式化优化（统一缩进、标点）
- [ ] 0.8.4: 实现 Token 限制检查（警告超长提示词）
- [ ] 0.8.5: 实现敏感词过滤（可选）
- [ ] 0.8.6: 在提示词构建器中集成后处理
- [ ] 0.8.7: Git commit: "feat: 实现提示词后处理系统"

#### 0.9 Phase 0 集成测试
- [ ] 0.9.1: 创建测试角色，配置完整提示词
- [ ] 0.9.2: 创建测试对话，验证提示词继承
- [ ] 0.9.3: 测试变量替换（{{user}}, {{char}}等）
- [ ] 0.9.4: 测试宏展开
- [ ] 0.9.5: 测试不同模型的 Role 适配
- [ ] 0.9.6: 测试提示词后处理
- [ ] 0.9.7: 修复发现的 Bug
- [ ] 0.9.8: Git commit: "test: Phase 0 集成测试完成"

---

## 待办任务

### Phase 1: 渲染与UI优化

#### 1.0 开始前必读
- [ ] 1.0.1: 阅读 emotichat/docs/refactoring-plan.md 的 Phase 1 部分

#### 1.1 实现 Markdown 渲染
- [ ] 1.1.1: 安装依赖：react-markdown, remark-gfm, rehype-highlight
- [ ] 1.1.2: 在 emotichat/components/chat/markdown-renderer.tsx 创建渲染器
- [ ] 1.1.3: 实现代码块语法高亮（使用 highlight.js）
- [ ] 1.1.4: 实现 LaTeX 公式渲染（使用 KaTeX）
- [ ] 1.1.5: 实现表格渲染
- [ ] 1.1.6: 实现链接处理（安全性检查）
- [ ] 1.1.7: 在 emotichat/components/chat/message-bubble.tsx 集成 Markdown 渲染
- [ ] 1.1.8: 添加明暗主题适配
- [ ] 1.1.9: Git commit: "feat: 实现 Markdown 渲染"

#### 1.2 Token 计数器与限制警告
- [ ] 1.2.1: 安装依赖：tiktoken 或 gpt-tokenizer
- [ ] 1.2.2: 在 emotichat/lib/utils/token-counter.ts 实现 Token 计数
- [ ] 1.2.3: 在提示词编辑器中显示 Token 数量
- [ ] 1.2.4: 在聊天界面显示当前对话 Token 总数
- [ ] 1.2.5: 实现 Token 超限警告（接近模型上下文限制）
- [ ] 1.2.6: 实现 Token 压缩建议（提示用户删除旧消息）
- [ ] 1.2.7: Git commit: "feat: 实现 Token 计数与警告"

#### 1.3 多模型支持与 UI 选择器
- [ ] 1.3.1: 在 emotichat/components/chat/model-selector.tsx 创建模型选择器
- [ ] 1.3.2: 实现内置模型列表（Gemini/OpenAI/Claude）
- [ ] 1.3.3: 实现自定义端点配置（OpenAI/Gemini/X-AI 协议）
- [ ] 1.3.4: 实现模型参数配置（temperature, top_p, max_tokens）
- [ ] 1.3.5: 在对话设置中集成模型选择器
- [ ] 1.3.6: 更新 emotichat/lib/storage/conversations.ts 保存模型配置
- [ ] 1.3.7: 在 emotichat/app/api/chat/route.ts 实现模型路由
- [ ] 1.3.8: Git commit: "feat: 实现多模型支持"

#### 1.4 消息编辑与重新生成
- [ ] 1.4.1: 在 message-bubble.tsx 添加编辑按钮（用户消息）
- [ ] 1.4.2: 实现消息编辑模式（将消息转为可编辑输入框）
- [ ] 1.4.3: 实现消息重新生成按钮（AI 消息）
- [ ] 1.4.4: 实现分支对话功能（编辑消息后创建新分支）
- [ ] 1.4.5: 更新 emotichat/hooks/useMessages.ts 支持消息编辑
- [ ] 1.4.6: 更新 emotichat/lib/storage/conversations.ts 保存编辑历史
- [ ] 1.4.7: Git commit: "feat: 实现消息编辑与重新生成"

#### 1.5 Phase 1 集成测试
- [ ] 1.5.1: 测试 Markdown 渲染（代码、公式、表格）
- [ ] 1.5.2: 测试 Token 计数准确性
- [ ] 1.5.3: 测试模型切换
- [ ] 1.5.4: 测试消息编辑与重新生成
- [ ] 1.5.5: 修复发现的 Bug
- [ ] 1.5.6: Git commit: "test: Phase 1 集成测试完成"

---

### Phase 2: 高级功能

#### 2.0 开始前必读
- [ ] 2.0.1: 阅读 emotichat/docs/refactoring-plan.md 的 Phase 2 部分

#### 2.1 Dev Mode（开发者模式）
- [ ] 2.1.1: 在 emotichat/components/chat/dev-mode-panel.tsx 创建开发面板
- [ ] 2.1.2: 实现显示原始提示词功能（完整 messages 数组）
- [ ] 2.1.3: 实现显示 API 请求/响应（JSON 格式）
- [ ] 2.1.4: 实现显示 Token 使用详情（每条消息的 Token 数）
- [ ] 2.1.5: 实现复制提示词功能（方便调试）
- [ ] 2.1.6: 在设置页面添加 Dev Mode 开关
- [ ] 2.1.7: Git commit: "feat: 实现开发者模式"

#### 2.2 函数调用框架
- [ ] 2.2.1: 在 emotichat/lib/ai/tools/registry.ts 创建工具注册表
- [ ] 2.2.2: 定义工具接口（Tool interface）
- [ ] 2.2.3: 实现示例工具：get_current_time
- [ ] 2.2.4: 实现示例工具：search_web（模拟）
- [ ] 2.2.5: 在 emotichat/app/api/chat/route.ts 集成函数调用
- [ ] 2.2.6: 在 UI 中显示函数调用结果
- [ ] 2.2.7: 实现工具启用/禁用配置
- [ ] 2.2.8: Git commit: "feat: 实现函数调用框架"

#### 2.3 Memory Bank MCP 集成
- [ ] 2.3.1: 研究 MCP（Model Context Protocol）规范
- [ ] 2.3.2: 在 emotichat/lib/mcp/client.ts 实现 MCP 客户端
- [ ] 2.3.3: 实现记忆存储（emotichat/lib/storage/memories.ts 已存在，需增强）
- [ ] 2.3.4: 实现记忆检索（向量搜索或关键词搜索）
- [ ] 2.3.5: 在提示词构建中集成相关记忆
- [ ] 2.3.6: 在 UI 中显示记忆管理面板
- [ ] 2.3.7: Git commit: "feat: 实现 Memory Bank MCP 集成"

#### 2.4 自定义端点支持
- [ ] 2.4.1: 在设置页面添加自定义端点配置
- [ ] 2.4.2: 实现 OpenAI 兼容协议端点（如 LocalAI, Ollama）
- [ ] 2.4.3: 实现 Gemini 协议端点（Google AI Studio）
- [ ] 2.4.4: 实现 X-AI 协议端点（Claude API 格式）
- [ ] 2.4.5: 实现端点健康检查（测试连接）
- [ ] 2.4.6: 实现端点凭据加密存储
- [ ] 2.4.7: Git commit: "feat: 实现自定义端点支持"

#### 2.5 Phase 2 集成测试
- [ ] 2.5.1: 测试 Dev Mode 显示
- [ ] 2.5.2: 测试函数调用（时间、搜索）
- [ ] 2.5.3: 测试记忆存储与检索
- [ ] 2.5.4: 测试自定义端点连接
- [ ] 2.5.5: 修复发现的 Bug
- [ ] 2.5.6: Git commit: "test: Phase 2 集成测试完成"

---

### Phase 3: 测试与发布

#### 3.0 开始前必读
- [ ] 3.0.1: 阅读 emotichat/docs/refactoring-plan.md 的 Phase 3 部分

#### 3.1 单元测试与集成测试
- [ ] 3.1.1: 安装测试依赖：vitest, @testing-library/react
- [ ] 3.1.2: 为提示词构建器编写单元测试
- [ ] 3.1.3: 为数据存储层编写单元测试
- [ ] 3.1.4: 为关键组件编写集成测试
- [ ] 3.1.5: 实现 E2E 测试（Playwright）
- [ ] 3.1.6: 确保测试覆盖率 >80%
- [ ] 3.1.7: Git commit: "test: 添加完整测试套件"

#### 3.2 性能优化（迁移到 SQLite）
- [ ] 3.2.1: 安装依赖：better-sqlite3
- [ ] 3.2.2: 设计 SQLite 数据库架构
- [ ] 3.2.3: 实现数据迁移脚本（从 JSON 到 SQLite）
- [ ] 3.2.4: 重写 emotichat/lib/storage/*.ts 使用 SQLite
- [ ] 3.2.5: 实现数据库索引优化
- [ ] 3.2.6: 测试性能提升（对比 JSON 文件）
- [ ] 3.2.7: Git commit: "perf: 迁移到 SQLite 数据库"

#### 3.3 文档编写
- [ ] 3.3.1: 更新 emotichat/README.md（项目介绍、安装、使用）
- [ ] 3.3.2: 编写 emotichat/docs/user-guide.md（用户指南）
- [ ] 3.3.3: 编写 emotichat/docs/api-reference.md（API 文档）
- [ ] 3.3.4: 编写 emotichat/docs/prompt-guide.md（提示词编写指南）
- [ ] 3.3.5: 编写 emotichat/docs/development.md（开发指南）
- [ ] 3.3.6: 添加示例配置文件和角色卡
- [ ] 3.3.7: Git commit: "docs: 完善项目文档"

#### 3.4 GitHub 发布准备
- [ ] 3.4.1: 创建 .github/workflows/ci.yml（CI/CD 配置）
- [ ] 3.4.2: 创建 CONTRIBUTING.md（贡献指南）
- [ ] 3.4.3: 创建 LICENSE 文件
- [ ] 3.4.4: 准备 Release Notes
- [ ] 3.4.5: 创建 GitHub Issues 模板
- [ ] 3.4.6: 推送代码到 GitHub
- [ ] 3.4.7: 发布第一个 Release（v1.0.0）

---

## 重要提示

⚠️ **此 TODO List 不可简化！** 项目规模大，重头开发，上下文压缩会导致遗忘关键细节

⚠️ **开始任何编码前必须先读取**：
- `emotichat/docs/refactoring-plan.md`
- `emotichat/docs/user-requirements-detailed.md`

---

## 进度统计

- **已完成**: 24 项
- **进行中**: 92 项（Phase 0）
- **待办**: 125 项（Phase 1-3）
- **总计**: 241 项
- **完成率**: 10.0%