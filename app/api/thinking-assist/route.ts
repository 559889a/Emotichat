import { NextRequest, NextResponse } from 'next/server';

type ProtocolType = 'openai' | 'gemini' | 'anthropic';

interface ThinkingAssistRequest {
  content: string;
  protocol: ProtocolType;
  endpoint: string;
  apiKey: string;
  model: string;
}

// 根据协议类型构建请求 URL
function buildRequestUrl(baseUrl: string, protocol: ProtocolType): string {
  // 移除末尾斜杠
  const cleanUrl = baseUrl.replace(/\/+$/, '');

  switch (protocol) {
    case 'openai':
      return `${cleanUrl}/v1/chat/completions`;
    case 'gemini':
      return `${cleanUrl}/v1beta/models`;
    case 'anthropic':
      return `${cleanUrl}/v1/messages`;
    default:
      return `${cleanUrl}/v1/chat/completions`;
  }
}

// 根据协议类型构建请求体
function buildRequestBody(
  protocol: ProtocolType,
  model: string,
  prompt: string
): any {
  switch (protocol) {
    case 'openai':
      return {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 5,
      };
    case 'gemini':
      return {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 5,
        },
      };
    case 'anthropic':
      return {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 5,
        temperature: 0,
      };
    default:
      return {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 5,
      };
  }
}

// 根据协议类型构建请求头
function buildRequestHeaders(
  protocol: ProtocolType,
  apiKey: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  switch (protocol) {
    case 'openai':
      headers['Authorization'] = `Bearer ${apiKey}`;
      break;
    case 'gemini':
      // Gemini 使用 URL 参数传递 key，在下面的 URL 构建中处理
      break;
    case 'anthropic':
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
    default:
      headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return headers;
}

// 从响应中提取文本
function extractReplyFromResponse(data: any, protocol: ProtocolType): string {
  switch (protocol) {
    case 'openai':
      return data.choices?.[0]?.message?.content || '';
    case 'gemini':
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    case 'anthropic':
      return data.content?.[0]?.text || '';
    default:
      return data.choices?.[0]?.message?.content || data.content?.[0]?.text || '';
  }
}

/**
 * LLM 辅助判断内容是否是思维链（针对完全没有标签的内容）
 * 支持 OpenAI/Gemini/Anthropic 协议
 * 优化：最小化输入输出以提高响应速度
 */
export async function POST(request: NextRequest) {
  try {
    const body: ThinkingAssistRequest = await request.json();
    const { content, protocol = 'openai', endpoint, apiKey, model } = body;

    if (!endpoint || !apiKey || !model) {
      return NextResponse.json(
        { error: 'Missing LLM configuration' },
        { status: 400 }
      );
    }

    // 只取前300字符，最小化输入
    const sample = content.slice(0, 300).replace(/\n/g, ' ');

    // 极简提示词：判断内容是否是 AI 的内部思考过程
    const prompt = `判断这段文本是否是AI的内部思考过程（如推理、分析、规划、自我对话，而非直接回复用户）。
只回复: 1=是思考 0=不是
文本:"${sample}"`;

    // 构建请求 URL
    let requestUrl = buildRequestUrl(endpoint, protocol);

    // Gemini 特殊处理：URL 中包含模型名和 API key
    if (protocol === 'gemini') {
      requestUrl = `${endpoint.replace(/\/+$/, '')}/v1beta/models/${model}:generateContent?key=${apiKey}`;
    }

    // 构建请求头和请求体
    const headers = buildRequestHeaders(protocol, apiKey);
    const requestBody = buildRequestBody(protocol, model, prompt);

    // 调用 LLM API
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API error:', response.status, errorText);
      return NextResponse.json({ isThinking: false, error: `API error: ${response.status}` });
    }

    const data = await response.json();
    const reply = extractReplyFromResponse(data, protocol).trim();

    // 解析回复：检查是否包含 "1"
    const isThinking = reply.includes('1');

    return NextResponse.json({ isThinking });
  } catch (error) {
    console.error('Thinking assist error:', error);
    return NextResponse.json({ isThinking: false, error: String(error) });
  }
}

/**
 * 测试 LLM 连接
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { protocol = 'openai', endpoint, apiKey, model } = body;

    if (!endpoint || !apiKey || !model) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    const testPrompt = '回复 OK';

    // 构建请求 URL
    let requestUrl = buildRequestUrl(endpoint, protocol);

    // Gemini 特殊处理
    if (protocol === 'gemini') {
      requestUrl = `${endpoint.replace(/\/+$/, '')}/v1beta/models/${model}:generateContent?key=${apiKey}`;
    }

    // 构建请求头和请求体
    const headers = buildRequestHeaders(protocol, apiKey);
    const requestBody = buildRequestBody(protocol, model, testPrompt);

    const startTime = Date.now();
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `连接失败 (${response.status}): ${errorText.slice(0, 200)}`,
      });
    }

    const data = await response.json();
    const reply = extractReplyFromResponse(data, protocol);

    return NextResponse.json({
      success: true,
      message: `连接成功！延迟 ${latency}ms`,
      reply: reply.slice(0, 50),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '连接测试失败',
    });
  }
}
