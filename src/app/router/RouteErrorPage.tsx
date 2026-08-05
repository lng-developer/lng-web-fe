import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useNavigate, useRevalidator, useRouteError } from 'react-router-dom'
import { Button, Result, Space, Typography } from 'antd'

import { ApiError } from '@/shared/api'

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
    <main className="route-state">
      <Result
        status="error"
        title={t('errors.unexpected')}
        subTitle={
          <Space orientation="vertical" size={2}>
            {message ? <Typography.Text>{message}</Typography.Text> : null}
            {requestId ? (
              <Typography.Text type="secondary">
                {t('errors.requestId')}: {requestId}
              </Typography.Text>
            ) : null}
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => navigate(-1)}>{t('errors.goBack')}</Button>
            <Button
              type="primary"
              loading={revalidator.state !== 'idle'}
              onClick={() => revalidator.revalidate()}
            >
              {t('errors.tryAgain')}
            </Button>
          </Space>
        }
      />
    </main>
  )
}
