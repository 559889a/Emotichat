'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConversationSummary, CreateConversationInput } from '@/types/conversation';

// 全局事件名称：用于通知所有组件刷新对话列表
export const CONVERSATIONS_UPDATED_EVENT = 'conversationsUpdated';

// 触发全局刷新事件的工具函数
export function emitConversationsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONVERSATIONS_UPDATED_EVENT));
  }
}

interface UseConversationsReturn {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createConversation: (input: CreateConversationInput) => Promise<ConversationSummary | null>;
  deleteConversation: (id: string) => Promise<boolean>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/conversations');
      const data = await res.json();

      if (data.success) {
        setConversations(data.data);
      } else {
        setError(data.error || '获取对话列表失败');
      }
    } catch (err) {
      setError('网络错误，无法获取对话列表');
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 监听全局刷新事件，当其他组件删除/更新对话时自动刷新
  useEffect(() => {
    const handleConversationsUpdated = () => {
      fetchConversations();
    };

    window.addEventListener(CONVERSATIONS_UPDATED_EVENT, handleConversationsUpdated);
    return () => {
      window.removeEventListener(CONVERSATIONS_UPDATED_EVENT, handleConversationsUpdated);
    };
  }, [fetchConversations]);

  const createConversation = useCallback(async (input: CreateConversationInput): Promise<ConversationSummary | null> => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (data.success) {
        await fetchConversations(); // 重新获取列表
        emitConversationsUpdated(); // 通知其他组件刷新
        return data.data;
      } else {
        setError(data.error || '创建对话失败');
        return null;
      }
    } catch (err) {
      setError('网络错误，无法创建对话');
      console.error('Failed to create conversation:', err);
      return null;
    }
  }, [fetchConversations]);

  const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        await fetchConversations(); // 重新获取列表
        emitConversationsUpdated(); // 通知其他组件刷新
        return true;
      } else {
        setError(data.error || '删除对话失败');
        return false;
      }
    } catch (err) {
      setError('网络错误，无法删除对话');
      console.error('Failed to delete conversation:', err);
      return false;
    }
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    createConversation,
    deleteConversation,
  };
}