import fs from 'fs/promises';
import path from 'path';
import { AppConfig } from '@/types';
import type { PromptPreset } from '@/types/prompt';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'config', 'app.json');
const CONFIG_DIR = path.join(process.cwd(), 'data', 'config');
const PRESETS_FILE = path.join(process.cwd(), 'data', 'config', 'presets.json');
const ACTIVE_PRESET_FILE = path.join(process.cwd(), 'data', 'config', 'active-preset.json');

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AppConfig = {
  modelProvider: 'openai',
  modelName: 'gpt-4',
  apiKeys: {
    openai: '',
    gemini: '',
    claude: '',
    xai: '',
  },
  customEndpoints: {
    openai: '',
    gemini: '',
    xai: '',
  },
};

/**
 * 确保配置目录存在
 */
async function ensureConfigDir(): Promise<void> {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 确保配置文件存在
 */
async function ensureConfigFile(): Promise<void> {
  await ensureConfigDir();
  
  try {
    await fs.access(CONFIG_FILE);
  } catch {
    // 配置文件不存在，创建默认配置
    await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  }
}

/**
 * 读取配置文件
 */
async function readConfig(): Promise<AppConfig> {
  try {
    await ensureConfigFile();
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content);
    
    // 合并默认配置，确保所有字段都存在
    return {
      ...DEFAULT_CONFIG,
      ...config,
      apiKeys: {
        ...DEFAULT_CONFIG.apiKeys,
        ...config.apiKeys,
      },
      customEndpoints: {
        ...DEFAULT_CONFIG.customEndpoints,
        ...config.customEndpoints,
      },
    };
  } catch (error) {
    console.error('Error reading config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 写入配置文件
 */
async function writeConfig(config: AppConfig): Promise<void> {
  try {
    await ensureConfigDir();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing config:', error);
    throw error;
  }
}

/**
 * 获取所有配置
 */
export async function getAllConfig(): Promise<AppConfig> {
  return readConfig();
}

/**
 * 获取配置项
 */
export async function getConfig<K extends keyof AppConfig>(
  key: K
): Promise<AppConfig[K]> {
  const config = await readConfig();
  return config[key];
}

/**
 * 设置配置项
 */
export async function setConfig<K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
): Promise<AppConfig> {
  try {
    const config = await readConfig();
    const updated = {
      ...config,
      [key]: value,
    };
    
    await writeConfig(updated);
    return updated;
  } catch (error) {
    console.error('Error setting config:', error);
    throw error;
  }
}

/**
 * 批量更新配置
 */
export async function updateConfig(
  updates: Partial<AppConfig>
): Promise<AppConfig> {
  try {
    const config = await readConfig();
    const updated: AppConfig = {
      ...config,
      ...updates,
      // 确保嵌套对象正确合并
      apiKeys: {
        ...config.apiKeys,
        ...(updates.apiKeys || {}),
      },
      customEndpoints: {
        ...config.customEndpoints,
        ...(updates.customEndpoints || {}),
      },
    };
    
    await writeConfig(updated);
    return updated;
  } catch (error) {
    console.error('Error updating config:', error);
    throw error;
  }
}

/**
 * 重置配置为默认值
 */
export async function resetConfig(): Promise<AppConfig> {
  try {
    await writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error resetting config:', error);
    throw error;
  }
}

/**
 * 获取特定 API 密钥
 */
export async function getApiKey(
  provider: keyof AppConfig['apiKeys']
): Promise<string> {
  const config = await readConfig();
  return config.apiKeys[provider] || '';
}

/**
 * 设置特定 API 密钥
 */
export async function setApiKey(
  provider: keyof AppConfig['apiKeys'],
  apiKey: string
): Promise<AppConfig> {
  const config = await readConfig();
  const updated = {
    ...config,
    apiKeys: {
      ...config.apiKeys,
      [provider]: apiKey,
    },
  };
  
  await writeConfig(updated);
  return updated;
}

/**
 * 获取自定义端点
 */
export async function getCustomEndpoint(
  provider: keyof AppConfig['customEndpoints']
): Promise<string> {
  const config = await readConfig();
  return config.customEndpoints[provider] || '';
}

/**
 * 设置自定义端点
 */
export async function setCustomEndpoint(
  provider: keyof AppConfig['customEndpoints'],
  endpoint: string
): Promise<AppConfig> {
  const config = await readConfig();
  const updated = {
    ...config,
    customEndpoints: {
      ...config.customEndpoints,
      [provider]: endpoint,
    },
  };
  
  await writeConfig(updated);
  return updated;
}

// ============================================================================
// 预设管理
// ============================================================================

/**
 * 加载所有预设
 */
export async function loadAllPresets(): Promise<PromptPreset[]> {
  try {
    await ensureConfigDir();
    const content = await fs.readFile(PRESETS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // 文件不存在或解析失败，返回空数组
    return [];
  }
}

/**
 * 保存预设
 */
export async function savePreset(preset: PromptPreset): Promise<void> {
  try {
    const presets = await loadAllPresets();
    const index = presets.findIndex((p) => p.id === preset.id);
    
    if (index >= 0) {
      // 更新现有预设
      presets[index] = preset;
    } else {
      // 添加新预设
      presets.push(preset);
    }
    
    await ensureConfigDir();
    await fs.writeFile(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving preset:', error);
    throw error;
  }
}

/**
 * 加载单个预设
 */
export async function loadPreset(id: string): Promise<PromptPreset | null> {
  try {
    const presets = await loadAllPresets();
    return presets.find((p) => p.id === id) || null;
  } catch (error) {
    console.error('Error loading preset:', error);
    return null;
  }
}

/**
 * 删除预设
 */
export async function deletePreset(id: string): Promise<void> {
  try {
    const presets = await loadAllPresets();
    const filtered = presets.filter((p) => p.id !== id && !p.isBuiltIn);
    
    await ensureConfigDir();
    await fs.writeFile(PRESETS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    
    // 如果删除的是活动预设，清除活动预设ID
    const activeId = await getActivePresetId();
    if (activeId === id) {
      await setActivePresetId(null);
    }
  } catch (error) {
    console.error('Error deleting preset:', error);
    throw error;
  }
}

/**
 * 获取活动预设ID
 */
export async function getActivePresetId(): Promise<string | null> {
  try {
    await ensureConfigDir();
    const content = await fs.readFile(ACTIVE_PRESET_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.activePresetId || null;
  } catch (error) {
    // 文件不存在或解析失败
    return null;
  }
}

/**
 * 设置活动预设ID
 */
export async function setActivePresetId(id: string | null): Promise<void> {
  try {
    await ensureConfigDir();
    await fs.writeFile(
      ACTIVE_PRESET_FILE,
      JSON.stringify({ activePresetId: id }, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Error setting active preset:', error);
    throw error;
  }
}

/**
 * 获取活动预设
 */
export async function getActivePreset(): Promise<PromptPreset | null> {
  try {
    const activeId = await getActivePresetId();
    if (!activeId) return null;
    
    return await loadPreset(activeId);
  } catch (error) {
    console.error('Error getting active preset:', error);
    return null;
  }
}