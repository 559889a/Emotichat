'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '@/types';

export function useStreamMetrics(messages: Message[], loading: boolean) {
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(
    loading ? performance.now() : null
  );
  const [lastStreamedMessageIndex, setLastStreamedMessageIndex] = useState<number | null>(null);
  const [lastStreamedTime, setLastStreamedTime] = useState<number | null>(null);
  const [lastStreamedTokenCount, setLastStreamedTokenCount] = useState<number | null>(null);

  useEffect(() => {
    if (loading && loadingStartTime === null) {
      setLoadingStartTime(performance.now());
    } else if (!loading && loadingStartTime !== null) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        const finalTime = (performance.now() - loadingStartTime) / 1000;
        const tokenCount = lastMessage.tokenCount || Math.ceil(lastMessage.content.length / 3);
        setLastStreamedMessageIndex(messages.length - 1);
        setLastStreamedTime(finalTime);
        setLastStreamedTokenCount(tokenCount);
      }
      setLoadingStartTime(null);
    }
  }, [loading, loadingStartTime, messages]);

  return {
    loadingStartTime,
    lastStreamedMessageIndex,
    lastStreamedTime,
    lastStreamedTokenCount,
  };
}

export function useScrollControls() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const scrollToBottom = useCallback((smooth = false) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  }, []);

  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      if (lastScrollTopRef.current - currentScrollTop > 50) {
        userScrolledRef.current = true;
      }
      if (isNearBottom()) {
        userScrolledRef.current = false;
      }
      lastScrollTopRef.current = currentScrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  return {
    scrollContainerRef,
    bottomRef,
    userScrolledRef,
    scrollToBottom,
    isNearBottom,
  };
}
