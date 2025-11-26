# EmotiChat

Next.js 15 + React 19 的情感陪护聊天客户端，组件高度解耦，偏工程化。类 SillyTavern 项目，但**永不提供 SillyTavern 数据兼容层或内容转换**。

- 立项到发布：第 5 天  
- 当前版本：先行测试版（高级功能未完成、未全面测试）

## 特色功能（已开发）
- 角色 / 预设 / 对话：多级继承与覆盖，流式/非流式输出，版本化消息。
- 模型与端点：内置 OpenAI / Gemini / Anthropic，支持自定义兼容端点与参数（temperature/top_p/max_tokens 等）。
- Token 计数与限流：精确（tiktoken）/估算双方案，上下文窗口提示与预警。
- 富文本渲染：Markdown、KaTeX、代码高亮，可选 HTML/CSS 预览（默认关闭）。
- 开发者模式：请求/响应日志、提示词构建展示、性能与 Token 统计面板。
- 本地持久化：文件系统 JSON，按目录区分对话/角色/预设/日志。

## 在研 / 未完成 / 风险
- 高级功能尚未完成：高级提示词编辑、更多安全策略、自动化测试体系。
- 兼容性策略：不会做 SillyTavern 数据兼容层，不会转换或适配其内容。
- 先行测试版：未经全面测试，存在潜在 BUG/性能问题。

## 技术栈
- Next.js 15 + React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand
- Vercel AI SDK
- js-tiktoken（Token 计数）

## 目录速览
- `app/` 应用路由与页面
- `components/` UI 组件（chat、settings 等）
- `stores/` Zustand 状态
- `lib/` 工具与 AI 适配
- `hooks/` 自定义 Hook
- `config/` 运行时配置（`config.yaml`）
- `data/` 本地数据（已忽略提交）
- `logs/` 运行日志（已忽略提交）

## 本地运行
1. Node.js 18+  
2. 安装依赖：`npm install`  
3. 开发模式：`npm run dev`（默认 http://localhost:3000）  
4. 生产构建：`npm run build && npm run start`

## 配置
- 运行时配置：`config/config.yaml` 定义数据/日志目录、白名单等。
- API Key：设置页填写，存储于浏览器本地，不随代码提交。
- 环境变量：可用 `.env.local` 自定义端点/密钥（已被 `.gitignore` 忽略）。

## 隐私与版本控制
- 已忽略提交：`data/`、`logs/`、`.env*`、`mydatabase.db`；防止本地隐私或运行数据泄露。
- 发布前请检查代码/文档中是否包含个人信息。

## 部署
- 兼容 Vercel 与自托管：`npm run build` 生成产物，配置好端点与密钥即可部署。
