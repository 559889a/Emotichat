'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Message } from '@/types';

export function useMessageMetadata(conversationId: string | null) {
  const serverMessagesRef = useRef<Map<string, Message>>(new Map());
  const thinkingBlockRenderedRef = useRef<Set<string>>(new Set());
  const thinkingPatchInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    thinkingBlockRenderedRef.current.clear();
    thinkingPatchInFlightRef.current.clear();
  }, [conversationId]);

  const syncServerMessages = useCallback((serverMessages: Message[]) => {
    serverMessages.forEach((message) => {
      serverMessagesRef.current.set(message.id, message);
    });
  }, []);

  return {
    serverMessagesRef,
    thinkingBlockRenderedRef,
    thinkingPatchInFlightRef,
    syncServerMessages,
  };
}
