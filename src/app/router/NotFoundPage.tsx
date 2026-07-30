import { useTranslation } from 'react-i18next'
import { Button, Result } from 'antd'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <main className="route-state">
      <Result
        status="404"
        title={<h1>{t('notFound.title')}</h1>}
        extra={
          <Button type="primary" href="/">
            {t('notFound.backHome')}
          </Button>
        }
      />
    </main>
  )
}
