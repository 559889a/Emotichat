import { NextRequest, NextResponse } from 'next/server'
import { loadRegexRules, saveRegexRules } from '@/lib/storage/regex-rules'
import type { RegexRule } from '@/types/regex'

function normalizeRule(input: RegexRule): RegexRule {
  const now = new Date().toISOString()
  return {
    ...input,
    id: input.id || crypto.randomUUID(),
    name: input.name || '未命名规则',
    replacement: input.replacement ?? '',
    flags: input.flags || 'g',
    mode: input.mode || 'rewrite',
    scopes: Array.isArray(input.scopes) && input.scopes.length > 0 ? input.scopes : ['user_input'],
    enabled: input.enabled !== false,
    minLayer: input.minLayer ?? null,
    maxLayer: input.maxLayer ?? null,
    createdAt: input.createdAt || now,
    updatedAt: now,
  }
}

export async function GET() {
  try {
    const rules = await loadRegexRules()
    return NextResponse.json({ success: true, data: rules })
  } catch (error) {
    console.error('[regex] failed to load rules', error)
    return NextResponse.json({ success: false, error: '加载正则规则失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const incoming: RegexRule[] = Array.isArray(body.rules) ? body.rules : []
    if (!incoming.length) {
      return NextResponse.json({ success: false, error: '规则列表不能为空' }, { status: 400 })
    }
    const normalized = incoming.map(normalizeRule)
    await saveRegexRules(normalized)
    return NextResponse.json({ success: true, data: normalized })
  } catch (error) {
    console.error('[regex] failed to save rules', error)
    return NextResponse.json({ success: false, error: '保存正则规则失败' }, { status: 500 })
  }
}
