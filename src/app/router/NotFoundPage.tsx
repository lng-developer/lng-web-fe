import { useTranslation } from 'react-i18next'
import { Button, Result, Space, Typography } from 'antd'

import styles from './ErrorPages.module.scss'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <main className={styles.errorShell}>
      <section className={styles.errorCard}>
        <div className={styles.media}>
          <img
            className={styles.illustration}
            src="https://res.cloudinary.com/dlypxtccj/image/upload/f_auto,q_auto/v1786211315/lng-system/error-pages/404-not-found.png"
            alt={t('notFound.illustrationAlt')}
          />
        </div>
        <Result
          icon={null}
          title={<Typography.Title level={2}>{t('notFound.title')}</Typography.Title>}
          subTitle={
            <div className={styles.errorDescription}>
              <Typography.Text>{t('notFound.subtitle')}</Typography.Text>
              <br />
              <Typography.Text type="secondary">{t('notFound.hint')}</Typography.Text>
            </div>
          }
          extra={
            <Space className={styles.errorActions}>
              <Button type="primary" href="/operations-dashboard">
                {t('notFound.backHome')}
              </Button>
              <Button href={window.location.pathname} onClick={() => window.location.reload()}>
                {t('errors.tryAgain')}
              </Button>
            </Space>
          }
        />
      </section>
    </main>
  )
}
