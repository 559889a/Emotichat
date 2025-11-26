'use client';

import { useEffect, useMemo, useState } from 'react';
import { DefaultChatTransport } from 'ai';
import { getGlobalModelConfig, type GlobalModelConfig } from '@/components/settings/global-endpoint-selector';
import { getStoredApiKey } from '@/components/settings/api-keys';
import type { AIProviderType } from '@/lib/ai/models';
import { createDevModeFetch } from '@/lib/chat/devmode-stream-interceptor';
import { useRuntimeContext } from '@/hooks/useRuntimeContext';

export function useMessageTransport(conversationId: string | null) {
  const [globalConfig, setGlobalConfig] = useState<GlobalModelConfig | null>(() =>
    getGlobalModelConfig()
  );
  const { variables: runtimeVariables } = useRuntimeContext();

  useEffect(() => {
    const handleConfigChange = () => {
      setGlobalConfig(getGlobalModelConfig());
    };

    window.addEventListener('storage', handleConfigChange);
    window.addEventListener('globalConfigChanged', handleConfigChange);

    return () => {
      window.removeEventListener('storage', handleConfigChange);
      window.removeEventListener('globalConfigChanged', handleConfigChange);
    };
  }, []);

  const transport = useMemo(() => {
    let apiKey: string | null = null;

    if (globalConfig && !globalConfig.isCustom) {
      apiKey = getStoredApiKey(globalConfig.providerType as AIProviderType);
    }

    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        conversationId,
        globalModelConfig: globalConfig,
        apiKey,
        runtimeVariables,
      },
      fetch: createDevModeFetch(conversationId) as any,
    });
  }, [conversationId, globalConfig, runtimeVariables]);

  return { transport, globalConfig };
}
