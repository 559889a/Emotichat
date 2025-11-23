/**
 * 自定义端点管理
 * 支持用户添加 OpenAI/Gemini/Claude 兼容的自定义端点
 */

import type { CustomProvider, ModelProvider, ProtocolType } from './types';

// 本地存储 key
const STORAGE_KEY = 'emotichat_custom_providers';

/**
 * 获取所有自定义端点
 */
export function getCustomProviders(): CustomProvider[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const providers = JSON.parse(stored) as CustomProvider[];
    return providers.filter(p => p.enabled !== false);
  } catch (error) {
    console.error('Failed to load custom providers:', error);
    return [];
  }
}

/**
 * 保存自定义端点列表
 */
function saveCustomProviders(providers: CustomProvider[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  } catch (error) {
    console.error('Failed to save custom providers:', error);
    throw error;
  }
}

/**
 * 添加自定义端点
 */
export function addCustomProvider(
  provider: Omit<CustomProvider, 'id' | 'createdAt' | 'updatedAt'>
): CustomProvider {
  const providers = getCustomProviders();
  
  // 生成唯一 ID
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const newProvider: CustomProvider = {
    ...provider,
    id,
    enabled: provider.enabled !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  providers.push(newProvider);
  saveCustomProviders(providers);
  
  return newProvider;
}

/**
 * 更新自定义端点
 */
export function updateCustomProvider(
  id: string,
  updates: Partial<Omit<CustomProvider, 'id' | 'createdAt'>>
): CustomProvider | null {
  const providers = getCustomProviders();
  const index = providers.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  providers[index] = {
    ...providers[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  saveCustomProviders(providers);
  return providers[index];
}

/**
 * 删除自定义端点
 */
export function deleteCustomProvider(id: string): boolean {
  const providers = getCustomProviders();
  const filtered = providers.filter(p => p.id !== id);
  
  if (filtered.length === providers.length) return false;
  
  saveCustomProviders(filtered);
  return true;
}

/**
 * 启用/禁用自定义端点
 */
export function toggleCustomProvider(id: string, enabled: boolean): boolean {
  return updateCustomProvider(id, { enabled }) !== null;
}

/**
 * 将自定义端点转换为 ModelProvider 格式
 */
export function customProviderToModelProvider(custom: CustomProvider): ModelProvider {
  return {
    id: custom.id,
    name: custom.name,
    type: custom.protocol === 'openai' ? 'openai' : 
          custom.protocol === 'gemini' ? 'google' : 'anthropic',
    isOfficial: false,
    isCustom: true,
    baseUrl: custom.baseUrl,
    apiKey: custom.apiKey,
    requiresApiKey: true,
    models: custom.models.map(modelId => ({
      id: modelId,
      name: modelId,
      provider: custom.id,
      contextWindow: 4096, // 默认值，用户可能无法获取准确值
      description: `自定义模型 (${custom.protocol} 协议)`,
    })),
  };
}

/**
 * 获取所有自定义端点（ModelProvider 格式）
 */
export function getCustomProvidersAsModelProviders(): ModelProvider[] {
  const customProviders = getCustomProviders();
  return customProviders.map(customProviderToModelProvider);
}

/**
 * 从自定义端点拉取模型列表
 */
export async function fetchModelsFromCustomProvider(
  baseUrl: string,
  apiKey: string,
  protocol: ProtocolType
): Promise<{ success: boolean; models?: string[]; error?: string }> {
  try {
    const url = `/api/models?protocol=${protocol}&baseUrl=${encodeURIComponent(baseUrl)}&apiKey=${encodeURIComponent(apiKey)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }
    
    const data = await response.json();
    
    if (!data.success || !data.models) {
      return {
        success: false,
        error: '无效的响应格式',
      };
    }
    
    // 提取模型 ID 列表
    const models = data.models.map((m: any) => m.id);
    
    return {
      success: true,
      models,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 测试自定义端点连接
 */
export async function testCustomProviderConnection(
  baseUrl: string,
  apiKey: string,
  protocol: ProtocolType
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    // 根据协议类型构造测试请求
    let testEndpoint: string;
    let testBody: any;
    let testHeaders: HeadersInit;

    switch (protocol) {
      case 'openai':
        // OpenAI 协议：测试 /v1/models 端点
        testEndpoint = `${baseUrl}/v1/models`;
        testHeaders = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        };
        
        const modelsResponse = await fetch(testEndpoint, {
          method: 'GET',
          headers: testHeaders,
        });
        
        if (!modelsResponse.ok) {
          const errorText = await modelsResponse.text();
          return {
            success: false,
            error: `HTTP ${modelsResponse.status}: ${errorText}`,
          };
        }
        
        return {
          success: true,
          message: '连接成功！检测到 OpenAI 兼容端点',
        };

      case 'gemini':
        // Gemini 协议：测试 API
        // 注意：Gemini API 的测试方式可能不同
        testEndpoint = `${baseUrl}/v1beta/models`;
        testHeaders = {
          'Content-Type': 'application/json',
        };
        
        const geminiResponse = await fetch(`${testEndpoint}?key=${apiKey}`, {
          method: 'GET',
          headers: testHeaders,
        });
        
        if (!geminiResponse.ok) {
          return {
            success: false,
            error: `HTTP ${geminiResponse.status}`,
          };
        }
        
        return {
          success: true,
          message: '连接成功！检测到 Gemini 兼容端点',
        };

      case 'anthropic':
        // Claude (Anthropic) 协议：测试消息端点
        testEndpoint = `${baseUrl}/v1/messages`;
        testHeaders = {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        };
        testBody = {
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        };
        
        const claudeResponse = await fetch(testEndpoint, {
          method: 'POST',
          headers: testHeaders,
          body: JSON.stringify(testBody),
        });
        
        if (!claudeResponse.ok) {
          const errorText = await claudeResponse.text();
          return {
            success: false,
            error: `HTTP ${claudeResponse.status}: ${errorText}`,
          };
        }
        
        return {
          success: true,
          message: '连接成功！检测到 Claude 兼容端点',
        };

      default:
        return {
          success: false,
          error: '不支持的协议类型',
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 验证 URL 格式
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    
    // 检查协议
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        valid: false,
        error: '仅支持 HTTP 和 HTTPS 协议',
      };
    }
    
    // 生产环境建议使用 HTTPS
    if (parsed.protocol === 'http:' && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      return {
        valid: true,
        error: '警告：建议使用 HTTPS 以确保安全',
      };
    }
    
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'URL 格式无效',
    };
  }
}