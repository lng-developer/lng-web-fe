import { useTranslation } from 'react-i18next'
import { Button, Result, Space, Typography } from 'antd'

import styles from './TeamTasksPage.module.scss'

export function TeamTasksPage() {
  const { t } = useTranslation()

  return (
    <section className={styles.notice}>
      <div className={styles.media}>
        <img
          className={styles.illustration}
          src="https://res.cloudinary.com/dlypxtccj/image/upload/f_auto,q_auto/v1786211315/lng-system/error-pages/404-not-found.png"
          alt={t('notFound.illustrationAlt')}
        />
      </div>
      <Result
        icon={null}
        title={<Typography.Title level={2}>{t('teamTasks.title')}</Typography.Title>}
        subTitle={
          <div className={styles.description}>
            <Typography.Text>{t('teamTasks.description')}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{t('teamTasks.hint')}</Typography.Text>
          </div>
        }
        extra={
          <Space className={styles.actions}>
            <Button type="primary" href="/portal/dashboard">
              {t('teamTasks.backToDashboard')}
            </Button>
            <Button href={window.location.pathname} onClick={() => window.location.reload()}>
              {t('errors.tryAgain')}
            </Button>
          </Space>
        }
      />
    </section>
  )
}
