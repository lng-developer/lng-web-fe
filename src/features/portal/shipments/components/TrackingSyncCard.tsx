import { useTranslation } from 'react-i18next'
import { Button, Select, Space, Switch, Typography } from 'antd'

import { SectionCard, StatusTag } from '@/shared/ui'

import type { TrackingSyncConfig } from '../api/shipmentApi'
import styles from '../pages/ShipmentWorkbenchPage.module.scss'

export interface TrackingSyncCardProps {
  readonly config?: TrackingSyncConfig
  readonly loading: boolean
  readonly saving: boolean
  readonly running: boolean
  readonly onChange: (input: Pick<TrackingSyncConfig, 'enabled' | 'intervalMinutes' | 'batchSize'>) => void
  readonly onRunNow: () => void
}

export function TrackingSyncCard({ config, loading, saving, running, onChange, onRunNow }: TrackingSyncCardProps) {
  const { t } = useTranslation()
  const enabled = config?.enabled ?? false

  return (
    <SectionCard title={t('portal.shipments.trackingSync.title')}>
      <div className={styles.trackingSync}>
        <div>
          <Typography.Text type="secondary">
            {t('portal.shipments.trackingSync.description')}
          </Typography.Text>
          <div className={styles.trackingSyncMeta}>
            <StatusTag status={enabled ? 'operational' : 'draft'}>
              {t(enabled ? 'portal.shipments.trackingSync.enabled' : 'portal.shipments.trackingSync.disabled')}
            </StatusTag>
            {config?.lastRunFinishedAt ? (
              <Typography.Text type="secondary">
                {t('portal.shipments.trackingSync.lastRun', {
                  time: new Date(config.lastRunFinishedAt).toLocaleString(),
                })}
              </Typography.Text>
            ) : null}
          </div>
        </div>
        <Space wrap>
          <Switch
            aria-label={t('portal.shipments.trackingSync.toggle')}
            checked={enabled}
            disabled={loading || saving || !config}
            onChange={(nextEnabled) => config && onChange({ ...config, enabled: nextEnabled })}
          />
          <Select
            aria-label={t('portal.shipments.trackingSync.interval')}
            className={styles.trackingSyncSelect}
            disabled={loading || saving || !config}
            options={[5, 15, 30, 60].map((value) => ({
              value,
              label: t('portal.shipments.trackingSync.everyMinutes', { count: value }),
            }))}
            value={config?.intervalMinutes}
            onChange={(intervalMinutes: TrackingSyncConfig['intervalMinutes']) =>
              config && onChange({ ...config, intervalMinutes })
            }
          />
          <Select
            aria-label={t('portal.shipments.trackingSync.batchSize')}
            className={styles.trackingSyncSelect}
            disabled={loading || saving || !config}
            options={[10, 25, 50, 100].map((value) => ({
              value,
              label: t('portal.shipments.trackingSync.batchSizeValue', { count: value }),
            }))}
            value={config?.batchSize}
            onChange={(batchSize: TrackingSyncConfig['batchSize']) =>
              config && onChange({ ...config, batchSize })
            }
          />
          <Button loading={running} onClick={onRunNow}>
            {t('portal.shipments.trackingSync.runNow')}
          </Button>
        </Space>
        {config?.lastRunSummary ? (
          <Typography.Text type="secondary">
            {t('portal.shipments.trackingSync.lastResult', config.lastRunSummary)}
          </Typography.Text>
        ) : null}
      </div>
    </SectionCard>
  )
}
