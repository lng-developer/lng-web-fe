import { useTranslation } from 'react-i18next'
import { Button, Tooltip } from 'antd'

import { type Language, LANGUAGE_STORAGE_KEY } from './i18n'
import styles from './LanguageSwitch.module.scss'

type LanguageSwitchProps = {
  showTooltip?: boolean
}

export function LanguageSwitch({ showTooltip = true }: LanguageSwitchProps) {
  const { i18n, t } = useTranslation()
  const language: Language = i18n.resolvedLanguage === 'en' ? 'en' : 'vi'
  const nextLanguage: Language = language === 'en' ? 'vi' : 'en'

  function changeLanguage() {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    void i18n.changeLanguage(nextLanguage)
  }

  const button = (
    <Button
      aria-label={t('language.label')}
      className={styles.button}
      type="text"
      onClick={changeLanguage}
    >
      <span key={language} className={styles.label}>
        {language.toUpperCase()}
      </span>
    </Button>
  )

  return showTooltip ? <Tooltip title={t(`language.${nextLanguage}`)}>{button}</Tooltip> : button
}
