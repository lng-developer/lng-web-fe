import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  currentUser: null,
  setCurrentUser: (currentUser) => set({ currentUser }),
  setCurrentUserAccount: (account) =>
    set((state) =>
      state.currentUser ? { currentUser: { ...state.currentUser, account } } : state,
    ),
  clearCurrentUser: () => set({ currentUser: null }),
}))
