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
 * 加载单个预设（仅从用户预设文件加载）
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

    // 防止删除最后一个预设
    if (presets.length <= 1) {
      throw new Error('Cannot delete the last preset. At least one preset must exist.');
    }

    const presetToDelete = presets.find(p => p.id === id);
    if (!presetToDelete) {
      throw new Error(`Preset ${id} not found`);
    }

    const wasActive = presetToDelete.isActive === true;
    const filtered = presets.filter((p) => p.id !== id);

    // 如果删除的是活动预设，激活第一个剩余的预设
    if (wasActive && filtered.length > 0) {
      filtered[0].isActive = true;
    }

    await ensureConfigDir();
    await fs.writeFile(PRESETS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
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
    const presets = await loadAllPresets();
    const activePreset = presets.find(p => p.isActive === true);
    return activePreset?.id || null;
  } catch (error) {
    console.error('Error getting active preset ID:', error);
    return null;
  }
}

/**
 * 激活预设（全局唯一激活策略）
 */
export async function activatePreset(id: string): Promise<void> {
  try {
    const presets = await loadAllPresets();
    const presetToActivate = presets.find(p => p.id === id);

    if (!presetToActivate) {
      throw new Error(`Preset ${id} not found`);
    }

    // 停用所有预设，激活目标预设
    const updatedPresets = presets.map(p => ({
      ...p,
      isActive: p.id === id,
    }));

    await ensureConfigDir();
    await fs.writeFile(PRESETS_FILE, JSON.stringify(updatedPresets, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error activating preset:', error);
    throw error;
  }
}

/**
 * 获取活动预设
 */
export async function getActivePreset(): Promise<PromptPreset | null> {
  try {
    const presets = await loadAllPresets();
    const activePreset = presets.find(p => p.isActive === true);
    return activePreset || null;
  } catch (error) {
    console.error('Error getting active preset:', error);
    return null;
  }
}

/**
 * 设置活动预设ID（兼容旧接口，内部调用 activatePreset）
 * @deprecated Use activatePreset instead
 */
export async function setActivePresetId(id: string | null): Promise<void> {
  if (id) {
    await activatePreset(id);
  }
}