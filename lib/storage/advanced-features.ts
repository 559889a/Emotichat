import fs from 'fs/promises'
import path from 'path'
import { getRuntimePaths } from '@/config/runtime'
import type { AdvancedFeatureConfig } from '@/types/advanced'

const { dataDir } = getRuntimePaths()
const CONFIG_DIR = path.join(dataDir, 'config')
const ADVANCED_FILE = path.join(CONFIG_DIR, 'advanced-features.json')

const DEFAULT_ADVANCED_CONFIG: AdvancedFeatureConfig = {
  functionCalling: {
    enabled: false,
    profileId: 'default',
    profiles: [
      {
        id: 'default',
        name: '默认工具包',
        description: '基础计算与信息查询工具集',
        enabledTools: ['calculator', 'time_lookup', 'device_info'],
        autoInvoke: false,
        resultPlacement: 'inline',
      },
    ],
  },
  mcp: {
    enabled: false,
    servers: [],
  },
  javascript: {
    enabled: false,
    sandboxLevel: 'balanced',
    allowNetwork: false,
    maxExecutionMs: 800,
    exposedAPIs: ['console', 'Date', 'setTimeout', 'clearTimeout'],
  },
}

async function ensureConfigDir() {
  try {
    await fs.access(CONFIG_DIR)
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true })
  }
}

async function ensureAdvancedFile() {
  await ensureConfigDir()
  try {
    await fs.access(ADVANCED_FILE)
  } catch {
    await fs.writeFile(ADVANCED_FILE, JSON.stringify(DEFAULT_ADVANCED_CONFIG, null, 2), 'utf-8')
  }
}

export async function getAdvancedFeatures(): Promise<AdvancedFeatureConfig> {
  await ensureAdvancedFile()
  try {
    const raw = await fs.readFile(ADVANCED_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_ADVANCED_CONFIG,
      ...parsed,
      functionCalling: {
        ...DEFAULT_ADVANCED_CONFIG.functionCalling,
        ...parsed.functionCalling,
        profiles: parsed.functionCalling?.profiles || DEFAULT_ADVANCED_CONFIG.functionCalling.profiles,
      },
      mcp: {
        ...DEFAULT_ADVANCED_CONFIG.mcp,
        ...parsed.mcp,
      },
      javascript: {
        ...DEFAULT_ADVANCED_CONFIG.javascript,
        ...parsed.javascript,
      },
    }
  } catch (error) {
    console.error('[advanced-features] failed to read config, using defaults', error)
    return DEFAULT_ADVANCED_CONFIG
  }
}

export async function saveAdvancedFeatures(config: AdvancedFeatureConfig): Promise<AdvancedFeatureConfig> {
  await ensureAdvancedFile()
  await fs.writeFile(ADVANCED_FILE, JSON.stringify(config, null, 2), 'utf-8')
  return config
}

export async function updateAdvancedFeatures(updates: Partial<AdvancedFeatureConfig>): Promise<AdvancedFeatureConfig> {
  const current = await getAdvancedFeatures()
  const next: AdvancedFeatureConfig = {
    ...current,
    ...updates,
    functionCalling: {
      ...current.functionCalling,
      ...(updates.functionCalling || {}),
      profiles: updates.functionCalling?.profiles || current.functionCalling.profiles,
    },
    mcp: {
      ...current.mcp,
      ...(updates.mcp || {}),
    },
    javascript: {
      ...current.javascript,
      ...(updates.javascript || {}),
    },
  }
  await saveAdvancedFeatures(next)
  return next
}
