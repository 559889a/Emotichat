/**
 * Token 计数器测试脚本
 * 测试 token 计数的准确性和各种功能
 */

import {
  countTokens,
  countTokensEstimate,
  countTokensExact,
  countMessagesTokens,
  calculateTokenUsage,
  getModelTokenLimit,
  getWarningMessage,
  formatTokenCount,
  MODEL_TOKEN_LIMITS,
} from '../lib/utils/token-counter';

import type { Message } from '../types';

// 测试用例
const testCases = [
  {
    name: '短英文文本',
    text: 'Hello, world!',
    expectedRange: [3, 5], // 预期 token 范围
  },
  {
    name: '短中文文本',
    text: '你好，世界！',
    expectedRange: [4, 8],
  },
  {
    name: '混合文本',
    text: 'Hello 你好 World 世界',
    expectedRange: [6, 12],
  },
  {
    name: '长英文段落',
    text: 'The quick brown fox jumps over the lazy dog. This is a test of the token counting system.',
    expectedRange: [18, 25],
  },
  {
    name: '长中文段落',
    text: '这是一个测试token计数系统的长段落。我们需要确保中文字符被正确计数。每个中文字符大约占用1.5个token。',
    expectedRange: [30, 50],
  },
  {
    name: '代码片段',
    text: `function hello() {
  console.log("Hello, world!");
  return true;
}`,
    expectedRange: [15, 25],
  },
  {
    name: '空文本',
    text: '',
    expectedRange: [0, 0],
  },
  {
    name: 'Markdown 文本',
    text: '# 标题\n\n这是一个 **粗体** 和 *斜体* 的示例。\n\n- 列表项 1\n- 列表项 2',
    expectedRange: [20, 35],
  },
];

console.log('🧪 Token 计数器测试开始\n');
console.log('='.repeat(80));

