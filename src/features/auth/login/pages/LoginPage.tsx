import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'

import { ApiError } from '@/shared/api'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'

import { login } from '../../api/authApi'
import styles from './LoginPage.module.scss'
type LoginValues = { identifier: string; password: string }
export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  async function onFinish(values: LoginValues) {
    setError(undefined)
    setSubmitting(true)
    try {
      const session = await login(values.identifier, values.password)
      navigate(session.account.mustChangePassword ? '/setup/password' : '/operations-dashboard', {
        replace: true,
      })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('errors.unexpected'))
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <main className={styles.page}>
      <div className={styles.preferences}>
        <LanguageSwitch />
        <ThemeSwitch />
      </div>
      <section className={styles.intro} aria-label="LNG Web">
        <div className={styles.introInner}>
          <img className={styles.logo} src="/assets/images/login-lng-3d.png" alt={t('app.name')} />
          <Typography.Title level={1} className={styles.introTitle}>
            {t('auth.login.title')}
          </Typography.Title>
          <Typography.Paragraph className={styles.introText}>
            {t('auth.login.description')}
          </Typography.Paragraph>
        </div>
      </section>
      <Card className={styles.card} variant="borderless">
        <Space orientation="vertical" size={24} className={styles.formContent}>
          <div className={styles.formHeader}>
            <Typography.Title level={3} className={styles.formTitle}>
              {t('auth.login.welcome')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('auth.login.instruction')}</Typography.Text>
          </div>
          {error && <Alert type="error" showIcon message={error} />}
          <Form<LoginValues> layout="vertical" requiredMark={false} onFinish={onFinish}>
            <Form.Item
              name="identifier"
              label={t('auth.login.identifier')}
              rules={[{ required: true, message: t('auth.login.identifierRequired') }]}
            >
              <Input size="large" prefix={<UserOutlined />} autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="password"
              label={t('auth.login.password')}
              rules={[{ required: true, message: t('auth.login.passwordRequired') }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                autoComplete="current-password"
              />
            </Form.Item>
            <Form.Item className={styles.submit}>
              <Button block size="large" type="primary" htmlType="submit" loading={submitting}>
                {t('auth.login.submit')}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </main>
  )
}
