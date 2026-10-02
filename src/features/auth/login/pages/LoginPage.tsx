import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { GithubFilled, LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, Divider, Form, Input, Space, Typography } from 'antd'

import { ApiError } from '@/shared/api'
import { getAccessToken } from '@/shared/auth/session'
import { brandAssets } from '@/shared/config/brandAssets'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { ThemeSwitch } from '@/shared/theme/ThemeSwitch'

import { login } from '../../api/authApi'
import { useGoogleLoginHandler } from '../../google/useGoogleLoginHandler'
import { useMicrosoftLoginHandler } from '../../microsoft/useMicrosoftLoginHandler'
import styles from './LoginPage.module.scss'
type LoginValues = { identifier: string; password: string }
export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | undefined>(() => {
    const msalError = sessionStorage.getItem('msal_login_error')
    if (msalError) {
      sessionStorage.removeItem('msal_login_error')
      return msalError
    }
    return undefined
  })
  const [submitting, setSubmitting] = useState(false)
  const { triggerGoogleLogin, googleLoading, googleError } = useGoogleLoginHandler()
  const { triggerMicrosoftLogin, microsoftLoading, microsoftError } = useMicrosoftLoginHandler()
  // Google sign-in is kept in codebase but hidden by default per user request
  const showGoogleLogin = Boolean(window.sessionStorage?.getItem('enable_google_login'))

  useEffect(() => {
    if (getAccessToken()) {
      navigate('/operations-dashboard', { replace: true })
    }
  }, [navigate])
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
        <LanguageSwitch showTooltip={false} />
        <ThemeSwitch showTooltip={false} />
      </div>
      <div className={styles.workspace} role="group" aria-labelledby="login-workspace-title">
        <Card className={styles.card} variant="borderless">
          <section className={styles.intro} aria-label="LNG Web">
            <div className={styles.brandMark}>
              <img className={styles.logo} src={brandAssets.logoWide} alt={t('app.name')} />
              <Typography.Text className={styles.wordmark}>LNG</Typography.Text>
            </div>
            <div className={styles.introInner}>
              <Typography.Title id="login-workspace-title" level={1} className={styles.introTitle}>
                {t('auth.login.welcomeTitle')}
              </Typography.Title>
              <Typography.Paragraph className={styles.introText}>
                {t('auth.login.welcomeDescription')}
              </Typography.Paragraph>
            </div>
          </section>
          <Space orientation="vertical" size={24} className={styles.formContent}>
            {(error || microsoftError || googleError) && (
              <Alert type="error" showIcon message={error || microsoftError || googleError} />
            )}
            <Form<LoginValues> layout="vertical" requiredMark={false} onFinish={onFinish}>
              <Form.Item
                name="identifier"
                label={t('auth.login.identifier')}
                rules={[{ required: true, message: t('auth.login.identifierRequired') }]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined />}
                  placeholder="info@example.com"
                  autoComplete="username"
                />
              </Form.Item>
              <Form.Item
                name="password"
                label={t('auth.login.password')}
                rules={[{ required: true, message: t('auth.login.passwordRequired') }]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="********"
                  autoComplete="current-password"
                />
              </Form.Item>
              <div className={styles.formActions}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>{t('auth.login.rememberMe')}</Checkbox>
                </Form.Item>
                <Link className={styles.recoveryLink} to="/forgot-password">
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>
              <Form.Item className={styles.submit}>
                <Button block size="large" type="primary" htmlType="submit" loading={submitting}>
                  {t('auth.login.submit')}
                </Button>
              </Form.Item>
            </Form>
          </Space>
          <Divider plain className={styles.socialDivider}>
            {t('auth.login.continueWith')}
          </Divider>
          <div className={styles.socialActions} aria-label={t('auth.login.socialOptions')}>
            <Button
              aria-label={t('auth.login.socialMicrosoft')}
              className={styles.microsoftButton}
              shape="circle"
              loading={microsoftLoading}
              disabled={submitting || microsoftLoading}
              onClick={triggerMicrosoftLogin}
              icon={
                <svg viewBox="0 0 21 21" width="18" height="18" aria-hidden="true">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
              }
            />
            {/* Google sign-in temporarily hidden per user request */}
            {showGoogleLogin && (
              <Button
                aria-label={t('auth.login.socialGoogle')}
                className={styles.googleButton}
                shape="circle"
                loading={googleLoading}
                disabled={submitting || googleLoading}
                onClick={triggerGoogleLogin}
                icon={
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#FFC107"
                      d="M43.6 20H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.9 6.1 29.2 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-4z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.9 6.1 29.2 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5 0 9.6-1.9 13.1-5l-6-5.1C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.6 20H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l.1-.1 6 5.1C36.8 38.9 44 34 44 24c0-1.3-.1-2.7-.4-4z"
                    />
                  </svg>
                }
              />
            )}
            <Button
              aria-label={t('auth.login.socialFacebook')}
              className={styles.facebookButton}
              shape="circle"
              icon={
                <svg viewBox="0 0 320 512" aria-hidden="true">
                  <path d="M279.14 288l14.22-92.66h-88.91V127.2c0-25.35 12.42-50.06 52.24-50.06H297V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
                </svg>
              }
            >
              <span className={styles.visuallyHidden}>Facebook</span>
            </Button>
            <Button
              aria-label={t('auth.login.socialX')}
              className={styles.xButton}
              shape="circle"
              icon={
                <svg viewBox="0 0 512 512" aria-hidden="true">
                  <path d="M389.2 48h70.6L305.6 224.2 487 464H345.8L235.2 319.8 109 464H38.5l164.8-188.5L29.2 48H174l99.8 132.1L389.2 48zm-24.8 373.8h39.1L152.7 88h-42l253.7 333.8z" />
                </svg>
              }
            />
            <Button
              aria-label={t('auth.login.socialGithub')}
              className={styles.githubButton}
              shape="circle"
              icon={<GithubFilled />}
            />
          </div>
        </Card>
      </div>
    </main>
  )
}
