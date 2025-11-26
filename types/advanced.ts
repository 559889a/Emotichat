export interface FunctionCallProfile {
  id: string
  name: string
  description?: string
  enabledTools: string[]
  autoInvoke?: boolean
  resultPlacement?: 'inline' | 'panel'
}

export interface McpServerConfig {
  id: string
  name: string
  /** 传统 HTTP 端点模式 */
  endpoint?: string
  token?: string
  /** stdio 模式：可执行命令 */
  command?: string
  /** stdio 模式：命令参数 */
  args?: string[]
  /** 环境变量 */
  env?: Record<string, string>
  enabled: boolean
  /** AI 是否可自动调用此服务器（无需用户确认） */
  autoApprove?: boolean
  capabilities?: string[]
}

export interface JsRuntimeConfig {
  enabled: boolean
  sandboxLevel: 'strict' | 'balanced' | 'open'
  allowNetwork: boolean
  maxExecutionMs: number
  exposedAPIs: string[]
}

export interface AdvancedFeatureConfig {
  functionCalling: {
    enabled: boolean
    profileId?: string
    profiles: FunctionCallProfile[]
  }
  mcp: {
    enabled: boolean
    servers: McpServerConfig[]
  }
  javascript: JsRuntimeConfig
}
