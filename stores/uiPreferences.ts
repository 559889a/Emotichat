import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIPreferences {
  // 侧边栏状态
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // 聊天界面偏好
  messageTextSize: 'small' | 'medium' | 'large';
  setMessageTextSize: (size: 'small' | 'medium' | 'large') => void;

  // 窗口大小偏好
  chatWindowWidth: number | null;
  setChatWindowWidth: (width: number | null) => void;

  // 重置所有偏好
  resetPreferences: () => void;
}

const defaultPreferences = {
  sidebarCollapsed: false,
  messageTextSize: 'medium' as const,
  chatWindowWidth: null,
};

export const useUIPreferences = create<UIPreferences>()(
  persist(
    (set) => ({
      ...defaultPreferences,

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setMessageTextSize: (size) => set({ messageTextSize: size }),

      setChatWindowWidth: (width) => set({ chatWindowWidth: width }),

      resetPreferences: () => set(defaultPreferences),
    }),
    {
      name: 'emotichat-ui-preferences', // localStorage key
    }
  )
);