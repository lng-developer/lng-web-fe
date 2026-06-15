import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { LANGUAGES, STORAGE_KEYS, THEME_MODES } from '@/constants/app'

export const useUIStore = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      language: LANGUAGES.VI,
      themeMode: THEME_MODES.LIGHT,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      toggleThemeMode: () =>
        set((state) => ({
          themeMode: state.themeMode === THEME_MODES.LIGHT ? THEME_MODES.DARK : THEME_MODES.LIGHT,
        })),
    }),
    {
      name: STORAGE_KEYS.UI_STORE,
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        language: state.language,
        themeMode: state.themeMode,
      }),
    },
  ),
)
