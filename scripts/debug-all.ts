/**
 * Debug Project - 综合测试脚本
 * 运行所有测试并生成报告
 */

import { execSync } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  output?: string
}

const tests: TestResult[] = []

async function runTest(name: string, command: string): Promise<void> {
  console.log(`\n🧪 测试: ${name}`)
  console.log(`   命令: ${command}`)
  const startTime = Date.now()
  
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      cwd: path.resolve(__dirname, '..'),
      timeout: 60000 // 60秒超时
    })
    const duration = Date.now() - startTime
    tests.push({ name, passed: true, duration, output })
    console.log(`✅ ${name} - 通过 (${duration}ms)`)
  } catch (error: any) {
    const duration = Date.now() - startTime
    tests.push({ 
      name, 
      passed: false, 
      duration,
      error: error.message,
      output: error.stdout || error.stderr || ''
    })
    console.log(`❌ ${name} - 失败 (${duration}ms)`)
    console.log(`   错误: ${error.message}`)
  }
}

function generateReport(tests: TestResult[]): string {
  const passed = tests.filter(t => t.passed).length
  const failed = tests.filter(t => !t.passed).length
  const total = tests.length
  const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0'
  
  let report = `# Debug Project 测试报告\n\n`
  report += `**测试日期**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`
  report += `**测试范围**: Phase 0 - Phase 2.1\n\n`
  report += `## 测试概览\n\n`
  report += `| 指标 | 数值 |\n`
  report += `|------|------|\n`
  report += `| 总计测试 | ${total} 个 |\n`
  report += `| 通过 | ${passed} 个 ✅ |\n`
  report += `| 失败 | ${failed} 个 ❌ |\n`
  report += `| 通过率 | ${passRate}% |\n\n`
  
  report += `## 测试详情\n\n`
  
  // 通过的测试
  const passedTests = tests.filter(t => t.passed)
  if (passedTests.length > 0) {
    report += `### ✅ 通过的测试\n\n`
    passedTests.forEach(test => {
      report += `#### ${test.name}\n`
      report += `- 耗时: ${test.duration}ms\n`
      report += `\n`
    })
  }
  
  // 失败的测试
  const failedTests = tests.filter(t => !t.passed)
  if (failedTests.length > 0) {
    report += `### ❌ 失败的测试\n\n`
    failedTests.forEach(test => {
      report += `#### ${test.name}\n`
      report += `- 耗时: ${test.duration}ms\n`
      report += `- 错误: \n\`\`\`\n${test.error}\n\`\`\`\n`
      if (test.output) {
        report += `- 输出:\n\`\`\`\n${test.output.substring(0, 1000)}\n\`\`\`\n`
      }
      report += `\n`
    })
  }
  
  report += `## 下一步建议\n\n`
  if (failed > 0) {
    report += `1. 修复失败的测试用例\n`
    report += `2. 运行手动功能测试验证修复\n`
    report += `3. 更新 bugs.md 记录发现的问题\n`
  } else {
    report += `1. 所有自动化测试已通过\n`
    report += `2. 建议进行手动功能测试\n`
    report += `3. 检查边缘案例和性能问题\n`
  }
  
  return report
}

async function main() {
  console.log('🚀 开始 Debug Project 综合测试...\n')
  console.log('=' .repeat(50))
  
  // 1. TypeScript 编译检查
  await runTest('TypeScript 编译检查', 'npx tsc --noEmit')
  
  // 2. 运行现有测试脚本
  await runTest('Phase 0 提示词集成测试', 'npx tsx scripts/test-prompt-integration.ts')
  await runTest('后处理器测试', 'npx tsx scripts/test-post-processor.ts')
  await runTest('Token 计数器测试', 'npx tsx scripts/test-token-counter.ts')
  await runTest('文件锁测试', 'npx tsx scripts/test-file-lock.ts')
  await runTest('Phase 1 集成测试', 'npx tsx scripts/test-phase-1-integration.ts')
  
  console.log('\n' + '=' .repeat(50))
  console.log('📊 测试完成！\n')
  
  // 生成报告
  const report = generateReport(tests)
  const reportPath = path.resolve(__dirname, '../docs/debug-report.md')
  await fs.writeFile(reportPath, report)
  
  console.log(`📄 报告已生成：docs/debug-report.md`)
  
  // 打印摘要
  const passed = tests.filter(t => t.passed).length
  const failed = tests.filter(t => !t.passed).length
  console.log(`\n📊 测试摘要: ${passed} 通过, ${failed} 失败`)
  
  if (failed > 0) {
    console.log('\n⚠️ 有测试失败，请查看报告获取详细信息。')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('测试脚本执行失败:', error)
  process.exit(1)
})