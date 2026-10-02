import { initReactI18next } from 'react-i18next'
import i18n from 'i18next'

import en from './locales/en/common.json'
import vi from './locales/vi/common.json'

export const LANGUAGE_STORAGE_KEY = 'lng.language'
export type Language = 'vi' | 'en'

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return storedLanguage === 'vi' ? 'vi' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    vi: { common: vi },
    en: { common: en },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export default i18n