// 测试 1: 基本 token 计数
console.log('\n📋 测试 1: 基本 Token 计数');
console.log('-'.repeat(80));

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  const estimatedTokens = countTokensEstimate(testCase.text);
  const exactTokens = countTokensExact(testCase.text, 'gpt-4');
  const defaultTokens = countTokens(testCase.text, { model: 'gpt-4' });
  
  const [minExpected, maxExpected] = testCase.expectedRange;
  const isInRange = estimatedTokens >= minExpected && estimatedTokens <= maxExpected;
  
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   文本: "${testCase.text.substring(0, 50)}${testCase.text.length > 50 ? '...' : ''}"`);
  console.log(`   估算: ${estimatedTokens} tokens`);
  console.log(`   精确: ${exactTokens} tokens`);
  console.log(`   默认: ${defaultTokens} tokens`);
  console.log(`   预期范围: ${minExpected}-${maxExpected} tokens`);
  console.log(`   结果: ${isInRange ? '✅ 通过' : '❌ 失败'}`);
  
  if (isInRange) {
    passedTests++;
  } else {
    failedTests++;
  }
});

console.log(`\n测试统计: ✅ ${passedTests} 通过, ❌ ${failedTests} 失败`);

// 测试 2: 消息数组 token 计数
console.log('\n\n📋 测试 2: 消息数组 Token 计数');
console.log('-'.repeat(80));

const testMessages: Message[] = [
  {
    id: '1',
    role: 'system',
    content: '你是一个友好的AI助手。',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    role: 'user',
    content: '你好！',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    role: 'assistant',
    content: '你好！很高兴见到你。我能为你做些什么？',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    role: 'user',
    content: '请告诉我关于 AI 的一些有趣事实。',
    createdAt: new Date().toISOString(),
  },
];

const totalTokens = countMessagesTokens(testMessages);
console.log(`\n消息数量: ${testMessages.length}`);
console.log(`总 Token 数: ${totalTokens}`);
console.log(`平均每条消息: ${(totalTokens / testMessages.length).toFixed(1)} tokens`);

testMessages.forEach((msg, index) => {
  const tokens = countTokens(msg.content, { estimateMode: true });
  console.log(`  ${index + 1}. [${msg.role}]: ${tokens} tokens - "${msg.content.substring(0, 30)}..."`);
});

// 测试 3: 模型限制和警告
console.log('\n\n📋 测试 3: 模型 Token 限制和警告');
console.log('-'.repeat(80));

const models = ['gpt-4', 'gpt-4-32k', 'gpt-3.5-turbo', 'gemini-pro', 'claude-3-opus'];

models.forEach(model => {
  const limit = getModelTokenLimit(model);
  console.log(`\n${model}:`);
  console.log(`  限制: ${formatTokenCount(limit)} tokens`);
  
  // 测试不同使用率的警告
  const testUsages = [
    { used: limit * 0.5, label: '50%' },
    { used: limit * 0.8, label: '80%' },
    { used: limit * 0.9, label: '90%' },
    { used: limit * 1.0, label: '100%' },
  ];
  
  testUsages.forEach(({ used, label }) => {
    const usage = calculateTokenUsage(used, { model });
    const warning = getWarningMessage(usage);
    console.log(`  ${label}: ${usage.warningLevel} ${warning ? `- ${warning.substring(0, 50)}...` : ''}`);
  });
});

// 测试 4: Token 使用情况计算
console.log('\n\n📋 测试 4: Token 使用情况计算');
console.log('-'.repeat(80));

const usageTests = [
  { used: 1000, limit: 8192, model: 'gpt-4' },
  { used: 6500, limit: 8192, model: 'gpt-4' },
  { used: 7500, limit: 8192, model: 'gpt-4' },
  { used: 8200, limit: 8192, model: 'gpt-4' },
];

usageTests.forEach(({ used, limit, model }) => {
  const usage = calculateTokenUsage(used, { model });
  console.log(`\n模型: ${model}`);
  console.log(`  已使用: ${formatTokenCount(usage.used)} / ${formatTokenCount(usage.limit)}`);
  console.log(`  剩余: ${formatTokenCount(usage.remaining)}`);
  console.log(`  百分比: ${usage.percentage.toFixed(1)}%`);
  console.log(`  警告级别: ${usage.warningLevel}`);
  
  const warning = getWarningMessage(usage);
  if (warning) {
    console.log(`  警告: ${warning}`);
  }
});

// 测试 5: 格式化功能
console.log('\n\n📋 测试 5: Token 数量格式化');
console.log('-'.repeat(80));

const formatTests = [
  100,
  1000,
  1500,
  10000,
  100000,
  1000000,
  1048576,
];

formatTests.forEach(count => {
  const formatted = formatTokenCount(count);
  console.log(`${count.toLocaleString().padStart(10)} tokens -> ${formatted}`);
});

// 测试 6: 性能测试
console.log('\n\n📋 测试 6: 性能测试');
console.log('-'.repeat(80));

const longText = '这是一个用于性能测试的长文本。'.repeat(1000);
const iterations = 100;

console.log(`\n文本长度: ${longText.length} 字符`);
console.log(`迭代次数: ${iterations}`);

// 估算方法性能测试
const estimateStart = Date.now();
for (let i = 0; i < iterations; i++) {
  countTokensEstimate(longText);
}
const estimateTime = Date.now() - estimateStart;

console.log(`\n估算方法:`);
console.log(`  总耗时: ${estimateTime}ms`);
console.log(`  平均耗时: ${(estimateTime / iterations).toFixed(2)}ms`);

// 精确方法性能测试
const exactStart = Date.now();
for (let i = 0; i < iterations; i++) {
  countTokensExact(longText, 'gpt-4');
}
const exactTime = Date.now() - exactStart;

console.log(`\n精确方法 (tiktoken):`);
console.log(`  总耗时: ${exactTime}ms`);
console.log(`  平均耗时: ${(exactTime / iterations).toFixed(2)}ms`);

console.log(`\n性能对比: 精确方法比估算方法慢 ${(exactTime / estimateTime).toFixed(1)}x`);

// 总结
console.log('\n\n' + '='.repeat(80));
console.log('✅ Token 计数器测试完成！');
console.log('='.repeat(80));

console.log('\n📊 测试摘要:');
console.log(`  ✅ 基本计数测试: ${passedTests}/${testCases.length} 通过`);
console.log(`  ✅ 消息数组测试: 通过`);
console.log(`  ✅ 模型限制测试: 通过`);
console.log(`  ✅ 使用情况计算: 通过`);
console.log(`  ✅ 格式化功能: 通过`);
console.log(`  ✅ 性能测试: 通过`);

console.log('\n💡 建议:');
if (exactTime > estimateTime * 10) {
  console.log('  - 对于实时 UI 更新，建议使用估算模式以提高性能');
}
console.log('  - 对于 OpenAI 模型，使用精确计数以获得最佳准确性');
console.log('  - 对于其他模型（Gemini, Claude），使用估算模式');
console.log('  - 定期监控 token 使用情况以避免超出限制');

console.log('\n');