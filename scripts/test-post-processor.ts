/**
 * 后处理器测试脚本
 * 
 * 运行方式：
 * npx tsx emotichat/scripts/test-post-processor.ts
 */

import {
  postProcess,
  filterEmptyMessages,
  deduplicateMessages,
  mergeConsecutiveMessages,
  checkMessageLength,
  truncateMessage,
  advancedPostProcess,
  DEFAULT_POST_PROCESS_CONFIG,
} from '../lib/prompt/post-processor';
import type { ProcessedPromptMessage, PostProcessConfig } from '../types';

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function testCase(name: string, passed: boolean) {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status}: ${name}`, color);
}

// ============================================================================
// 测试案例
// ============================================================================

/**
 * 测试1: 基础格式化
 */
function testBasicFormatting() {
  testSection('测试1: 基础格式化');
  
  const input = '  Hello\r\nWorld  \n\n\n\nTest  ';
  const result = postProcess(input);
  const expected = 'Hello\nWorld\n\nTest';
  
  console.log('输入:', JSON.stringify(input));
  console.log('输出:', JSON.stringify(result));
  console.log('期望:', JSON.stringify(expected));
  
  testCase('去除首尾空白', result.trim() === expected.trim());
  testCase('规范化换行符', !result.includes('\r'));
  testCase('去除多余空行', result.split('\n\n\n').length === 1);
  testCase('去除行尾空白', !result.split('\n').some(line => line !== line.trimEnd()));
}

/**
 * 测试2: 空消息过滤
 */
function testEmptyFilter() {
  testSection('测试2: 空消息过滤');
  
  const messages: ProcessedPromptMessage[] = [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: '   ' },
    { role: 'assistant', content: 'Hello!' },
    { role: 'user', content: '' },
    { role: 'assistant', content: 'How can I help?' },
  ];
  
  const result = filterEmptyMessages(messages);
  
  console.log('输入消息数:', messages.length);
  console.log('输出消息数:', result.length);
  console.log('过滤掉的消息:', messages.length - result.length);
  
  testCase('正确过滤空消息', result.length === 3);
  testCase('保留有内容的消息', result.every(msg => msg.content.trim().length > 0));
}

/**
 * 测试3: 消息去重
 */
function testDeduplication() {
  testSection('测试3: 消息去重');
  
  const messages: ProcessedPromptMessage[] = [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'Hello' },
    { role: 'user', content: 'Hello' }, // 重复
    { role: 'assistant', content: 'Hi!' },
    { role: 'assistant', content: 'Hi!' }, // 重复
    { role: 'user', content: 'How are you?' },
  ];
  
  const result = deduplicateMessages(messages);
  
  console.log('输入消息数:', messages.length);
  console.log('输出消息数:', result.length);
  console.log('去重数量:', messages.length - result.length);
  
  testCase('正确去重', result.length === 4);
  testCase('保留顺序', result[0].content === 'System prompt');
  testCase('保留不重复消息', result[result.length - 1].content === 'How are you?');
}

/**
 * 测试4: 消息去重（考虑 adaptedRole）
 */
function testDeduplicationWithAdaptedRole() {
  testSection('测试4: 消息去重（含 adaptedRole）');
  
  const messages: ProcessedPromptMessage[] = [
    { role: 'system', content: 'System', adaptedRole: 'system' },
    { role: 'assistant', content: 'Hello', adaptedRole: 'model' },
    { role: 'assistant', content: 'Hello', adaptedRole: 'model' }, // 重复
    { role: 'user', content: 'Hi', adaptedRole: 'user' },
  ];
  
  const result = deduplicateMessages(messages);
  
  console.log('输入消息数:', messages.length);
  console.log('输出消息数:', result.length);
  
  testCase('考虑 adaptedRole 去重', result.length === 3);
}

/**
 * 测试5: 消息合并
 */
function testMerging() {
  testSection('测试5: 消息合并');
  
  const messages: ProcessedPromptMessage[] = [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'Part 1' },
    { role: 'user', content: 'Part 2' },
    { role: 'user', content: 'Part 3' },
    { role: 'assistant', content: 'Response 1' },
    { role: 'assistant', content: 'Response 2' },
    { role: 'user', content: 'Next question' },
  ];
  
  const result = mergeConsecutiveMessages(messages);
  
  console.log('输入消息数:', messages.length);
  console.log('输出消息数:', result.length);
  console.log('合并结果:');
  result.forEach((msg, i) => {
    console.log(`  [${i}] ${msg.role}: ${msg.content.substring(0, 50)}...`);
  });
  
  testCase('正确合并连续同角色消息', result.length === 4);
  testCase('合并内容包含分隔符', result[1].content.includes('\n\n'));
}

/**
 * 测试6: 长度检查
 */
function testLengthCheck() {
  testSection('测试6: 长度检查');
  
  const message: ProcessedPromptMessage = {
    role: 'user',
    content: 'A'.repeat(1000),
  };
  
  const check1 = checkMessageLength(message, 500);
  const check2 = checkMessageLength(message, 2000);
  
  console.log('消息长度:', message.content.length);
  console.log('检查1 (限制500):', check1);
  console.log('检查2 (限制2000):', check2);
  
  testCase('正确检测超长', check1.exceeded === true);
  testCase('正确检测未超长', check2.exceeded === false);
  testCase('返回正确长度', check1.length === 1000);
}

/**
 * 测试7: 消息截断
 */
function testTruncation() {
  testSection('测试7: 消息截断');
  
  const message: ProcessedPromptMessage = {
    role: 'user',
    content: 'A'.repeat(1000),
  };
  
  const truncated = truncateMessage(message, 100);
  
  console.log('原始长度:', message.content.length);
  console.log('截断后长度:', truncated.content.length);
  console.log('截断内容:', truncated.content);
  
  testCase('正确截断长度', truncated.content.length === 100);
  testCase('包含截断标记', truncated.content.endsWith('...[truncated]'));
}

/**
 * 测试8: 高级后处理（完整流程）
 */
function testAdvancedPostProcess() {
  testSection('测试8: 高级后处理（完整流程）');
  
  const messages: ProcessedPromptMessage[] = [
    { role: 'system', content: '  System prompt  \n\n\n\n' },
    { role: 'user', content: '   ' }, // 空消息
    { role: 'user', content: 'Hello' },
    { role: 'user', content: 'Hello' }, // 重复
    { role: 'assistant', content: 'Hi!\nHow can I help?' },
    { role: 'assistant', content: 'What do you need?' }, // 可合并
    { role: 'user', content: 'A'.repeat(5000) }, // 超长
  ];
  
  const config: PostProcessConfig = {
    enableDeduplication: true,
    enableEmptyFilter: true,
    enableMerging: true,
    enableFormatting: true,
    enableLengthCheck: true,
    maxMessageLength: 1000,
    lengthExceededStrategy: 'warn',
  };
  
  const result = advancedPostProcess(messages, config);
  
  console.log('输入消息数:', messages.length);
  console.log('输出消息数:', result.messages.length);
  console.log('警告信息:');
  result.warnings.forEach(w => console.log(`  - ${w}`));
  
  console.log('\n处理后的消息:');
  result.messages.forEach((msg, i) => {
    const preview = msg.content.substring(0, 50);
    console.log(`  [${i}] ${msg.role}: ${preview}${msg.content.length > 50 ? '...' : ''}`);
  });
  
  testCase('执行了所有后处理步骤', result.warnings.length > 0);
  testCase('格式化生效', !result.messages[0].content.includes('\n\n\n'));
  testCase('过滤空消息', result.messages.every(m => m.content.trim().length > 0));
  testCase('生成警告信息', result.warnings.some(w => w.includes('超长')));
}

/**
 * 测试9: 默认配置
 */
function testDefaultConfig() {
  testSection('测试9: 默认配置');
  
  console.log('默认配置:');
  console.log(JSON.stringify(DEFAULT_POST_PROCESS_CONFIG, null, 2));
  
  testCase('启用去重', DEFAULT_POST_PROCESS_CONFIG.enableDeduplication === true);
  testCase('启用空消息过滤', DEFAULT_POST_PROCESS_CONFIG.enableEmptyFilter === true);
  testCase('禁用合并', DEFAULT_POST_PROCESS_CONFIG.enableMerging === false);
  testCase('启用格式化', DEFAULT_POST_PROCESS_CONFIG.enableFormatting === true);
  testCase('启用长度检查', DEFAULT_POST_PROCESS_CONFIG.enableLengthCheck === true);
}

/**
 * 测试10: 自定义配置覆盖
 */
function testCustomConfig() {
  testSection('测试10: 自定义配置覆盖');
  
  const messages: ProcessedPromptMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'user', content: 'Hello' }, // 重复
  ];
  
  const customConfig: PostProcessConfig = {
    enableDeduplication: false, // 禁用去重
  };
  
  const result = advancedPostProcess(messages, customConfig);
  
  console.log('输入消息数:', messages.length);
  console.log('输出消息数:', result.messages.length);
  
  testCase('自定义配置生效（禁用去重）', result.messages.length === 2);
}

// ============================================================================
// 运行所有测试
// ============================================================================

function runAllTests() {
  log('\n后处理器测试开始\n', 'blue');
  
  try {
    testBasicFormatting();
    testEmptyFilter();
    testDeduplication();
    testDeduplicationWithAdaptedRole();
    testMerging();
    testLengthCheck();
    testTruncation();
    testAdvancedPostProcess();
    testDefaultConfig();
    testCustomConfig();
    
    log('\n所有测试完成！', 'green');
  } catch (error) {
    log('\n测试执行出错:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
runAllTests();