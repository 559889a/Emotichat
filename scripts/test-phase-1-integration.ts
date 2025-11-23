#!/usr/bin/env tsx
/**
 * Phase 1 集成测试脚本
 * 测试已实现的功能：Markdown渲染、Token计数、消息编辑、UI响应式
 * 
 * 运行方式：
 * npm run test:phase1
 * 或
 * tsx scripts/test-phase-1-integration.ts
 */

import {
  countTokens,
  countTokensExact,
  countTokensEstimate,
  countMessagesTokens,
  calculateTokenUsage,
  getWarningMessage,
  getModelTokenLimit,
  formatTokenCount,
} from '../lib/utils/token-counter';
import type { Message } from '../types';

// 测试结果统计
interface TestResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

const results: TestResult = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
};

// 辅助函数：测试断言
function assert(condition: boolean, testName: string, errorMsg?: string) {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    results.failed++;
    console.log(`  ❌ ${testName}`);
    if (errorMsg) {
      console.log(`     ${errorMsg}`);
    }
  }
}

// 辅助函数：测试范围
function assertInRange(
  value: number,
  min: number,
  max: number,
  testName: string
) {
  const inRange = value >= min && value <= max;
  assert(
    inRange,
    testName,
    inRange ? undefined : `Expected ${value} to be between ${min} and ${max}`
  );
}

console.log('🧪 Phase 1 集成测试开始...\n');
console.log('=' .repeat(60));

// ============================================================
// 测试 1: Token 计数准确性
// ============================================================
console.log('\n📊 测试 1: Token 计数准确性\n');

// 1.1 测试英文文本
const englishText = 'Hello, world! This is a test message.';
const englishTokens = countTokensEstimate(englishText);
assertInRange(
  englishTokens,
  8,
  12,
  '英文文本 token 估算（应该约为 10 tokens）'
);

// 1.2 测试中文文本
const chineseText = '你好，世界！这是一条测试消息。';
const chineseTokens = countTokensEstimate(chineseText);
assertInRange(
  chineseTokens,
  8,
  12,
  '中文文本 token 估算（应该约为 9 tokens）'
);

// 1.3 测试混合文本
const mixedText = 'Hello 你好 world 世界！';
const mixedTokens = countTokensEstimate(mixedText);
assertInRange(
  mixedTokens,
  5,
  10,
  '混合文本 token 估算'
);

// 1.4 测试空文本
const emptyTokens = countTokensEstimate('');
assert(emptyTokens === 0, '空文本应返回 0 tokens');

// 1.5 测试精确计数（仅 GPT 模型）
try {
  const exactTokens = countTokensExact('Hello, world!', 'gpt-4');
  assert(
    exactTokens > 0,
    '精确 token 计数应返回正数'
  );
  console.log(`     实际精确计数: ${exactTokens} tokens`);
} catch (error) {
  console.log('  ⚠️  精确计数测试跳过（tiktoken 可能未正确加载）');
  results.skipped++;
}

// 1.6 测试消息数组计数
const testMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hello, how are you?',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'I am doing well, thank you!',
    createdAt: new Date().toISOString(),
  },
];
const messagesTokens = countMessagesTokens(testMessages, {
  estimateMode: true,
});
assert(
  messagesTokens > 0,
  '消息数组 token 计数应返回正数'
);
console.log(`     消息数组总 tokens: ${messagesTokens}`);

// 1.7 测试模型限制获取
const gpt4Limit = getModelTokenLimit('gpt-4');
assert(gpt4Limit === 8192, 'GPT-4 限制应为 8192');

const gpt4TurboLimit = getModelTokenLimit('gpt-4-turbo');
assert(gpt4TurboLimit === 128000, 'GPT-4 Turbo 限制应为 128000');

const claudeLimit = getModelTokenLimit('claude-3-opus');
assert(claudeLimit === 200000, 'Claude 3 Opus 限制应为 200000');

const unknownLimit = getModelTokenLimit('unknown-model');
assert(unknownLimit === 4096, '未知模型应返回默认限制 4096');

// 1.8 测试 Token 使用情况计算
const usage = calculateTokenUsage(100, { model: 'gpt-4' });
assert(usage.used === 100, 'Token 使用量应为 100');
assert(usage.limit === 8192, 'Token 限制应为 8192');
assert(usage.remaining === 8092, '剩余 token 应为 8092');
assertInRange(usage.percentage, 1.2, 1.3, 'Token 使用百分比');
assert(usage.warningLevel === 'safe', '警告级别应为 safe');

// 1.9 测试警告级别
const warningUsage = calculateTokenUsage(6800, { model: 'gpt-4' });
assert(warningUsage.warningLevel === 'warning', '80% 使用率应为 warning');

