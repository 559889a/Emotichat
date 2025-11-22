import { streamText } from 'ai';
import { createModel, getDefaultModelConfig } from '@/lib/ai/providers/registry';
import { addMessage } from '@/lib/storage/conversations';

export async function POST(request: Request) {
  try {
    const { messages, conversationId } = await request.json();

    if (!conversationId) {
      return new Response('Missing conversationId', { status: 400 });
    }

    // 获取最后一条用户消息并保存
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      await addMessage(conversationId, {
        role: 'user',
        content: lastMessage.content,
      });
    }

    // 获取模型配置
    const modelConfig = getDefaultModelConfig();
    const model = createModel(modelConfig);

    // 调用 AI 模型
    const result = streamText({
      model,
      messages,
      async onFinish({ text }) {
        // 流式响应完成后，保存 AI 的回复
        await addMessage(conversationId, {
          role: 'assistant',
          content: text,
          model: modelConfig.modelId,
        });
      },
    });

    // 返回流式响应
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}