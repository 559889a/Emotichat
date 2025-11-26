# EmotiChat

Next.js 15 + React 19 情感陪护聊天客户端，强调组件解耦与可维护性。基于 TypeScript、Tailwind CSS、shadcn/ui、Zustand 与 Vercel AI SDK 构建。

## 核心特性
- 角色/预设/对话管理，提示词继承与覆盖，流式/非流式输出。
- 多模型支持：OpenAI / Gemini / Anthropic，支持自定义端点与参数配置。
- Token 计数与限流：精确/估算、上下文窗口提示、警戒阈值。
- 富文本渲染：Markdown、KaTeX、代码高亮、可选 HTML/CSS 预览。
- 开发者模式：请求/响应日志、提示词构建展示、性能与 Token 统计。
- 本地持久化：文件系统 JSON 存储，对话/角色/预设/日志分目录保存。

## 技术栈
- Next.js 15 + React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand 状态管理
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
1) Node.js 18+  
2) 安装依赖：`npm install`  
3) 开发模式：`npm run dev`（默认 http://localhost:3000）  
4) 生产构建：`npm run build && npm run start`

## 配置
- 运行时配置：`config/config.yaml` 定义数据/日志目录、白名单等。
- API Key：在设置页输入，保存在浏览器本地存储，不随代码提交。
- 环境变量：如需自定义端点，可通过 `.env.local` 配置（默认被 `.gitignore` 忽略）。

## 隐私与版本控制
- 已从 Git 版本中移除本地日志与数据库文件，保留于本机：`logs/*.log`、`mydatabase.db`。
- `data/`、`logs/`、`.env*` 默认忽略提交，防止隐私泄露。
- 发布前请确认未将个人敏感数据写入代码或文档。

## 部署
- 兼容 Vercel/自托管：构建产物来自 `npm run build`。配置环境变量与自定义端点后即可部署。
