'use client';

import { useState, memo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './markdown-renderer';

interface ResponseTimerProps {
  isStreaming: boolean;
  startTime: number | null;
  recordedTime?: number;
}

export const ResponseTimer = memo(function ResponseTimer({
  isStreaming,
  startTime,
  recordedTime,
}: ResponseTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(recordedTime ?? 0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const effectiveStartTime = useRef<number>(startTime ?? performance.now());

  useEffect(() => {
    if (startTime !== null) {
      effectiveStartTime.current = startTime;
    }
  }, [startTime]);

  useEffect(() => {
    if (recordedTime !== undefined) {
      setElapsedTime(recordedTime);
      return;
    }

    if (isStreaming) {
      setElapsedTime((performance.now() - effectiveStartTime.current) / 1000);

      intervalRef.current = setInterval(() => {
        const elapsed = (performance.now() - effectiveStartTime.current) / 1000;
        setElapsedTime(elapsed);
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isStreaming, recordedTime]);

  const formatTime = (seconds: number): string => {
    if (seconds < 0.1) return '0.0s';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs.toFixed(0)}s`;
  };

  return (
    <span
      className={cn(
        'font-mono text-[10px] px-1.5 py-0.5 rounded',
        isStreaming
          ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-600 dark:text-pink-400'
          : 'bg-muted/50 text-muted-foreground'
      )}
    >
      {formatTime(elapsedTime)}
    </span>
  );
});

interface SmoothStreamingContentProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  thinkingTagPrepend?: string;
  thinkingTagAppend?: string;
  disableThinkingBlocks?: boolean;
  messageId?: string;
  onThinkingBlockRender?: () => void;
}

export const SmoothStreamingContent = memo(function SmoothStreamingContent({
  content,
  isStreaming,
  className,
  thinkingTagPrepend,
  thinkingTagAppend,
  disableThinkingBlocks,
  messageId,
  onThinkingBlockRender,
}: SmoothStreamingContentProps) {
  const [displayedContent, setDisplayedContent] = useState(content);
  const bufferRef = useRef<string[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const prevContentLengthRef = useRef<number>(0);

  const MIN_INTERVAL = 20;
  const CHARS_PER_FRAME = 5;

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      bufferRef.current = [];
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const newContentStart = prevContentLengthRef.current;
    const newContent = content.slice(newContentStart);
    prevContentLengthRef.current = content.length;

    if (newContent.length > 0) {
      bufferRef.current.push(...newContent.split(''));
    }

    if (animationRef.current !== null) return;

    const processBuffer = () => {
      const now = performance.now();

      if (now - lastUpdateRef.current < MIN_INTERVAL) {
        animationRef.current = requestAnimationFrame(processBuffer);
        return;
      }

      if (bufferRef.current.length > 0) {
        const adaptiveChars = Math.max(CHARS_PER_FRAME, Math.floor(bufferRef.current.length / 3));
        const charsToAdd = Math.min(adaptiveChars, bufferRef.current.length);
        const newChars = bufferRef.current.splice(0, charsToAdd).join('');

        setDisplayedContent((prev) => prev + newChars);
        lastUpdateRef.current = now;

        if (bufferRef.current.length > 0) {
          animationRef.current = requestAnimationFrame(processBuffer);
        } else {
          animationRef.current = null;
        }
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(processBuffer);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [content, isStreaming]);

  useEffect(() => {
    if (!isStreaming && displayedContent !== content) {
      bufferRef.current = [];
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setDisplayedContent(content);
      prevContentLengthRef.current = content.length;
    }
  }, [isStreaming, content, displayedContent]);

  useEffect(() => {
    if (content.length < displayedContent.length) {
      bufferRef.current = [];
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setDisplayedContent(content);
      prevContentLengthRef.current = content.length;
    }
  }, [content, displayedContent]);

  return (
    <div className={cn('transition-opacity duration-100', className)}>
      <MarkdownRenderer
        content={displayedContent}
        thinkingTagPrepend={thinkingTagPrepend}
        thinkingTagAppend={thinkingTagAppend}
        disableThinkingBlocks={disableThinkingBlocks}
        messageId={messageId}
        onThinkingBlockRender={onThinkingBlockRender}
      />
      {isStreaming && displayedContent.length > 0 && (
        <span className="inline-block w-0.5 h-4 bg-gradient-to-b from-pink-500 to-purple-500 animate-pulse ml-0.5 align-middle rounded-full" />
      )}
    </div>
  );
});
