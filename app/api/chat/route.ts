import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createModel, getDefaultModelConfig } from '@/lib/ai/providers/registry';
import { addMessage } from '@/lib/storage/conversations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, conversationId }: { messages: UIMessage[]; conversationId: string } = body;

    if (!conversationId) {
      return new Response('Missing conversationId', { status: 400 });
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

    // 获取模型配置
    const modelConfig = getDefaultModelConfig();
    const model = createModel(modelConfig);

    // 调用 AI 模型
    const result = streamText({
      model,
      messages: modelMessages,
      async onFinish({ text }) {
        // 流式响应完成后，保存 AI 的回复
        await addMessage(conversationId, {
          role: 'assistant',
          content: text,
          model: modelConfig.modelId,
        });
      },
    });

    // 返回 UI 消息流响应（重要：与 useChat 配合使用）
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}