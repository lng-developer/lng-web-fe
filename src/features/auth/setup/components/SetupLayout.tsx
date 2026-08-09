import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Steps, Typography } from 'antd'

import { brandAssets } from '@/shared/config/brandAssets'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'

import styles from './SetupLayout.module.scss'

type SetupLayoutProps = {
  currentStep: 0 | 1
  title: string
  description: string
  children: ReactNode
  wide?: boolean
}

export function SetupLayout({ currentStep, title, description, children, wide }: SetupLayoutProps) {
  const { t } = useTranslation()

  return (
    <main className={styles.page}>
      <div className={styles.language}>
        <LanguageSwitch />
      </div>
      <aside className={styles.rail}>
        <div className={styles.brand}>
          <img className={styles.logo} src={brandAssets.logoWide} alt={t('app.name')} />
          <Typography.Title level={3}>{t('app.name')}</Typography.Title>
        </div>
        <div className={styles.railCopy}>
          <Typography.Text className={styles.eyebrow}>{t('auth.setup.eyebrow')}</Typography.Text>
          <Typography.Title level={1}>{t('auth.setup.welcome')}</Typography.Title>
          <Typography.Paragraph>{t('auth.setup.description')}</Typography.Paragraph>
        </div>
        <Steps
          current={currentStep}
          orientation="vertical"
          items={[
            {
              title: t('auth.setup.password.step'),
              content: t('auth.setup.password.stepDescription'),
            },
            {
              title: t('auth.setup.profile.step'),
              content: t('auth.setup.profile.stepDescription'),
            },
          ]}
        />
      </aside>
      <section className={styles.content}>
        <Card className={wide ? styles.wideCard : styles.card} variant="borderless">
          <header className={styles.header}>
            <Typography.Text type="secondary">
              {t('auth.setup.progress', { current: currentStep + 1 })}
            </Typography.Text>
            <Typography.Title level={2}>{title}</Typography.Title>
            <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
          </header>
          {children}
        </Card>
      </section>
    </main>
  )
}
