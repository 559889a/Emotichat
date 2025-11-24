import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { addMessage, getConversationById } from '@/lib/storage/conversations';
import { getProviderById, getCustomProviders } from '@/lib/ai/models';
import type { AIProviderType } from '@/lib/ai/models';
import { maskSensitiveData } from '@/lib/utils';
import { getCharacterById } from '@/lib/storage/characters';
import { getActivePreset } from '@/lib/storage/config';
import { buildPrompt } from '@/lib/prompt/builder';
import type { Message } from '@/types';

// 全局模型配置类型（来自客户端）
interface GlobalModelConfig {
  providerId: string;
  modelId: string;
  providerType: 'openai' | 'google' | 'anthropic' | 'custom';
  isCustom: boolean;
  customProviderId?: string;
  // 自定义端点的完整配置（客户端传递，因为服务端无法访问 localStorage）
  customEndpoint?: {
    apiKey: string;
    baseUrl: string;
    protocol: 'openai' | 'gemini' | 'anthropic';
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      messages,
      conversationId,
      globalModelConfig,
      apiKey: clientApiKey,
    }: {
      messages: UIMessage[];
      conversationId: string;
      globalModelConfig?: GlobalModelConfig | null;
      apiKey?: string | null;
    } = body;

    console.log('=== Chat API Request ===');
    console.log('conversationId:', conversationId);
    console.log('globalModelConfig:', JSON.stringify(maskSensitiveData(globalModelConfig), null, 2));
    console.log('clientApiKey:', clientApiKey ? '***provided***' : null);
    console.log('messages (from client):', messages.length, 'messages');

    if (!conversationId) {
      return new Response('Missing conversationId', { status: 400 });
    }

