import { NextResponse } from 'next/server';
import type { ProtocolType } from '@/lib/ai/models/types';

/**
 * 模型列表 API
 * GET /api/models?provider=openai&baseUrl=xxx&apiKey=xxx
 * 
 * 功能：
 * 1. 官方端点：尝试拉取最新模型，失败则返回硬编码列表
 * 2. 自定义端点：完全依赖动态拉取
 */

interface ModelInfo {
  id: string;
  name: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  description?: string;
}

/**
 * 从 OpenAI 兼容端点拉取模型列表
 */
async function fetchOpenAIModels(
  baseUrl: string,
  apiKey: string
): Promise<ModelInfo[]> {
  const url = `${baseUrl}/v1/models`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  
  // OpenAI API 返回格式：{ data: [ { id, ... }, ... ] }
  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid response format');
  }

  return data.data.map((model: any) => ({
    id: model.id,
    name: model.id,
    contextWindow: model.context_length || undefined,
    description: model.description || `OpenAI compatible model: ${model.id}`,
  }));
}

/**
 * 从 Gemini API 拉取模型列表
 */
async function fetchGeminiModels(
  baseUrl: string,
  apiKey: string
): Promise<ModelInfo[]> {
  const url = `${baseUrl}/v1beta/models?key=${apiKey}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  
  // Gemini API 返回格式：{ models: [ { name, displayName, ... }, ... ] }
  if (!data.models || !Array.isArray(data.models)) {
    throw new Error('Invalid response format');
  }

  return data.models
    .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model: any) => {
      // Gemini 模型名称格式：models/gemini-pro
      const modelId = model.name.replace('models/', '');
      
      return {
        id: modelId,
        name: model.displayName || modelId,
        contextWindow: model.inputTokenLimit || undefined,
        maxOutputTokens: model.outputTokenLimit || undefined,
        description: model.description || `Google Gemini model: ${modelId}`,
      };
    });
}

/**
 * Anthropic (Claude) 没有公开的模型列表 API
 * 返回预定义的模型列表
 */
function getAnthropicModels(): ModelInfo[] {
  return [
    { 
      id: 'claude-3-5-sonnet-20241022', 
      name: 'Claude 3.5 Sonnet (New)',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      description: 'Claude 3.5 Sonnet 的最新版本',
    },
    { 
      id: 'claude-3-5-sonnet-20240620', 
      name: 'Claude 3.5 Sonnet',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      description: 'Claude 3.5 Sonnet 平衡性能和成本',
    },
    { 
      id: 'claude-3-opus-20240229', 
      name: 'Claude 3 Opus',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      description: 'Claude 3 Opus 是最强大的 Claude 模型',
    },
    { 
      id: 'claude-3-sonnet-20240229', 
      name: 'Claude 3 Sonnet',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      description: 'Claude 3 Sonnet 平衡性能和速度',
    },
    { 
      id: 'claude-3-haiku-20240307', 
      name: 'Claude 3 Haiku',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      description: 'Claude 3 Haiku 是最快速且最经济的 Claude 模型',
    },
  ];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const protocol = searchParams.get('protocol') as ProtocolType;
    const baseUrl = searchParams.get('baseUrl');
    const apiKey = searchParams.get('apiKey');

    if (!protocol) {
      return NextResponse.json(
        { error: 'Missing protocol parameter' },
        { status: 400 }
      );
    }

    let models: ModelInfo[] = [];

    switch (protocol) {
      case 'openai':
        if (!baseUrl || !apiKey) {
          return NextResponse.json(
            { error: 'Missing baseUrl or apiKey for OpenAI protocol' },
            { status: 400 }
          );
        }
        models = await fetchOpenAIModels(baseUrl, apiKey);
        break;

      case 'gemini':
        if (!baseUrl || !apiKey) {
          return NextResponse.json(
            { error: 'Missing baseUrl or apiKey for Gemini protocol' },
            { status: 400 }
          );
        }
        models = await fetchGeminiModels(baseUrl, apiKey);
        break;

      case 'anthropic':
        // Anthropic 没有公开的模型列表 API，返回预定义列表
        models = getAnthropicModels();
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported protocol' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      models,
      protocol,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}