import type { RegexMode, RegexRule, RegexScope, RegexTestResult } from '@/types/regex'

export interface RegexContext {
  scope: RegexScope
  layer?: number
}

function isLayerAllowed(rule: RegexRule, layer?: number): boolean {
  if (layer === undefined || layer === null) return true
  if (rule.minLayer !== undefined && rule.minLayer !== null && layer < rule.minLayer) return false
  if (rule.maxLayer !== undefined && rule.maxLayer !== null && layer > rule.maxLayer) return false
  return true
}

function buildRegex(pattern: string, flags?: string) {
  try {
    return new RegExp(pattern, flags || 'g')
  } catch (error) {
    console.error('[regex] invalid pattern skipped:', pattern, error)
    return null
  }
}

export function applyRegexRules(
  text: string,
  rules: RegexRule[],
  context: RegexContext
): RegexTestResult {
  let content = text
  let displayContent = text
  const matchedRuleIds: string[] = []

  for (const rule of rules) {
    if (!rule.enabled) continue
    if (!rule.scopes?.includes(context.scope)) continue
    if (!isLayerAllowed(rule, context.layer)) continue

    const regex = buildRegex(rule.pattern, rule.flags)
    if (!regex) continue

    const replacement = rule.replacement ?? ''
    const mode: RegexMode = rule.mode || 'rewrite'

    try {
      if (mode === 'rewrite') {
        content = content.replace(regex, replacement)
        displayContent = displayContent.replace(regex, replacement)
      } else if (mode === 'prompt_only') {
        content = content.replace(regex, replacement)
      } else if (mode === 'display_only') {
        displayContent = displayContent.replace(regex, replacement)
      } else if (mode === 'display_and_prompt') {
        content = content.replace(regex, replacement)
        displayContent = displayContent.replace(regex, replacement)
      }
      matchedRuleIds.push(rule.id)
    } catch (error) {
      console.error('[regex] failed to apply rule', rule.id, error)
    }
  }

  return {
    content,
    displayContent: displayContent !== text ? displayContent : undefined,
    matchedRuleIds,
  }
}
