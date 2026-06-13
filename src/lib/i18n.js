import { initReactI18next } from 'react-i18next'
import i18n from 'i18next'

import en from '@/locales/en/common.json'
import vi from '@/locales/vi/common.json'
import { useUIStore } from '@/store/useUIStore'

// Ngôn ngữ ban đầu lấy từ useUIStore (đã được persist vào localStorage) để
// tránh có 2 nguồn quản lý ngôn ngữ khác nhau. Đổi ngôn ngữ qua i18n.changeLanguage()
// kèm useUIStore.setState() - xem MainLayout.
i18n.use(initReactI18next).init({
  resources: {
    vi: { common: vi },
    en: { common: en },
  },
  lng: useUIStore.getState().language,
  fallbackLng: 'vi',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
