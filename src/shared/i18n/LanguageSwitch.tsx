import { useTranslation } from 'react-i18next'
import { Segmented } from 'antd'

import { type Language, LANGUAGE_STORAGE_KEY } from './i18n'

export function LanguageSwitch() {
  const { i18n, t } = useTranslation()
  const language: Language = i18n.resolvedLanguage === 'en' ? 'en' : 'vi'

  function changeLanguage(value: string | number) {
    const nextLanguage: Language = value === 'en' ? 'en' : 'vi'
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    void i18n.changeLanguage(nextLanguage)
  }

  return (
    <Segmented
      aria-label={t('language.label')}
      options={[
        { label: 'VI', value: 'vi', title: t('language.vi') },
        { label: 'EN', value: 'en', title: t('language.en') },
      ]}
      value={language}
      onChange={changeLanguage}
    />
  )
}
