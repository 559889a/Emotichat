import fs from 'fs/promises'
import path from 'path'
import { getRuntimePaths } from '@/config/runtime'
import type { RegexRule } from '@/types/regex'

const { dataDir } = getRuntimePaths()
const CONFIG_DIR = path.join(dataDir, 'config')
const REGEX_FILE = path.join(CONFIG_DIR, 'regex-rules.json')

async function ensureConfigDir() {
  try {
    await fs.access(CONFIG_DIR)
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true })
  }
}

async function ensureRegexFile() {
  await ensureConfigDir()
  try {
    await fs.access(REGEX_FILE)
  } catch {
    await fs.writeFile(REGEX_FILE, JSON.stringify([], null, 2), 'utf-8')
  }
}

export async function loadRegexRules(): Promise<RegexRule[]> {
  await ensureRegexFile()
  try {
    const raw = await fs.readFile(REGEX_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as RegexRule[]
    return parsed.map((rule) => ({
      ...rule,
      flags: rule.flags || 'g',
      mode: rule.mode || 'rewrite',
    }))
  } catch (error) {
    console.error('[regex] failed to read rules, returning empty', error)
    return []
  }
}

export async function saveRegexRules(rules: RegexRule[]): Promise<RegexRule[]> {
  await ensureRegexFile()
  await fs.writeFile(REGEX_FILE, JSON.stringify(rules, null, 2), 'utf-8')
  return rules
}
