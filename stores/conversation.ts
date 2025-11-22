import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConversationState {
  currentConversationId: string | null;
  setCurrentConversation: (id: string | null) => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set) => ({
      currentConversationId: null,
      setCurrentConversation: (id) => set({ currentConversationId: id }),
    }),
    {
      name: 'emotichat-conversation',
    }
  )
);