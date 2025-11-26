import { streamText, generateText, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { addMessage, getConversationById, getMessages } from '@/lib/storage/conversations';
import { getProviderById, getCustomProviders } from '@/lib/ai/models';
import type { AIProviderType } from '@/lib/ai/models';
import { maskSensitiveData } from '@/lib/utils';
import { getCharacterById, getActiveUserProfile } from '@/lib/storage/characters';
import { getActivePreset } from '@/lib/storage/config';
import { loadRegexRules } from '@/lib/storage/regex-rules';
import { applyRegexRules } from '@/lib/regex/engine';
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
      runtimeVariables,
    }: {
      messages: UIMessage[];
      conversationId: string;
      globalModelConfig?: GlobalModelConfig | null;
      apiKey?: string | null;
      runtimeVariables?: {
        time?: string;
        location?: string;
        deviceInfo?: string;
      } | null;
    } = body;

    console.log('=== Chat API Request ===');
    console.log('conversationId:', conversationId);
    console.log('globalModelConfig:', JSON.stringify(maskSensitiveData(globalModelConfig), null, 2));
    console.log('clientApiKey:', clientApiKey ? '***provided***' : null);
    console.log('runtimeVariables:', runtimeVariables ? JSON.stringify(runtimeVariables) : 'none');
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

    // 获取激活的用户角色（用于 user_prompts 引用和 {{user}} 变量）
    const activeUserProfile = await getActiveUserProfile();
    const regexRules = await loadRegexRules();

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
    console.log('Active User Profile:', activeUserProfile?.name || 'None');
    console.log('History Messages:', historyMessages.length);
    console.log('==========================================\n');

    // 获取最后一条用户消息并保存（检查是否重复，避免重试时添加重复消息）
    const lastHistoryMessage = historyMessages[historyMessages.length - 1];
    if (lastHistoryMessage && lastHistoryMessage.role === 'user') {
      // 获取对话中现有的消息
      const existingMessages = await getMessages(conversationId);
      const lastExistingMessage = existingMessages[existingMessages.length - 1];

      // 检查最后一条消息是否已经是相同的用户消息（重试场景）
      const isDuplicate = lastExistingMessage &&
        lastExistingMessage.role === 'user' &&
        lastExistingMessage.content === lastHistoryMessage.content;

      if (!isDuplicate) {
        await addMessage(conversationId, {
          role: 'user',
          content: lastHistoryMessage.content,
        });
      } else {
        console.log('[Chat API] Skipping duplicate user message (retry scenario)');
      }
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
        // OpenAI 协议
        // 自定义端点：直接在原 URL 后添加 /v1，SDK 会再添加 /chat/completions
        // 官方 API：不设置 baseURL，让 SDK 使用默认值
        let openaiBaseUrl: string | undefined;
        if (baseUrl) {
          // 自定义端点：处理 baseUrl
          openaiBaseUrl = baseUrl.replace(/\/+$/, '');
          openaiBaseUrl = `${openaiBaseUrl}/v1`;
        }

        console.log('OpenAI config:', {
          originalBaseURL: baseUrl,
          finalBaseURL: openaiBaseUrl || '(SDK default)',
          modelId,
          hasApiKey: !!apiKey,
          note: openaiBaseUrl
            ? 'SDK will append /chat/completions to make: ' + openaiBaseUrl + '/chat/completions'
            : 'Using official OpenAI API'
        });

        const openai = createOpenAI({
          apiKey,
          ...(openaiBaseUrl && { baseURL: openaiBaseUrl }),
        });

        // 使用 .chat() 方法明确指定使用 chat completions API
        model = openai.chat(modelId);
        break;

      case 'google':
        // Gemini 协议
        // 自定义端点：直接在原 URL 后添加 /v1beta
        // 官方 API：不设置 baseURL，让 SDK 使用默认值
        let geminiBaseUrl: string | undefined;
        if (baseUrl) {
          // 自定义端点：处理 baseUrl
          geminiBaseUrl = baseUrl.replace(/\/+$/, '');
          geminiBaseUrl = `${geminiBaseUrl}/v1beta`;
        }

        console.log('Gemini config:', {
          originalBaseURL: baseUrl,
          finalBaseURL: geminiBaseUrl || '(SDK default)',
          modelId,
          hasApiKey: !!apiKey,
          note: geminiBaseUrl
            ? 'Final request URL: ' + geminiBaseUrl + '/...'
            : 'Using official Google Gemini API'
        });

        const google = createGoogleGenerativeAI({
          apiKey,
          ...(geminiBaseUrl && { baseURL: geminiBaseUrl }),
        });
        model = google(modelId);
        break;

      case 'anthropic':
        // Anthropic 协议
        // 自定义端点：直接在原 URL 后添加 /v1，SDK 会再添加 /messages
        // 官方 API：不设置 baseURL，让 SDK 使用默认值
        let anthropicBaseUrl: string | undefined;
        if (baseUrl) {
          // 自定义端点：处理 baseUrl
          anthropicBaseUrl = baseUrl.replace(/\/+$/, '');
          anthropicBaseUrl = `${anthropicBaseUrl}/v1`;
        }

        console.log('Anthropic config:', {
          originalBaseURL: baseUrl,
          finalBaseURL: anthropicBaseUrl || '(SDK default)',
          modelId,
          hasApiKey: !!apiKey,
          note: anthropicBaseUrl
            ? 'SDK will append /messages to make: ' + anthropicBaseUrl + '/messages'
            : 'Using official Anthropic API'
        });

        const anthropic = createAnthropic({
          apiKey,
          ...(anthropicBaseUrl && { baseURL: anthropicBaseUrl }),
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

    // 使用激活用户角色的名称作为 userName，否则默认为 'User'
    const userName = activeUserProfile?.name || 'User';

    const builtMessages = buildPrompt(
      character,
      conversation,
      historyMessages,
      providerName,
      {
        skipPostProcess: false,
        userName, // 使用激活用户角色的名称
        activeUserProfile: activeUserProfile || undefined, // 传递激活的用户角色
        runtimeVariables: runtimeVariables || undefined,
        regexRules,
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

    // 获取模型参数（优先使用预设参数，然后是对话配置）
    let parameters = conversation.modelConfig?.parameters;

    // 如果有活动预设且包含启用的参数，使用预设参数
    if (activePreset && activePreset.parameters) {
      const presetParams: any = {};

      // 只应用预设中启用的参数
      if (activePreset.enabledParameters.includes('temperature') && activePreset.parameters.temperature !== undefined) {
        presetParams.temperature = activePreset.parameters.temperature;
      }
      if (activePreset.enabledParameters.includes('topP') && activePreset.parameters.topP !== undefined) {
        presetParams.topP = activePreset.parameters.topP;
      }
      if (activePreset.enabledParameters.includes('topK') && activePreset.parameters.topK !== undefined) {
        presetParams.topK = activePreset.parameters.topK;
      }
      if (activePreset.enabledParameters.includes('maxTokens') && activePreset.parameters.maxTokens !== undefined) {
        presetParams.maxTokens = activePreset.parameters.maxTokens;
      }
      if (activePreset.enabledParameters.includes('presencePenalty') && activePreset.parameters.presencePenalty !== undefined) {
        presetParams.presencePenalty = activePreset.parameters.presencePenalty;
      }
      if (activePreset.enabledParameters.includes('frequencyPenalty') && activePreset.parameters.frequencyPenalty !== undefined) {
        presetParams.frequencyPenalty = activePreset.parameters.frequencyPenalty;
      }

      // 合并参数：预设参数覆盖对话配置
      parameters = { ...parameters, ...presetParams };
    }

    // 检查是否启用流式输出（默认为 true）
    const useStream = activePreset?.stream !== false;

    // 构建 AI 请求参数
    const requestOptions: any = {
      model,
      messages: modelMessages,
    };

    // 应用模型参数（如果提供）
    if (parameters) {
      if (parameters.temperature !== undefined) {
        requestOptions.temperature = parameters.temperature;
      }
      if (parameters.topP !== undefined) {
        requestOptions.topP = parameters.topP;
      }
      if (parameters.maxTokens && parameters.maxTokens > 0) {
        requestOptions.maxSteps = parameters.maxTokens;
      }
      if (parameters.presencePenalty !== undefined) {
        requestOptions.presencePenalty = parameters.presencePenalty;
      }
      if (parameters.frequencyPenalty !== undefined) {
        requestOptions.frequencyPenalty = parameters.frequencyPenalty;
      }
    }

    // 如果使用流式输出，添加 onFinish 回调
    if (useStream) {
      requestOptions.onFinish = async ({ text, finishReason }: { text: string; finishReason: string }) => {
        console.log('Stream finished:', {
          textLength: text?.length || 0,
          finishReason,
          hasText: !!text
        });

        // 流式响应完成后，保存 AI 的回复
        if (text) {
          let finalText = text;
          if (regexRules.length > 0) {
            const applied = applyRegexRules(text, regexRules, {
              scope: 'ai_output',
              layer: historyMessages.length,
            });
            finalText = applied.content;
          }
          await addMessage(conversationId, {
            role: 'assistant',
            content: finalText,
            model: modelId,
          });
        } else {
          console.error('No text received from AI model');
        }
      };
    }

    // 调用 AI 模型
    console.log('\n=== Final Request to AI ===');
    console.log('Model:', modelId);
    console.log('Provider:', providerType);
    console.log('Base URL:', baseUrl || 'default');
    console.log('Messages count:', modelMessages.length);
    console.log('Stream Mode:', useStream);
    console.log('Parameters:', {
      temperature: requestOptions.temperature,
      topP: requestOptions.topP,
      maxSteps: requestOptions.maxSteps,
      presencePenalty: requestOptions.presencePenalty,
      frequencyPenalty: requestOptions.frequencyPenalty,
    });
    console.log('===========================\n');

    // 准备 DevMode 请求体（在生成响应前）
    const actualRequestBody: any = {
      model: modelId,
      messages: modelMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    // 添加所有启用的参数
    if (requestOptions.temperature !== undefined) {
      actualRequestBody.temperature = requestOptions.temperature;
    }
    if (requestOptions.topP !== undefined) {
      actualRequestBody.top_p = requestOptions.topP;
    }
    if (requestOptions.maxSteps !== undefined) {
      actualRequestBody.max_tokens = requestOptions.maxSteps;
    }
    if (requestOptions.presencePenalty !== undefined) {
      actualRequestBody.presence_penalty = requestOptions.presencePenalty;
    }
    if (requestOptions.frequencyPenalty !== undefined) {
      actualRequestBody.frequency_penalty = requestOptions.frequencyPenalty;
    }
    if (requestOptions.topK !== undefined) {
      actualRequestBody.top_k = requestOptions.topK;
    }

    console.log('[DevMode] Actual request body messages count:', actualRequestBody.messages.length);
    console.log('[DevMode] First 3 messages:', actualRequestBody.messages.slice(0, 3).map((m: any) => ({
      role: m.role,
      contentPreview: m.content.substring(0, 50)
    })));

    // Base64 编码请求体（用于响应头）
    const requestBodyJson = JSON.stringify(actualRequestBody);
    const requestBodyBase64 = Buffer.from(requestBodyJson, 'utf-8').toString('base64');

    try {
      let response: Response;

      if (useStream) {
        // 流式输出
        const result = streamText(requestOptions);
        const streamResponse = result.toUIMessageStreamResponse();

        // 创建一个 TransformStream 来在流开头添加请求体数据
        const encoder = new TextEncoder();
        let isFirst = true;
        const transformStream = new TransformStream({
          transform(chunk, controller) {
            // 在第一个数据包之前，先发送请求体数据
            if (isFirst) {
              isFirst = false;
              const devModeData = `2:${JSON.stringify([{ type: 'devmode_request_body', data: actualRequestBody }])}\n`;
              controller.enqueue(encoder.encode(devModeData));
            }
            controller.enqueue(chunk);
          }
        });

        // 通过 TransformStream 处理原始流
        const modifiedStream = streamResponse.body?.pipeThrough(transformStream);

        // 克隆响应并添加自定义响应头（Response 对象是不可变的）
        response = new Response(modifiedStream, {
          status: streamResponse.status,
          statusText: streamResponse.statusText,
          headers: new Headers({
            ...Object.fromEntries(streamResponse.headers.entries()),
            'X-Actual-Request-Body': requestBodyBase64,
            'X-Prompt-Messages-Count': String(modelMessages.length),
            'Access-Control-Expose-Headers': 'X-Actual-Request-Body, X-Prompt-Messages-Count',
          }),
        });
      } else {
        // 非流式输出 - 但返回流式格式以保持客户端兼容性
        console.log('Using non-stream mode (generateText)');
        const result = await generateText(requestOptions);

        console.log('Generate finished:', {
          textLength: result.text?.length || 0,
          finishReason: result.finishReason,
          hasText: !!result.text
        });

        // 立即保存 AI 的回复
        if (result.text) {
          let finalText = result.text;
          if (regexRules.length > 0) {
            const applied = applyRegexRules(result.text, regexRules, {
              scope: 'ai_output',
              layer: historyMessages.length,
            });
            finalText = applied.content;
          }
          await addMessage(conversationId, {
            role: 'assistant',
            content: finalText,
            model: modelId,
          });
        } else {
          console.error('No text received from AI model');
        }

        // 创建一个简单的流响应（立即发送完整内容）
        const encoder = new TextEncoder();
        const messageId = crypto.randomUUID();

        // 构建 UI 消息格式的数据
        const uiMessage = {
          id: messageId,
          role: 'assistant' as const,
          parts: [
            {
              type: 'text' as const,
              text: result.text || '',
            }
          ],
        };

        // 创建流 - 使用AI SDK期望的完整格式
        const stream = new ReadableStream({
          start(controller) {
            try {
              // 首先发送实际请求体数据（作为自定义 metadata）
              // 使用 2: 前缀表示这是 data 类型的消息
              const devModeData = `2:${JSON.stringify([{ type: 'devmode_request_body', data: actualRequestBody }])}\n`;
              controller.enqueue(encoder.encode(devModeData));

              // 发送消息数据（使用 text-delta 格式以确保兼容性）
              const messageData = `0:${JSON.stringify([uiMessage])}\n`;
              controller.enqueue(encoder.encode(messageData));

              // 发送 usage 信息（如果有）
              if (result.usage) {
                const usageData = `d:{"finishReason":"${result.finishReason || 'stop'}","usage":${JSON.stringify(result.usage)}}\n`;
                controller.enqueue(encoder.encode(usageData));
              } else {
                // 发送完成标记（finish reason）
                const finishData = `d:{"finishReason":"${result.finishReason || 'stop'}"}\n`;
                controller.enqueue(encoder.encode(finishData));
              }

              // 发送结束标记
              controller.enqueue(encoder.encode('e:{"finishReason":"stop","isContinued":false}\n'));

              // 关闭流
              controller.close();

              console.log('[Non-Stream] Stream completed and closed');
            } catch (error) {
              console.error('[Non-Stream] Error in stream:', error);
              controller.error(error);
            }
          },
        });

        // 创建响应，直接包含所有必要的响应头
        response = new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Vercel-AI-Data-Stream': 'v1',
            'X-Actual-Request-Body': requestBodyBase64,
            'X-Prompt-Messages-Count': String(modelMessages.length),
            'Access-Control-Expose-Headers': 'X-Actual-Request-Body, X-Prompt-Messages-Count',
          },
        });

        console.log('[DevMode] Non-stream response created with headers:', {
          hasActualRequestBody: !!response.headers.get('X-Actual-Request-Body'),
          messageCount: response.headers.get('X-Prompt-Messages-Count')
        });
      }

      return response;
    } catch (error) {
      console.error('AI Model error:', error);
      throw error;
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
