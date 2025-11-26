import type { RuntimeVariables } from '@/types/prompt'

export interface ToolContext {
  conversationId?: string
  characterId?: string
  runtime?: RuntimeVariables
}

export interface ToolDescriptor {
  id: string
  name: string
  description: string
  parameters: Record<string, any>
  handler: (input: Record<string, any>, context?: ToolContext) => Promise<any>
  enabled: boolean
  tags?: string[]
}

function safeEvalMath(expression: string): number {
  const sanitized = expression.replace(/[^-+*/().0-9\s]/g, '')
  // eslint-disable-next-line no-new-func
  const fn = new Function(`return (${sanitized || 0})`)
  return Number(fn())
}

const builtInTools: ToolDescriptor[] = [
  {
    id: 'calculator',
    name: '轻量计算器',
    description: '计算四则运算表达式，支持括号。',
    parameters: {
      type: 'object',
      properties: { expression: { type: 'string', description: '待计算的数学表达式' } },
      required: ['expression'],
    },
    handler: async (input) => {
      const value = safeEvalMath(String(input.expression || '0'))
      return { value }
    },
    enabled: true,
    tags: ['utility'],
  },
  {
    id: 'time_lookup',
    name: '当前时间',
    description: '返回当前的本地时间（精确到分钟）。',
    parameters: { type: 'object', properties: {} },
    handler: async (_, context) => {
      return { time: context?.runtime?.time || new Date().toISOString() }
    },
    enabled: true,
    tags: ['context'],
  },
  {
    id: 'device_info',
    name: '设备信息',
    description: '返回当前设备类型与来源，用于上下文补充。',
    parameters: { type: 'object', properties: {} },
    handler: async (_, context) => {
      return { device: context?.runtime?.deviceInfo || 'unknown' }
    },
    enabled: true,
    tags: ['context'],
  },
]

export function listTools(enabledOnly = false): ToolDescriptor[] {
  return builtInTools.filter((tool) => (enabledOnly ? tool.enabled : true))
}

export async function executeTool(
  id: string,
  payload: Record<string, any>,
  context?: ToolContext
): Promise<any> {
  const tool = builtInTools.find((t) => t.id === id && t.enabled)
  if (!tool) {
    throw new Error(`Tool ${id} not found or disabled`)
  }
  return tool.handler(payload, context)
}
