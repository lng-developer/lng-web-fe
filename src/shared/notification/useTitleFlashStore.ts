import { create } from 'zustand'

export interface TitleFlashState {
  flashMessage: string | null
  setFlashMessage: (msg: string | null) => void
  clearFlashMessage: () => void
}

export const useTitleFlashStore = create<TitleFlashState>((set) => ({
  flashMessage: null,
  setFlashMessage: (flashMessage) => set({ flashMessage }),
  clearFlashMessage: () => set({ flashMessage: null }),
}))
