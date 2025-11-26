'use client';

/**
 * 创建用于拦截 AI 流式响应的 fetch，提取 DevMode 数据并透传原始流。
 */
export function createDevModeFetch(conversationId: string | null) {
  return async (url: string, options: any) => {
    const response = await fetch(url, options);

    if (!response.body) {
      return response;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let devModeDataExtracted = false;

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);

        if (devModeDataExtracted) {
          return;
        }

        try {
          const text = decoder.decode(chunk, { stream: true });
          buffer += text;

          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('2:')) {
              try {
                const jsonStr = line.substring(2);
                const dataArray = JSON.parse(jsonStr);

                for (const item of dataArray) {
                  if (item.type === 'devmode_request_body' && item.data) {
                    window.dispatchEvent(
                      new CustomEvent('actualRequestBody', {
                        detail: {
                          requestBody: item.data,
                          conversationId,
                        },
                      })
                    );
                    devModeDataExtracted = true;
                    break;
                  }
                }
              } catch (parseErr) {
                console.log('[createDevModeFetch] Failed to parse 2: line, might be incomplete');
              }
            }
          }

          if (lines.length > 1) {
            buffer = lines[lines.length - 1];
          }
        } catch (err) {
          console.error('[createDevModeFetch] Error processing stream chunk:', err);
        }
      },
      flush() {
        if (!devModeDataExtracted) {
          console.warn('[createDevModeFetch] Stream ended without extracting DevMode data');
        }
      },
    });

    const transformedStream = response.body.pipeThrough(transformStream);

    return new Response(transformedStream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
