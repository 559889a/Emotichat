import vm from 'vm'

export interface ScriptExecutionOptions {
  timeoutMs?: number
  allowNetwork?: boolean
}

export interface ScriptExecutionResult {
  result?: any
  logs: string[]
  error?: string
  durationMs: number
}

export function runSandboxedScript(
  code: string,
  injected: Record<string, any> = {},
  options: ScriptExecutionOptions = {}
): ScriptExecutionResult {
  const logs: string[] = []
  const sandbox = {
    console: {
      log: (...args: any[]) => logs.push(args.map(String).join(' ')),
      warn: (...args: any[]) => logs.push('[warn] ' + args.map(String).join(' ')),
      error: (...args: any[]) => logs.push('[error] ' + args.map(String).join(' ')),
    },
    ...injected,
  }

  const vmContext = vm.createContext(sandbox, { name: 'emotichat-js-runtime' })
  const start = performance.now()
  try {
    const script = new vm.Script(code)
    const result = script.runInContext(vmContext, {
      timeout: options.timeoutMs ?? 600,
    })
    return { result, logs, durationMs: performance.now() - start }
  } catch (error) {
    return {
      logs,
      error: error instanceof Error ? error.message : '执行失败',
      durationMs: performance.now() - start,
    }
  }
}
