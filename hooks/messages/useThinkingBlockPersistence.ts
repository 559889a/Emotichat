'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { Message } from '@/types';
import { addThinkingBlockRenderedListener } from '@/lib/chat/thinking-tag-watcher';

interface ThinkingBlockPersistenceOptions {
  conversationIdRef: MutableRefObject<string | null>;
  serverMessagesRef: MutableRefObject<Map<string, Message>>;
  thinkingBlockRenderedRef: MutableRefObject<Set<string>>;
  thinkingPatchInFlightRef: MutableRefObject<Set<string>>;
  thinkingAssistDisabled?: boolean;
}

export function useThinkingBlockPersistence({
  conversationIdRef,
  serverMessagesRef,
  thinkingBlockRenderedRef,
  thinkingPatchInFlightRef,
  thinkingAssistDisabled = false,
}: ThinkingBlockPersistenceOptions) {
  const persistThinkingTagState = useCallback(
    async (message: Message, updates?: { prependTag?: string; appendTag?: string }) => {
      const currentConversationId = conversationIdRef.current;
      if (!currentConversationId) return;

      const targetMsg = serverMessagesRef.current.get(message.id) || message;

      if (targetMsg.role !== 'assistant') {
        return;
      }

      if (targetMsg.thinkingTagProcessed && !updates?.prependTag && !updates?.appendTag) {
        thinkingBlockRenderedRef.current.add(message.id);
        return;
      }

      if (thinkingPatchInFlightRef.current.has(message.id)) {
        return;
      }

      thinkingPatchInFlightRef.current.add(message.id);

      try {
        const patchResponse = await fetch(
          `/api/conversations/${currentConversationId}/messages/${message.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'set_thinking_tag',
              thinkingTagPrepend: updates?.prependTag ?? targetMsg.thinkingTagPrepend ?? '',
              thinkingTagAppend: updates?.appendTag ?? targetMsg.thinkingTagAppend ?? '',
              thinkingTagProcessed: true,
            }),
          }
        );

        if (!patchResponse.ok) {
          console.warn(
            '[useThinkingBlockPersistence] Failed to persist thinking tag state:',
            patchResponse.status
          );
        } else {
          const updatedMsg: Message = {
            ...targetMsg,
            thinkingTagPrepend: updates?.prependTag ?? targetMsg.thinkingTagPrepend ?? '',
            thinkingTagAppend: updates?.appendTag ?? targetMsg.thinkingTagAppend ?? '',
            thinkingTagProcessed: true,
          };
          serverMessagesRef.current.set(message.id, updatedMsg);
          thinkingBlockRenderedRef.current.add(message.id);
        }
      } catch (err) {
        console.error('[useThinkingBlockPersistence] Failed to save thinking tag state:', err);
      } finally {
        thinkingPatchInFlightRef.current.delete(message.id);
      }
    },
    [conversationIdRef, serverMessagesRef, thinkingBlockRenderedRef, thinkingPatchInFlightRef]
  );

  useEffect(() => {
    if (thinkingAssistDisabled) {
      return;
    }

    const unsubscribe = addThinkingBlockRenderedListener(
      ({ messageId, conversationId: eventConversationId }) => {
        const currentConversationId = conversationIdRef.current;
        if (!messageId) return;
        if (
          eventConversationId &&
          currentConversationId &&
          eventConversationId !== currentConversationId
        ) {
          return;
        }
        const targetMsg = serverMessagesRef.current.get(messageId);
        if (!targetMsg || targetMsg.role !== 'assistant') {
          return;
        }

        thinkingBlockRenderedRef.current.add(messageId);

        if (!targetMsg.thinkingTagProcessed) {
          persistThinkingTagState(targetMsg);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [
    conversationIdRef,
    persistThinkingTagState,
    serverMessagesRef,
    thinkingAssistDisabled,
    thinkingBlockRenderedRef,
  ]);

  return { persistThinkingTagState };
}
