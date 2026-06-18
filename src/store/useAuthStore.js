import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  currentUser: null,
  setCurrentUser: (currentUser) => set({ currentUser }),
  clearCurrentUser: () => set({ currentUser: null }),
}))
