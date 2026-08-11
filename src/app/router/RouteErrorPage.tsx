import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useNavigate, useRevalidator, useRouteError } from 'react-router-dom'
import { Button, Result, Space, Typography } from 'antd'

import { ApiError } from '@/shared/api'

import styles from './ErrorPages.module.scss'

export function RouteErrorPage() {
  const { t } = useTranslation()
  const error = useRouteError()
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const message =
    error instanceof ApiError || error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
        ? error.data?.message || error.statusText
        : undefined
  const requestId =
    error && typeof error === 'object' && 'requestId' in error
      ? String(error.requestId || '')
      : undefined

  return (
    <main className={styles.errorShell}>
      <section className={styles.errorCard}>
        <div className={styles.media}>
          <img
            className={styles.illustration}
            src="https://res.cloudinary.com/dlypxtccj/image/upload/f_auto,q_auto/v1786211323/lng-system/error-pages/500-error.png"
            alt={t('errors.serverImageAlt')}
          />
        </div>
        <Result
          status="error"
          icon={null}
          title={<Typography.Title level={2}>{t('errors.serverTitle')}</Typography.Title>}
          subTitle={
            <div className={styles.errorDescription}>
              <Typography.Text>{t('errors.technicalHint')}</Typography.Text>
              <br />
              <Space direction="vertical" size={4}>
                {message ? <Typography.Text>{message}</Typography.Text> : null}
                {requestId ? (
                  <Typography.Text type="secondary">
                    {t('errors.requestId')}: {requestId}
                  </Typography.Text>
                ) : null}
              </Space>
            </div>
          }
          extra={
            <Space className={styles.errorActions}>
              <Button onClick={() => navigate(-1)}>{t('errors.goBack')}</Button>
              <Button
                type="primary"
                loading={revalidator.state !== 'idle'}
                onClick={() => window.location.reload()}
              >
                {t('errors.tryAgain')}
              </Button>
            </Space>
          }
        />
      </section>
    </main>
  )
}
