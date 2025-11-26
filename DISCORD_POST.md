# EmotiChat · 先行测试版（第 5 天）
类 SillyTavern 的情感陪护聊天客户端（Next.js 15 + React 19）。**不会提供 SillyTavern 数据兼容层或内容转换**。

🟢 已上线的好用功能  
- 角色 / 预设 / 对话管理，提示词继承与覆盖，流式/非流式输出  
- 提示词编辑器：System/User/Assistant 分段，启停排序，before/after/replace 注入，变量化，token 估算  
- 多模型：OpenAI / Gemini / Anthropic，自定义端点与参数  
- Token 计数：精确+估算，窗口提示与预警  
- 富文本：Markdown、KaTeX、代码高亮，可选 HTML/CSS 预览（默认关）  
- 开发者模式：请求/响应日志、提示词构建、性能与 Token 统计  
- 本地存储：文件系统 JSON，数据/日志分目录

🟡 还在做 / 未完全测试  
- 更细的高级提示词工具与安全策略（仍在做）  
- 更完善的性能优化与自动化测试  
- 先行测试版，可能有 BUG/边缘问题

🚀 快速试用  
`npm install` → `npm run dev` → 打开 http://localhost:3000 → 设置页填各模型 API Key  
（API Key 保存在浏览器本地；`config.yaml` 是唯一入口，已不再用 `.env`；`data/`、`logs/`、`mydatabase.db` 已忽略提交）

🔗 仓库：<https://github.com/559889a/Emotichat.git>
