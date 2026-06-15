import { initReactI18next } from 'react-i18next'
import i18n from 'i18next'

import { LANGUAGES } from '@/constants/app'
import { useUIStore } from '@/store/useUIStore'

import en from './locales/en/common.json'
import vi from './locales/vi/common.json'

// Ngôn ngữ ban đầu lấy từ useUIStore (đã được persist vào localStorage) để
// tránh có 2 nguồn quản lý ngôn ngữ khác nhau. Đổi ngôn ngữ qua i18n.changeLanguage()
// kèm useUIStore.setState() - xem MainLayout.
i18n.use(initReactI18next).init({
  resources: {
    [LANGUAGES.VI]: { common: vi },
    [LANGUAGES.EN]: { common: en },
  },
  lng: useUIStore.getState().language,
  fallbackLng: LANGUAGES.VI,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
