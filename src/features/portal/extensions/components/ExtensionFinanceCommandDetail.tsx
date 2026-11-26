import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Space, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { listImportBatches } from '@/features/portal/finance/api/financeApi'
import { integrationKeys } from '@/features/portal/integrations/api/integrationKeys'
import {
  FinanceImportBatchDetail,
  FinanceImportStatus,
} from '@/features/portal/integrations/components/FinanceImportBatchDetail'
import type { FinanceImportSourceType } from '@/features/portal/integrations/hooks/useFinanceImports'
import { FeedbackAlert, FormattedDateTime } from '@/shared/ui'

import type { ExtensionCommand } from '../api/extensionApi'
import styles from './ExtensionFinanceCommandDetail.module.scss'

export function ExtensionFinanceCommandDetail({
  account,
  command,
  sourceType,
  onClose,
}: {
  readonly account: CurrentAccount
  readonly command: ExtensionCommand
  readonly sourceType: FinanceImportSourceType
  readonly onClose: () => void
}) {
  const { t } = useTranslation()
  const dateFrom = command.startedAt ?? command.claimedAt
  const dateTo = command.completedAt
  const filters = { shopId: command.shopId, sourceType, dateFrom, dateTo }
  const legacyBatches = useQuery({
    queryKey: [...integrationKeys.all, 'command-finance-batches', filters],
    queryFn: () => listImportBatches({ ...filters, page: 1, limit: 100 }),
    enabled:
      !command.importJobId &&
      Boolean(command.shopId && dateFrom && dateTo) &&
      ['SUCCEEDED', 'PARTIAL_FAILED'].includes(command.status),
    retry: false,
  })

  return (
    <FinanceImportBatchDetail
      account={account}
      sourceType={sourceType}
      title={t(`extensionCommand.types.${command.type}`)}
      batchId={command.importJobId ?? undefined}
      candidates={legacyBatches.data?.items}
      expectedShopId={command.shopId}
      commandError={command.errorMessage}
      noBatchContent={
        <FinanceCommandWithoutBatch command={command} lookupFailed={legacyBatches.isError} />
      }
      loading={legacyBatches.isLoading}
      onClose={onClose}
    />
  )
}

function FinanceCommandWithoutBatch({
  command,
  lookupFailed,
}: {
  readonly command: ExtensionCommand
  readonly lookupFailed: boolean
}) {
  const { t, i18n } = useTranslation()
  const dateFormat =
    i18n.resolvedLanguage === 'vi' ? 'DD/MM/YYYY HH:mm:ss' : 'MMM D, YYYY h:mm:ss A'
  const dates = [
    { key: 'created', label: t('common.created'), value: command.createdAt },
    { key: 'claimed', label: t('extensionCommand.claimedAt'), value: command.claimedAt },
    { key: 'started', label: t('extensionCommand.startedAt'), value: command.startedAt },
    { key: 'finished', label: t('portal.integrations.panel.finished'), value: command.completedAt },
  ]
  const emptyTitle =
    command.status === 'SUCCEEDED' && command.result?.importedCount === 0
      ? t('portal.integrations.financeImports.details.noImportedRows')
      : t('portal.integrations.financeImports.details.noLinkedReport')

  return (
    <div className={styles.summary}>
      <Space wrap size={12}>
        <FinanceImportStatus
          status={command.status === 'SUCCEEDED' ? 'COMPLETED' : command.status}
        />
        {command.result ? (
          <>
            <Typography.Text type="secondary">
              {t('portal.integrations.panel.imported')}: {command.result.importedCount}
            </Typography.Text>
            <Typography.Text type="secondary">
              {t('portal.integrations.panel.failed')}: {command.result.failedCount}
            </Typography.Text>
          </>
        ) : null}
      </Space>
      {command.errorMessage ? (
        <FeedbackAlert
          type="error"
          title={t('portal.integrations.financeImports.details.errorReason')}
          description={command.errorMessage}
        />
      ) : null}
      <dl className={styles.dates}>
        {dates
          .filter(({ value }) => Boolean(value))
          .map(({ key, label, value }) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                <FormattedDateTime value={value} format={dateFormat} showRelative={false} />
              </dd>
            </div>
          ))}
      </dl>
      {lookupFailed ? (
        <FeedbackAlert
          type="error"
          title={t('portal.integrations.financeImports.details.loadFailed')}
        />
      ) : (
        <Typography.Text type="secondary">{emptyTitle}</Typography.Text>
      )}
    </div>
  )
}
