import fs from 'fs/promises';
import path from 'path';
import { AppConfig } from '@/types';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'config', 'app.json');
const CONFIG_DIR = path.join(process.cwd(), 'data', 'config');

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