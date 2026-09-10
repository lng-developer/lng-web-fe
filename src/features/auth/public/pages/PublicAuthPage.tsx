import { useTranslation } from 'react-i18next'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Button, Card, Divider, Form, Input, Typography } from 'antd'

import { brandAssets } from '@/shared/config/brandAssets'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'

import styles from './PublicAuthPage.module.scss'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'
import { Link } from 'react-router-dom'

type PublicAuthMode = 'forgot-password' | 'reset-password'

export function PublicAuthPage({ mode }: { mode: PublicAuthMode }) {
  const { t } = useTranslation()
  const isReset = mode === 'reset-password'
  const title = t(`auth.public.${mode}.title`)
  const description = t(`auth.public.${mode}.description`)

  return (
    <main className={styles.page}>
      <div className={styles.preferences}>
        <LanguageSwitch />
        <ThemeSwitch />
      </div>
      <Card className={styles.card} variant="borderless">
        <header className={styles.header}>
          <img className={styles.logo} src={brandAssets.logoWide} alt={t('app.name')} />
          <Typography.Title level={2}>{title}</Typography.Title>
          <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
        </header>
        <Form layout="vertical" requiredMark={false} onFinish={() => undefined}>
          {!isReset && (
            <Form.Item
              name="email"
              label={t('auth.public.email')}
              rules={[{ required: true, type: 'email' }]}
            >
              <Input prefix={<MailOutlined />} size="large" autoComplete="email" />
            </Form.Item>
          )}
          {isReset && (
            <>
              <Form.Item
                name="password"
                label={t('auth.public.newPassword')}
                rules={[{ required: true, min: 6 }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  size="large"
                  autoComplete="new-password"
                />
              </Form.Item>
              <Form.Item
                name="confirmation"
                label={t('auth.public.confirmPassword')}
                rules={[{ required: true }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  size="large"
                  autoComplete="new-password"
                />
              </Form.Item>
            </>
          )}
          <Button block size="large" type="primary" htmlType="submit">
            {t(`auth.public.${mode}.submit`)}
          </Button>
        </Form>
        <Typography.Paragraph className={styles.footer}>
          <Link to="/login">{t('auth.public.backToLogin')}</Link>
        </Typography.Paragraph>
        <Divider plain>{t('auth.login.continueWith')}</Divider>
      </Card>
    </main>
  )
}
