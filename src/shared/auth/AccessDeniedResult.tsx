import { useTranslation } from 'react-i18next'
import { Button, Result, Space, Tag, Typography } from 'antd'
import { useInRouterContext, useNavigate } from 'react-router-dom'

export interface AccessDeniedResultProps {
  title?: string
  subTitle?: string
  backPath?: string
  showTag?: boolean
}

interface ActionButtonsProps {
  backPath: string
  backLabel: string
  homeLabel: string
}

function RouterActions({ backPath, backLabel, homeLabel }: ActionButtonsProps) {
  const navigate = useNavigate()

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(backPath)
    }
  }

  const handleGoHome = () => {
    navigate(backPath)
  }

  return (
    <Space size="middle" style={{ marginTop: 8 }}>
      <Button onClick={handleGoBack}>{backLabel}</Button>
      <Button type="primary" onClick={handleGoHome} data-testid="access-denied-dashboard-btn">
        {homeLabel}
      </Button>
    </Space>
  )
}

function FallbackActions({ backPath, backLabel, homeLabel }: ActionButtonsProps) {
  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else if (typeof window !== 'undefined') {
      window.location.assign(backPath)
    }
  }

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.assign(backPath)
    }
  }

  return (
    <Space size="middle" style={{ marginTop: 8 }}>
      <Button onClick={handleGoBack}>{backLabel}</Button>
      <Button type="primary" onClick={handleGoHome} data-testid="access-denied-dashboard-btn">
        {homeLabel}
      </Button>
    </Space>
  )
}

export function AccessDeniedResult({
  title,
  subTitle,
  backPath = '/portal/dashboard',
  showTag = true,
}: AccessDeniedResultProps = {}) {
  const { t } = useTranslation()
  const inRouter = useInRouterContext()

  const defaultTitle = t('forbidden.title', { defaultValue: 'Không có quyền truy cập' })
  const defaultSubTitle = t('forbidden.subtitle', {
    defaultValue:
      'Tài khoản của bạn chưa được cấp quyền để truy cập tính năng này. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
  })
  const backLabel = t('errors.goBack', { defaultValue: 'Quay lại' })
  const homeLabel = t('forbidden.backHome', { defaultValue: 'Về Dashboard' })

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '24px',
      }}
    >
      <Result
        icon={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <img
              data-testid="access-denied-image"
              src="/assets/images/access-denied-cat.jpg"
              alt={title || defaultTitle}
              style={{
                maxWidth: 420,
                width: '100%',
                height: 'auto',
                borderRadius: 16,
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
                objectFit: 'contain',
              }}
            />
          </div>
        }
        title={
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Typography.Title level={3} style={{ margin: 0 }}>
              {title || defaultTitle}
            </Typography.Title>
            {showTag && (
              <Tag
                color="error"
                style={{ margin: 0, fontWeight: 500, fontSize: 13, padding: '2px 10px' }}
              >
                <span>403</span> · {t('forbidden.code', { defaultValue: 'Từ chối truy cập' })}
              </Tag>
            )}
          </div>
        }
        subTitle={
          <Typography.Paragraph
            type="secondary"
            style={{ maxWidth: 520, margin: '12px auto 0', fontSize: 14 }}
          >
            {subTitle || defaultSubTitle}
          </Typography.Paragraph>
        }
        extra={
          inRouter ? (
            <RouterActions backPath={backPath} backLabel={backLabel} homeLabel={homeLabel} />
          ) : (
            <FallbackActions backPath={backPath} backLabel={backLabel} homeLabel={homeLabel} />
          )
        }
      />
    </div>
  )
}
