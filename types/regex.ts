export type RegexScope = 'user_input' | 'ai_output'

export type RegexMode = 'rewrite' | 'display_only' | 'prompt_only' | 'display_and_prompt'

export interface RegexRule {
  id: string
  name: string
  description?: string
  pattern: string
  flags?: string
  replacement: string
  scopes: RegexScope[]
  mode: RegexMode
  minLayer?: number | null
  maxLayer?: number | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RegexTestResult {
  content: string
  displayContent?: string
  matchedRuleIds: string[]
}