    // 获取对话信息以读取模型配置
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return new Response('Conversation not found', { status: 404 });
    }

    // 获取角色信息
    const character = await getCharacterById(conversation.characterId);
    if (!character) {
      return new Response('Character not found', { status: 404 });
    }

    // 获取活动预设（可选）
    const activePreset = await getActivePreset();

    // 转换 UI 消息为我们的 Message 类型
    const historyMessages: Message[] = messages.map(msg => {
      let content = '';
      if (msg.parts && Array.isArray(msg.parts)) {
        content = msg.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');
      }

      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content,
        createdAt: new Date().toISOString(),
      };
    });

    console.log('\n=== Building Prompt with Prompt System ===');
    console.log('Character:', character.name);
    console.log('Active Preset:', activePreset?.name || 'None');
    console.log('History Messages:', historyMessages.length);
    console.log('==========================================\n');

    // 获取最后一条用户消息并保存
    const lastHistoryMessage = historyMessages[historyMessages.length - 1];
    if (lastHistoryMessage && lastHistoryMessage.role === 'user') {
      await addMessage(conversationId, {
        role: 'user',
        content: lastHistoryMessage.content,
      });
    }

    // 确定使用的模型
    let providerId: string;
    let modelId: string;
    let providerType: AIProviderType;
    let apiKey: string | undefined;
    let baseUrl: string | undefined;

    // 优先使用全局模型配置（来自客户端）
    if (globalModelConfig) {
      providerId = globalModelConfig.providerId;
      modelId = globalModelConfig.modelId;

      // 检查是否是自定义端点
      if (globalModelConfig.isCustom) {
        console.log('Using custom endpoint');
        // 优先使用客户端传递的完整配置（因为服务端无法访问 localStorage）
        if (globalModelConfig.customEndpoint) {
          console.log('Custom endpoint config found:', {
            protocol: globalModelConfig.customEndpoint.protocol,
            baseUrl: globalModelConfig.customEndpoint.baseUrl,
            hasApiKey: !!globalModelConfig.customEndpoint.apiKey
          });
          providerType = globalModelConfig.customEndpoint.protocol === 'openai' ? 'openai' :
                         globalModelConfig.customEndpoint.protocol === 'gemini' ? 'google' : 'anthropic';
          apiKey = globalModelConfig.customEndpoint.apiKey;
          baseUrl = globalModelConfig.customEndpoint.baseUrl;
        } else if (globalModelConfig.customProviderId) {
          // 向后兼容：尝试从服务端获取（仅开发环境有效）
          const customProviders = getCustomProviders();
          const customProvider = customProviders.find(p => p.id === globalModelConfig.customProviderId);

          if (customProvider) {
            providerType = customProvider.protocol === 'openai' ? 'openai' :
                           customProvider.protocol === 'gemini' ? 'google' : 'anthropic';
            apiKey = customProvider.apiKey;
            baseUrl = customProvider.baseUrl;
          } else {
            return new Response('Custom provider not found. Please re-select your custom endpoint in settings.', { status: 400 });
          }
        } else {
          return new Response('Custom endpoint configuration missing', { status: 400 });
        }
      } else {
        // 官方提供商
        const provider = getProviderById(providerId);
        if (!provider) {
          return new Response('Invalid provider', { status: 400 });
        }
        providerType = provider.type;

        // 从客户端传递的 API Key
        apiKey = clientApiKey || undefined;
      }
    } else if (conversation.modelConfig) {
      // 向后兼容：使用对话配置的模型（虽然新版本已移除）
      providerId = conversation.modelConfig.providerId;
      modelId = conversation.modelConfig.modelId;

      const customProviders = getCustomProviders();
      const customProvider = customProviders.find(p => p.id === providerId);

      if (customProvider) {
        providerType = customProvider.protocol === 'openai' ? 'openai' :
                       customProvider.protocol === 'gemini' ? 'google' : 'anthropic';
        apiKey = customProvider.apiKey;
        baseUrl = customProvider.baseUrl;
      } else {
        const provider = getProviderById(providerId);
        if (!provider) {
          return new Response('Invalid provider', { status: 400 });
        }
        providerType = provider.type;
        apiKey = clientApiKey || undefined;
      }
    } else {
      // 没有配置全局端点
      return new Response('No global endpoint configured. Please select a global endpoint in settings.', { status: 400 });
    }

    // 验证 API Key 是否存在
    if (!apiKey) {
      return new Response(
        `No API key provided for ${providerType}. Please configure API key in settings.`,
        { status: 400 }
      );
    }

    console.log('Creating model instance:', {
      providerType,
      modelId,
      baseUrl,
      hasApiKey: !!apiKey
    });

    // 创建模型实例
    let model;
    switch (providerType) {
      case 'openai':
        // OpenAI 协议：直接在原 URL 后添加 /v1，SDK 会再添加 /chat/completions
        // 最终路径：baseUrl + /v1 + /chat/completions
        let openaiBaseUrl = baseUrl || '';
        // 移除末尾斜杠
        openaiBaseUrl = openaiBaseUrl.replace(/\/+$/, '');
        // 直接添加 /v1
        openaiBaseUrl = `${openaiBaseUrl}/v1`;

        console.log('OpenAI config:', {
          originalBaseURL: baseUrl,
          finalBaseURL: openaiBaseUrl,
          modelId,
          hasApiKey: !!apiKey,
          note: 'SDK will append /chat/completions to make: ' + openaiBaseUrl + '/chat/completions'
        });

        const openai = createOpenAI({
          apiKey,
          baseURL: openaiBaseUrl,
        });

        // 使用 .chat() 方法明确指定使用 chat completions API
        model = openai.chat(modelId);
        break;

      case 'google':
        // Gemini 协议：直接在原 URL 后添加 /v1beta
        // 最终路径：baseUrl + /v1beta + (SDK 自动添加的端点)
        let geminiBaseUrl = baseUrl || '';
        // 移除末尾斜杠
        geminiBaseUrl = geminiBaseUrl.replace(/\/+$/, '');
        // 直接添加 /v1beta
        geminiBaseUrl = `${geminiBaseUrl}/v1beta`;

        console.log('Gemini config:', {
          originalBaseURL: baseUrl,
          finalBaseURL: geminiBaseUrl,
          modelId,
          hasApiKey: !!apiKey,
          note: 'Final request URL: ' + geminiBaseUrl + '/...'
        });

        const google = createGoogleGenerativeAI({
          apiKey,
          baseURL: geminiBaseUrl,
        });
        model = google(modelId);
        break;

      case 'anthropic':
        // Anthropic 协议：直接在原 URL 后添加 /v1，SDK 会再添加 /messages
        // 最终路径：baseUrl + /v1 + /messages
        let anthropicBaseUrl = baseUrl || '';
        // 移除末尾斜杠
        anthropicBaseUrl = anthropicBaseUrl.replace(/\/+$/, '');
        // 直接添加 /v1
        anthropicBaseUrl = `${anthropicBaseUrl}/v1`;

        console.log('Anthropic config:', {
          originalBaseURL: baseUrl,
          finalBaseURL: anthropicBaseUrl,
          modelId,
          hasApiKey: !!apiKey,
          note: 'SDK will append /messages to make: ' + anthropicBaseUrl + '/messages'
        });

        const anthropic = createAnthropic({
          apiKey,
          baseURL: anthropicBaseUrl,
        });
        model = anthropic(modelId);
        break;

      default:
        return new Response('Unsupported provider', { status: 400 });
    }

    // 使用提示词构建系统构建完整的提示词
    // 将 AIProviderType 转换为 buildPrompt 需要的格式
    let providerName: string = providerType;
    if (providerType === 'google') {
      providerName = 'gemini';
    }

    const builtMessages = buildPrompt(
      character,
      conversation,
      historyMessages,
      providerName,
      {
        skipPostProcess: false,
        userName: 'User', // 可以从配置中获取
      },
      activePreset // 传入活动预设
    );

    console.log('\n=== Built Prompt Messages ===');
    console.log('Total built messages:', builtMessages.length);
    builtMessages.forEach((msg, index) => {
      const preview = msg.content.substring(0, 100);
      console.log(`[${index}] ${msg.role}: ${preview}${msg.content.length > 100 ? '...' : ''}`);
    });
    console.log('==============================\n');

    // 转换为 AI SDK 格式
    const modelMessages = builtMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 获取模型参数
    const parameters = conversation.modelConfig?.parameters;

    // 构建流式调用参数
    const streamOptions: any = {
      model,
      messages: modelMessages,
      async onFinish({ text, finishReason }: { text: string; finishReason: string }) {
        console.log('Stream finished:', {
          textLength: text?.length || 0,
          finishReason,
          hasText: !!text
        });

        // 流式响应完成后，保存 AI 的回复
        if (text) {
          await addMessage(conversationId, {
            role: 'assistant',
            content: text,
            model: modelId,
          });
        } else {
          console.error('No text received from AI model');
        }
      },
    };

    // 应用模型参数（如果提供）
    if (parameters) {
      if (parameters.temperature !== undefined) {
        streamOptions.temperature = parameters.temperature;
      }
      if (parameters.topP !== undefined) {
        streamOptions.topP = parameters.topP;
      }
      if (parameters.maxTokens && parameters.maxTokens > 0) {
        streamOptions.maxSteps = parameters.maxTokens;
      }
      if (parameters.presencePenalty !== undefined) {
        streamOptions.presencePenalty = parameters.presencePenalty;
      }
      if (parameters.frequencyPenalty !== undefined) {
        streamOptions.frequencyPenalty = parameters.frequencyPenalty;
      }
    }

    // 调用 AI 模型
    console.log('\n=== Final Request to AI ===');
    console.log('Model:', modelId);
    console.log('Provider:', providerType);
    console.log('Base URL:', baseUrl || 'default');
    console.log('Messages count:', modelMessages.length);
    console.log('Parameters:', {
      temperature: streamOptions.temperature,
      topP: streamOptions.topP,
      maxSteps: streamOptions.maxSteps,
      presencePenalty: streamOptions.presencePenalty,
      frequencyPenalty: streamOptions.frequencyPenalty,
    });
    console.log('===========================\n');

    try {
      const result = streamText(streamOptions);

      // 返回 UI 消息流响应（重要：与 useChat 配合使用）
      return result.toUIMessageStreamResponse();
    } catch (streamError) {
      console.error('StreamText error:', streamError);
      throw streamError;
    }
  } catch (error) {
    console.error('Chat API Error:', error);

    // 返回更详细的错误信息
    const errorMessage = error instanceof Error
      ? `${error.message}\n${error.stack || ''}`
      : 'Internal Server Error';

    return new Response(errorMessage, { status: 500 });
  }
}
