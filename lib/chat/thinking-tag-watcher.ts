export const THINKING_BLOCK_RENDERED_EVENT = 'thinking-block-rendered';

export interface ThinkingBlockEventDetail {
  messageId: string;
  conversationId?: string | null;
}

/**
 * 触发思维链渲染事件（用于在渲染出正确包裹时通知逻辑层）
 */
export function emitThinkingBlockRendered(detail: ThinkingBlockEventDetail) {
  if (typeof window === 'undefined' || !detail.messageId) return;
  window.dispatchEvent(new CustomEvent(THINKING_BLOCK_RENDERED_EVENT, { detail }));
}

/**
 * 监听思维链渲染事件
 */
export function addThinkingBlockRenderedListener(
  listener: (detail: ThinkingBlockEventDetail) => void
) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const custom = event as CustomEvent<ThinkingBlockEventDetail>;
    listener(custom.detail);
  };

  window.addEventListener(THINKING_BLOCK_RENDERED_EVENT, handler);
  return () => window.removeEventListener(THINKING_BLOCK_RENDERED_EVENT, handler);
}
