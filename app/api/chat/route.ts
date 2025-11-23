import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { addMessage, getConversationById } from '@/lib/storage/conversations';
import { getStoredApiKey } from '@/components/settings/api-keys';
import { getProviderById, getCustomProviders } from '@/lib/ai/models';
import type { AIProviderType } from '@/lib/ai/models';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, conversationId }: { messages: UIMessage[]; conversationId: string } = body;

    if (!conversationId) {
      return new Response('Missing conversationId', { status: 400 });
    }

    // 获取对话信息以读取模型配置
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return new Response('Conversation not found', { status: 404 });
    }

    // 转换 UI 消息为模型消息格式
    const modelMessages = convertToModelMessages(messages);

    // 获取最后一条用户消息并保存
    const lastMessage = modelMessages[modelMessages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      await addMessage(conversationId, {
        role: 'user',
        content: typeof lastMessage.content === 'string'
          ? lastMessage.content
          : lastMessage.content.map(part =>
              part.type === 'text' ? part.text : ''
            ).join(''),
      });
    }

    // 确定使用的模型
    let providerId: string;
    let modelId: string;
    let providerType: AIProviderType;
    let apiKey: string | undefined;
    let baseUrl: string | undefined;

    if (conversation.modelConfig) {
      // 使用对话配置的模型
      providerId = conversation.modelConfig.providerId;
      modelId = conversation.modelConfig.modelId;
      
      // 检查是否是自定义端点
      const customProviders = getCustomProviders();
      const customProvider = customProviders.find(p => p.id === providerId);
      
      if (customProvider) {
        // 自定义端点
        providerType = customProvider.protocol === 'openai' ? 'openai' :
                       customProvider.protocol === 'gemini' ? 'google' : 'anthropic';
        apiKey = customProvider.apiKey;
        baseUrl = customProvider.baseUrl;
      } else {
        // 官方提供商
        const provider = getProviderById(providerId);
        if (!provider) {
          return new Response('Invalid provider', { status: 400 });
        }
        providerType = provider.type;
        
        // 从 localStorage 获取 API Key（客户端存储）
        // 注意：这里需要在服务端，所以实际上需要从环境变量获取
        // 或者要求客户端在请求中传递（不安全）
        // 最佳方案：使用环境变量
        apiKey = process.env[`${providerType.toUpperCase()}_API_KEY`];
      }
    } else {
      // 使用默认模型（从环境变量）
      if (process.env.GOOGLE_API_KEY) {
        providerType = 'google';
        providerId = 'google';
        modelId = 'gemini-1.5-flash';
        apiKey = process.env.GOOGLE_API_KEY;
      } else if (process.env.OPENAI_API_KEY) {
        providerType = 'openai';
        providerId = 'openai';
        modelId = 'gpt-4o-mini';
        apiKey = process.env.OPENAI_API_KEY;
      } else if (process.env.ANTHROPIC_API_KEY) {
        providerType = 'anthropic';
        providerId = 'anthropic';
        modelId = 'claude-3-haiku-20240307';
        apiKey = process.env.ANTHROPIC_API_KEY;
      } else {
        return new Response('No API key configured', { status: 500 });
      }
    }

    // 创建模型实例
    let model;
    switch (providerType) {
      case 'openai':
        const openai = createOpenAI({
          apiKey: apiKey || process.env.OPENAI_API_KEY,
          baseURL: baseUrl,
        });
        model = openai(modelId);
        break;

      case 'google':
        const google = createGoogleGenerativeAI({
          apiKey: apiKey || process.env.GOOGLE_API_KEY,
          baseURL: baseUrl,
        });
        model = google(modelId);
        break;

      case 'anthropic':
        const anthropic = createAnthropic({
          apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
          baseURL: baseUrl,
        });
        model = anthropic(modelId);
        break;

      default:
        return new Response('Unsupported provider', { status: 400 });
    }

    // 调用 AI 模型
    const result = streamText({
      model,
      messages: modelMessages,
      async onFinish({ text }) {
        // 流式响应完成后，保存 AI 的回复
        await addMessage(conversationId, {
          role: 'assistant',
          content: text,
          model: modelId,
        });
      },
    });

    // 返回 UI 消息流响应（重要：与 useChat 配合使用）
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    );
  }
}