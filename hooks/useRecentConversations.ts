import { useLocalStorage } from '@/lib/hooks/useLocalStorage';

interface RecentConversation {
  id: string;
  title: string;
  lastAccessedAt: string;
}

export function useRecentConversations() {
  const [recentConversations, setRecentConversations] = useLocalStorage<RecentConversation[]>(
    'emotichat-recent-conversations',
    []
  );

  const addRecentConversation = (conversation: Omit<RecentConversation, 'lastAccessedAt'>) => {
    setRecentConversations((prev) => {
      // 移除重复项
      const filtered = prev.filter((c) => c.id !== conversation.id);
      // 添加到开头,保留最多 10 个
      return [
        { ...conversation, lastAccessedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, 10);
    });
  };

  const removeRecentConversation = (id: string) => {
    setRecentConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const clearRecentConversations = () => {
    setRecentConversations([]);
  };

  return {
    recentConversations,
    addRecentConversation,
    removeRecentConversation,
    clearRecentConversations,
  };
}