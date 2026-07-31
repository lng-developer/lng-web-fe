import { useTranslation } from 'react-i18next'
import { Button, Result } from 'antd'

export function RouteErrorPage() {
  const { t } = useTranslation()

  return (
    <main className="route-state">
      <Result
        status="error"
        title={t('errors.unexpected')}
        extra={
          <Button type="primary" href="/foundation">
            {t('notFound.backHome')}
          </Button>
        }
      />
    </main>
  )
}
