import { create } from 'zustand';

interface LayoutState {
  isChatbotOpen: boolean;
  toggleChatbot: () => void;
  setChatbotOpen: (isOpen: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isChatbotOpen: true,
  toggleChatbot: () => set((state) => ({ isChatbotOpen: !state.isChatbotOpen })),
  setChatbotOpen: (isOpen) => set({ isChatbotOpen: isOpen }),
}));
