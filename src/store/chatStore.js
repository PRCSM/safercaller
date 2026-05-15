import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useChatStore = create(
  immer((set, get) => ({
    conversations: {},
    activeChat: null,
    unreadCount: 0,

    setMessages: (chatId, messages) =>
      set((s) => {
        if (!s.conversations[chatId]) {
          s.conversations[chatId] = { messages: [], unread: 0 };
        }
        s.conversations[chatId].messages = messages;
      }),

    addMessage: (chatId, message) =>
      set((s) => {
        if (!s.conversations[chatId]) {
          s.conversations[chatId] = { messages: [], unread: 0 };
        }
        s.conversations[chatId].messages.push(message);
        if (s.activeChat !== chatId) {
          s.conversations[chatId].unread = (s.conversations[chatId].unread ?? 0) + 1;
          s.unreadCount += 1;
        }
      }),

    setActiveChat: (chatId) =>
      set((s) => { s.activeChat = chatId; }),

    markRead: (chatId) =>
      set((s) => {
        const c = s.conversations[chatId];
        if (!c) return;
        const prev = c.unread ?? 0;
        c.unread = 0;
        s.unreadCount = Math.max(0, s.unreadCount - prev);
      }),

    reset: () =>
      set((s) => {
        s.conversations = {};
        s.activeChat = null;
        s.unreadCount = 0;
      }),
  }))
);