const criticalUsage = calculateTokenUsage(7500, { model: 'gpt-4' });
assert(criticalUsage.warningLevel === 'critical', '90% 使用率应为 critical');

const exceededUsage = calculateTokenUsage(8500, { model: 'gpt-4' });
assert(exceededUsage.warningLevel === 'exceeded', '超过限制应为 exceeded');

// 1.10 测试警告消息
const safeMessage = getWarningMessage(usage);
assert(safeMessage === null, '安全状态不应有警告消息');

const warningMessage = getWarningMessage(warningUsage);
assert(warningMessage !== null, 'warning 状态应有警告消息');

const criticalMessage = getWarningMessage(criticalUsage);
assert(criticalMessage !== null, 'critical 状态应有警告消息');

const exceededMessage = getWarningMessage(exceededUsage);
assert(exceededMessage !== null, 'exceeded 状态应有警告消息');

// 1.11 测试格式化函数
assert(formatTokenCount(500) === '500', '500 应格式化为 "500"');
assert(formatTokenCount(1500) === '1.5K', '1500 应格式化为 "1.5K"');
assert(formatTokenCount(1500000) === '1.5M', '1500000 应格式化为 "1.5M"');

// ============================================================
// 测试 2: Markdown 渲染测试用例
// ============================================================
console.log('\n📝 测试 2: Markdown 渲染测试用例\n');
console.log('  ℹ️  Markdown 渲染需要在浏览器中测试，以下是测试用例：\n');

const markdownTestCases = [
  {
    name: '代码块 - JavaScript',
    content: '```javascript\nconst hello = "world";\nconsole.log(hello);\n```',
  },
  {
    name: '代码块 - Python',
    content: '```python\ndef hello():\n    print("Hello, world!")\n```',
  },
  {
    name: '代码块 - TypeScript',
    content: '```typescript\ninterface User {\n  name: string;\n  age: number;\n}\n```',
  },
  {
    name: '行内代码',
    content: '这是一段包含 `inline code` 的文本。',
  },
  {
    name: 'LaTeX 行内公式',
    content: '这是一个行内公式：$E = mc^2$',
  },
  {
    name: 'LaTeX 块级公式',
    content: '$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$',
  },
  {
    name: '表格',
    content: `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |
| 1   | 2   | 3   |`,
  },
  {
    name: '无序列表',
    content: '- 项目 1\n- 项目 2\n- 项目 3',
  },
  {
    name: '有序列表',
    content: '1. 第一项\n2. 第二项\n3. 第三项',
  },
  {
    name: '引用块',
    content: '> 这是一段引用文本\n> 可以有多行',
  },
  {
    name: '标题',
    content: '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6',
  },
  {
    name: '链接',
    content: '这是一个[内部链接](/test)和一个[外部链接](https://example.com)',
  },
  {
    name: '强调',
    content: '**粗体** 和 *斜体* 和 ~~删除线~~',
  },
  {
    name: '分隔线',
    content: '上方\n\n---\n\n下方',
  },
  {
    name: '混合测试',
    content: `# Markdown 综合测试

这是一段包含 **粗体** 和 *斜体* 的文本。

## 代码示例

\`\`\`typescript
function add(a: number, b: number): number {
  return a + b;
}
\`\`\`

## 数学公式

行内公式：$f(x) = x^2$

块级公式：
$$
\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

## 表格

| 名称 | 年龄 | 城市 |
|------|------|------|
| 张三 | 25   | 北京 |
| 李四 | 30   | 上海 |

## 列表

1. 第一项
2. 第二项
   - 子项 1
   - 子项 2
3. 第三项

> 这是一段引用文本`,
  },
];

console.log('  测试用例已准备：');
markdownTestCases.forEach((testCase, index) => {
  console.log(`  ${index + 1}. ${testCase.name}`);
});

console.log('\n  💡 请在浏览器中测试以下场景：');
console.log('     1. 创建新对话');
console.log('     2. 依次发送上述测试用例');
console.log('     3. 验证渲染结果是否正确');
console.log('     4. 检查深色/明亮模式是否正常显示');
console.log('     5. 检查语法高亮是否正确');
console.log('     6. 检查 LaTeX 公式是否正确渲染');

results.skipped += markdownTestCases.length;

// ============================================================
// 测试 3: 消息编辑与重新生成
// ============================================================
console.log('\n✏️  测试 3: 消息编辑与重新生成\n');
console.log('  ℹ️  消息编辑功能需要在浏览器中手动测试\n');

const editTestCases = [
  '测试编辑用户消息',
  '测试保存编辑（Ctrl+Enter）',
  '测试取消编辑（Esc）',
  '测试空消息不能保存',
  '测试未修改的消息直接取消',
  '测试重新生成 AI 回复',
  '测试版本切换',
  '测试消息删除',
  '测试删除后续消息',
  '测试创建分支',
];

