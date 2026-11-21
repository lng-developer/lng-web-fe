import { Alert, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

import { DetailDrawer, FormattedDateTime, humanizeCode, StatusTag } from '@/shared/ui'

import type { ExtensionCommand } from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

export interface ExtensionCommandDrawerProps {
  readonly command?: ExtensionCommand
  readonly onClose: () => void
}

export function ExtensionCommandDrawer({ command, onClose }: ExtensionCommandDrawerProps) {
  const { t } = useTranslation()
  return (
    <DetailDrawer
      title="Task details"
      open={Boolean(command)}
      onClose={onClose}
      footer={null}
      width="min(1200px, 90vw)"
      allowModeToggle
      allowMaximize
    >
      {command ? (
        <div className={styles.commandTimeline}>
          <Space>
            <StatusTag
              status={
                command.status === 'SUCCEEDED'
                  ? 'operational'
                  : command.status === 'FAILED'
                    ? 'critical'
                    : command.status === 'PARTIAL_FAILED'
                      ? 'warning'
                      : 'pending'
              }
            >
              {humanizeCode(command.status)}
            </StatusTag>
            <Typography.Text>{command.type}</Typography.Text>
          </Space>
          {command.provider === 'ETSY' ? (
            <Space>
              <Typography.Text>
                {t('portal.integrations.extension.manualRequests.maxOrders')}
              </Typography.Text>
              <Typography.Text>{command.maxOrders}</Typography.Text>
            </Space>
          ) : null}
          {command.importJobId ? (
            <Space>
              <Typography.Text>{t('portal.integrations.panel.title')}</Typography.Text>
              <Typography.Link href={`?selectedJobId=${encodeURIComponent(command.importJobId)}`}>
                {command.importJobId}
              </Typography.Link>
            </Space>
          ) : null}
          {command.result ? (
            <Space>
              <Typography.Text>
                {t('portal.integrations.panel.imported')}: {command.result.importedCount}
              </Typography.Text>
              <Typography.Text>
                {t('portal.integrations.panel.failed')}: {command.result.failedCount}
              </Typography.Text>
            </Space>
          ) : null}
          {[
            ['Created', command.createdAt],
            ['Claimed', command.claimedAt],
            ['Started', command.startedAt],
            [
              command.status === 'FAILED' || command.status === 'PARTIAL_FAILED'
                ? 'Failed'
                : command.status === 'SUCCEEDED'
                  ? 'Completed'
                  : 'Last update',
              command.completedAt,
            ],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div className={styles.commandTimelineRow} key={String(label)}>
                <Typography.Text strong>{label}</Typography.Text>
                <FormattedDateTime value={String(value)} />
              </div>
            ))}
          {command.errorMessage ? (
            <Alert type="error" showIcon title={command.errorMessage} />
          ) : null}
          {command.trackingResults?.length ? (
            <div>
              <Typography.Text strong>Tracking verification</Typography.Text>
              {command.trackingResults.map((result) => (
                <div
                  className={styles.commandTimelineRow}
                  key={`${result.orderId}-${result.trackingNumber}`}
                >
                  <Typography.Text>{result.orderId}</Typography.Text>
                  <Typography.Text>
                    {result.carrier || 'Other'} · {result.trackingNumber}
                  </Typography.Text>
                  <StatusTag
                    status={
                      result.etsyStatus === 'VERIFIED'
                        ? 'operational'
                        : result.etsyStatus === 'FAILED'
                          ? 'critical'
                          : 'warning'
                    }
                  >
                    {humanizeCode(result.etsyStatus)}
                  </StatusTag>
                  {result.errorMessage ? (
                    <Typography.Text type="warning">{result.errorMessage}</Typography.Text>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </DetailDrawer>
  )
}
