import { Alert, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

import { DetailDrawer, FormattedDateTime, StatusTag } from '@/shared/ui'

import type { ExtensionCommand } from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'
import { getExtensionCommandErrorKey } from './extensionHelpers'

export interface ExtensionCommandDrawerProps {
  readonly command?: ExtensionCommand
  readonly showImportJobLink?: boolean
  readonly onClose: () => void
}

export function ExtensionCommandDrawer({
  command,
  showImportJobLink = true,
  onClose,
}: ExtensionCommandDrawerProps) {
  const { t } = useTranslation()
  const errorMessage = command?.errorMessage?.trim()
  const errorKey = getExtensionCommandErrorKey(errorMessage)

  return (
    <DetailDrawer
      title={t('extensionCommand.details')}
      open={Boolean(command)}
      onClose={onClose}
      footer={null}
      width="min(960px, 94vw)"
      allowModeToggle
      allowMaximize
    >
      {command ? (
        <div className={styles.executionDetail}>
          {errorMessage ? (
            <Alert
              className={styles.executionNotice}
              type={errorKey === 'etsyImportNeedsReview' ? 'warning' : 'error'}
              showIcon
              title={t(`extensionCommandErrors.${errorKey}`)}
              description={errorKey === 'seeDetails' ? errorMessage : undefined}
            />
          ) : null}
          <section className={styles.executionSummary}>
            <Typography.Title level={5} className={styles.executionSummaryTitle}>
              {t('portal.integrations.panel.summary')}
            </Typography.Title>
            <dl className={styles.executionFacts}>
              <div>
                <dt>{t('common.status')}</dt>
                <dd>
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
                    {t(`extensionCommand.statuses.${command.status}`, {
                      defaultValue: command.status,
                    })}
                  </StatusTag>
                </dd>
              </div>
              <div>
                <dt>{t('portal.integrations.extension.command')}</dt>
                <dd>
                  {t(`extensionCommand.types.${command.type}`, {
                    defaultValue: t('common.unknown'),
                  })}
                </dd>
              </div>
              {command.provider === 'ETSY' && command.maxOrders != null ? (
                <div>
                  <dt>{t('portal.integrations.extension.manualRequests.maxOrders')}</dt>
                  <dd>{command.maxOrders}</dd>
                </div>
              ) : null}
              {showImportJobLink && command.importJobId ? (
                <div>
                  <dt>{t('portal.integrations.panel.title')}</dt>
                  <dd>
                    <Typography.Link
                      href={`?selectedJobId=${encodeURIComponent(command.importJobId)}`}
                    >
                      {command.importJobId}
                    </Typography.Link>
                  </dd>
                </div>
              ) : null}
              {command.result ? (
                <>
                  <div>
                    <dt>{t('portal.integrations.panel.imported')}</dt>
                    <dd>{command.result.importedCount}</dd>
                  </div>
                  <div>
                    <dt>{t('portal.integrations.panel.failed')}</dt>
                    <dd>{command.result.failedCount}</dd>
                  </div>
                </>
              ) : null}
              {(
                [
                  ['common.created', command.createdAt],
                  ['extensionCommand.claimedAt', command.claimedAt],
                  ['extensionCommand.startedAt', command.startedAt],
                  ['portal.integrations.panel.finished', command.completedAt],
                ] as const
              ).map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <dt>{t(label)}</dt>
                    <dd>
                      <FormattedDateTime value={value} />
                    </dd>
                  </div>
                ) : null,
              )}
            </dl>
          </section>
          {command.trackingResults?.length ? (
            <div>
              <Typography.Text strong>{t('extensionCommand.trackingVerification')}</Typography.Text>
              {command.trackingResults.map((result) => (
                <div
                  className={styles.commandTimelineRow}
                  key={`${result.orderId}-${result.trackingNumber}`}
                >
                  <Typography.Text>{result.orderId}</Typography.Text>
                  <Typography.Text>
                    {result.carrier || t('extensionCommand.otherCarrier')} · {result.trackingNumber}
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
                    {t(`extensionCommand.trackingStatuses.${result.etsyStatus}`, {
                      defaultValue: result.etsyStatus,
                    })}
                  </StatusTag>
                  {result.errorMessage ? (
                    <Typography.Text type="warning" title={result.errorMessage}>
                      {t(
                        `extensionCommandErrors.${getExtensionCommandErrorKey(result.errorMessage)}`,
                      )}
                    </Typography.Text>
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