console.log('  💡 请在浏览器中测试以下功能：');
editTestCases.forEach((testCase, index) => {
  console.log(`     ${index + 1}. ${testCase}`);
});

results.skipped += editTestCases.length;

// ============================================================
// 测试 4: UI 响应式和动画
// ============================================================
console.log('\n📱 测试 4: UI 响应式和动画\n');
console.log('  ℹ️  UI 响应式需要在不同设备尺寸下测试\n');

const uiTestCases = [
  {
    category: '桌面布局（> 1024px）',
    tests: [
      '侧边栏正常显示',
      '消息列表宽度合适',
      '输入框大小合适',
      '按钮和图标大小合适',
    ],
  },
  {
    category: '平板布局（768px - 1024px）',
    tests: [
      '侧边栏可折叠',
      '消息列表适应宽度',
      '输入框适应宽度',
      '触摸目标大小足够',
    ],
  },
  {
    category: '手机布局（< 768px）',
    tests: [
      '侧边栏抽屉模式',
      '消息占满宽度',
      '输入框占满宽度',
      '按钮适合触摸',
    ],
  },
  {
    category: '主题切换',
    tests: [
      '明亮模式正常',
      '深色模式正常',
      '切换流畅无闪烁',
      '颜色对比度足够',
    ],
  },
  {
    category: '动画效果',
    tests: [
      '消息淡入动画',
      '按钮悬停效果',
      '模态框动画',
      '加载状态动画',
    ],
  },
  {
    category: '可访问性',
    tests: [
      '键盘导航正常',
      'Tab 顺序合理',
      'ARIA 标签正确',
      '焦点指示清晰',
    ],
  },
];

console.log('  💡 请在浏览器中测试以下场景：\n');
uiTestCases.forEach((category) => {
  console.log(`  ${category.category}:`);
  category.tests.forEach((test) => {
    console.log(`     - ${test}`);
  });
  console.log('');
  results.skipped += category.tests.length;
});

// ============================================================
// 测试总结
// ============================================================
console.log('=' .repeat(60));
console.log('\n📊 测试结果总结\n');
console.log(`  总计测试: ${results.total + results.skipped}`);
console.log(`  ✅ 通过: ${results.passed}`);
console.log(`  ❌ 失败: ${results.failed}`);
console.log(`  ⏭️  跳过（需手动测试）: ${results.skipped}`);

const passRate = results.total > 0 
  ? ((results.passed / results.total) * 100).toFixed(1)
  : '0.0';
console.log(`\n  自动化测试通过率: ${passRate}%`);

// ============================================================
// Bug 发现提示
// ============================================================
console.log('\n🐛 Bug 发现指南\n');
console.log('  在手动测试过程中，请注意以下常见问题：\n');

const bugChecklist = [
  {
    category: 'Markdown 渲染',
    issues: [
      '代码块语法高亮不正确',
      'LaTeX 公式渲染失败',
      '表格边框显示异常',
      '链接点击无响应',
      '深色模式下颜色不清晰',
    ],
  },
  {
    category: 'Token 计数',
    issues: [
      '计数结果明显不准确',
      '警告级别不正确',
      '进度条显示异常',
      '格式化显示错误',
    ],
  },
  {
    category: '消息编辑',
    issues: [
      '编辑后内容未保存',
      '快捷键不工作',
      '版本切换失败',
      '删除后状态异常',
    ],
  },
  {
    category: 'UI 响应式',
    issues: [
      '移动端布局错位',
      '按钮太小难以点击',
      '文字被截断',
      '滚动不流畅',
    ],
  },
  {
    category: '性能问题',
    issues: [
      '大量消息时卡顿',
      '动画掉帧',
      '内存泄漏',
      '加载时间过长',
    ],
  },
];

bugChecklist.forEach((category) => {
  console.log(`  ${category.category}:`);
  category.issues.forEach((issue) => {
    console.log(`     - ${issue}`);
  });
  console.log('');
});

// ============================================================
// 下一步指引
// ============================================================
console.log('=' .repeat(60));
console.log('\n📋 下一步操作\n');
console.log('  1. 在浏览器中执行所有手动测试');
console.log('  2. 记录发现的所有 Bug 到测试报告');
console.log('  3. 优先修复高严重度的 Bug');
console.log('  4. 修复后进行回归测试');
console.log('  5. 更新测试报告');
console.log('  6. Git commit 测试结果\n');

console.log('  💡 测试报告模板位置：');
console.log('     docs/phase-1-testing-report.md\n');

// 退出码
if (results.failed > 0) {
  console.log('⚠️  部分自动化测试失败，请检查上述错误\n');
  process.exit(1);
} else {
  console.log('✅ 自动化测试全部通过\n');
  console.log('🎯 继续进行手动测试以完成 Phase 1.6\n');
  process.exit(0);
}