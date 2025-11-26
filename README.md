# EmotiChat

> **现代化的情感陪护与角色扮演 LLM 客户端**
> *基于 Next.js 15 + React 19 构建*

EmotiChat 是一个专为**情感陪护**和**角色扮演**设计的现代化聊天客户端。它旨在提供一个轻量级、工程化且高度可定制的替代方案，以取代日益臃肿的旧时代工具。

⚠️ **注意**：本项目**永不提供** SillyTavern (酒馆) 的数据兼容层或内容转换。我们选择轻装上阵，构建全新的数据结构与交互体验。

## 🌟 核心理念与差异

| 特性 | EmotiChat | 传统酒馆 (SillyTavern) |
| :--- | :--- | :--- |
| **架构** | **Next.js 15 + React 19**，高度模块化与解耦 | jQuery / Legacy JS，历史包袱重 |
| **定位** | **工程化优先**，强调代码质量与可维护性 | 功能堆砌优先，强调大而全 |
| **数据** | 全新的结构化 JSON 存储 | 复杂的旧版兼容格式 |
| **体验** | 现代 Web 应用体验 (shadcn/ui) | 传统网页应用体验 |

## ✨ 特色功能

### 🧠 硬核提示词工程 (Prompt Engineering)
EmotiChat 将提示词构建视为核心功能，而非简单的文本拼接：
-   **楼层 (Layer) 与深度 (Depth)**：精确控制每一条消息在上下文中的位置。
-   **深度注入 (Injection)**：支持 `Before`、`After`、`Replace` 三种模式，可将特定指令强制插入到对话历史的任意深度。
-   **动态变量与宏**：内置 `{{time}}`、`{{location}}` 等实时变量，以及 `{{random}}`、`{{setvar}}` 等逻辑宏。
-   **可视化编辑器**：拖拽排序，分组管理，实时 Token 估算。

### 💬 沉浸式对话体验
-   **多版本消息**：支持消息重生、编辑，并保留历史版本，随时回溯。
-   **富文本渲染**：完美支持 Markdown、KaTeX 数学公式、代码高亮。
-   **流式响应**：丝滑的打字机效果，支持暂停与继续。
-   **HTML/CSS 预览**：(可选) 支持渲染模型输出的 HTML 内容，增强表现力。

### 🛠️ 开发者友好 (Dev Mode)
专为 Power User 设计的调试模式：
-   **分屏调试**：50% 屏幕实时显示后台日志。
-   **Prompt Inspector**：查看发送给模型的**最终原始提示词**，包含所有注入与替换后的结果。
-   **Token 统计**：基于 `tiktoken` 的精确计数与上下文窗口预警。

### 🔌 模型与扩展
-   **多模型支持**：原生支持 OpenAI、Google Gemini、Anthropic。
-   **自定义端点**：兼容任何 OpenAI 格式的 API 接口。
-   **本地优先**：所有数据（对话、角色、预设）存储于本地文件系统 (`data/`)，API Key 存储于浏览器本地，隐私无忧。

## 🚀 快速开始

### 环境要求
-   Node.js 18+

### 安装与运行

1.  **克隆仓库**
    ```bash
    git clone https://github.com/559889a/Emotichat.git
    cd Emotichat
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **启动开发服务器**
    ```bash
    npm run dev
    ```

4.  **访问**
    打开浏览器访问 `http://localhost:3000`。

## 📂 目录结构

-   `app/`: Next.js 应用路由
-   `components/`: React UI 组件
-   `lib/`: 核心逻辑库 (AI 适配、提示词处理等)
-   `config/`: 运行时配置
-   `data/`: 本地存储目录 (已忽略 git)

## ⚠️ 声明

本项目目前处于 **先行测试版 (Alpha)**。
-   高级功能仍在开发中。
-   可能存在 Bug 或破坏性更新。
-   欢迎提交 Issue 和 PR 参与共建！

---
*EmotiChat - Reimagining AI Companionship.*
