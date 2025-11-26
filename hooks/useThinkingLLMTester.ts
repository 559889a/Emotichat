'use client';

import { useCallback, useState } from 'react';
import { fetchModelsFromCustomProvider } from '@/lib/ai/models';

interface ThinkingTesterOptions {
  protocol: string;
  endpoint: string;
  apiKey: string;
  model: string;
  onSelectModel: (model: string) => void;
}

export function useThinkingLLMTester({
  protocol,
  endpoint,
  apiKey,
  model,
  onSelectModel,
}: ThinkingTesterOptions) {
  const [isTesting, setIsTesting] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSelectModel = useCallback(
    (selectedModel: string) => {
      onSelectModel(selectedModel);
    },
    [onSelectModel]
  );

  const handleTestConnection = useCallback(async () => {
    if (!endpoint || !apiKey) {
      setTestResult({
        success: false,
        message: '请填写端点地址和 API Key',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setFetchedModels([]);

    try {
      if (model) {
        const response = await fetch('/api/thinking-assist', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protocol,
            endpoint,
            apiKey,
            model,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          setTestResult({
            success: false,
            message: result.error || '连接测试失败',
          });
          setIsTesting(false);
          return;
        }
      }

      setIsFetchingModels(true);
      const modelsResult = await fetchModelsFromCustomProvider(endpoint, apiKey, protocol);

      if (modelsResult.success && modelsResult.models) {
        setFetchedModels(modelsResult.models);
        setTestResult({
          success: true,
          message: `连接成功！拉取到 ${modelsResult.models.length} 个模型`,
        });

        setTimeout(() => setTestResult(null), 3000);
      } else {
        setTestResult({
          success: true,
          message: '连接成功，但无法拉取模型列表（可能不支持）',
        });

        setTimeout(() => setTestResult(null), 3000);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '连接测试失败',
      });
    } finally {
      setIsTesting(false);
      setIsFetchingModels(false);
    }
  }, [apiKey, endpoint, model, protocol]);

  return {
    isTesting,
    isFetchingModels,
    fetchedModels,
    testResult,
    handleTestConnection,
    handleSelectModel,
    setTestResult,
  };
}
