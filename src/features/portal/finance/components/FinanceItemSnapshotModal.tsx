import React from 'react'
import { useTranslation } from 'react-i18next'
import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Descriptions, Drawer, Space, Spin, Typography } from 'antd'

import { getOrderItemFinanceSnapshot } from '../api/financeApi'
import styles from '../pages/FinanceWorkspacePage.module.scss'
import { formatFinanceMoney } from './financeFormatters'

interface FinanceItemSnapshotModalProps {
  selectedItemId?: string
  canWrite: boolean
  isRecalculatingItem: boolean
  onClose: () => void
  onRecalculateItem: (itemId: string) => void
}

export const FinanceItemSnapshotModal: React.FC<FinanceItemSnapshotModalProps> = ({
  selectedItemId,
  canWrite,
  isRecalculatingItem,
  onClose,
  onRecalculateItem,
}) => {
  const { t } = useTranslation()

  const itemDetail = useQuery({
    queryKey: ['finance', 'order-items', selectedItemId, 'snapshot'],
    queryFn: () => getOrderItemFinanceSnapshot(selectedItemId!),
    enabled: Boolean(selectedItemId),
    retry: false,
  })

  return (
    <Drawer
      placement="right"
      width={760}
      open={Boolean(selectedItemId)}
      title={t('finance.detail.itemSnapshot')}
      onClose={onClose}
      destroyOnHidden
    >
      {itemDetail.isLoading ? (
        <Spin />
      ) : itemDetail.data ? (
        <Space orientation="vertical" size="large" className={styles.detail}>
          <Descriptions
            bordered
            column={3}
            size="small"
            items={[
              {
                key: 'revenue',
                label: t('finance.columns.revenue'),
                children: formatFinanceMoney(
                  itemDetail.data.revenue.customerPaidAmount,
                  itemDetail.data.revenue.currency,
                ),
              },
              {
                key: 'cost',
                label: t('finance.columns.cost'),
                children: formatFinanceMoney(
                  itemDetail.data.cost.totalCostAmount,
                  itemDetail.data.revenue.currency,
                ),
              },
              {
                key: 'profit',
                label: t('finance.columns.profit'),
                children: formatFinanceMoney(
                  itemDetail.data.margin.grossProfitAmount,
                  itemDetail.data.revenue.currency,
                ),
              },
              {
                key: 'status',
                label: t('finance.columns.status'),
                children: itemDetail.data.snapshotStatus,
              },
              {
                key: 'reason',
                label: t('finance.detail.missingReason'),
                children: itemDetail.data.cost.missingCostReason
                  ? t(`finance.missingReasons.${itemDetail.data.cost.missingCostReason}`)
                  : '—',
              },
              {
                key: 'profit-status',
                label: t('finance.detail.profitStatus'),
                children: itemDetail.data.profitStatus || '—',
              },
              {
                key: 'fee-confidence',
                label: t('finance.detail.feeConfidence'),
                children: itemDetail.data.revenue.feeConfidence || '—',
              },
              {
                key: 'cost-basis',
                label: t('finance.detail.costBasis'),
                children: itemDetail.data.cost.costBasis || '—',
              },
              {
                key: 'rate-card',
                label: t('finance.detail.rateCard'),
                children: itemDetail.data.costRate?.version == null
                  ? '—'
                  : `${t('finance.detail.rateVersion', { version: itemDetail.data.costRate.version })} · ${itemDetail.data.costRate.effectiveFrom ? new Date(itemDetail.data.costRate.effectiveFrom).toLocaleDateString() : '—'}`,
              },
              {
                key: 'calculated-at',
                label: t('finance.detail.lastRecalculated'),
                children: itemDetail.data.calculatedAt
                  ? new Date(itemDetail.data.calculatedAt).toLocaleString()
                  : '—',
              },
            ]}
          />
          <section>
            <Typography.Title level={5}>{t('finance.detail.costLines')}</Typography.Title>
            {itemDetail.data.cost.costLines.map((line) => (
              <Typography.Paragraph key={line.code}>
                {line.label || line.code}:{' '}
                {formatFinanceMoney(line.amount, itemDetail.data!.revenue.currency)}
              </Typography.Paragraph>
            ))}
          </section>
          <section>
            <Typography.Title level={5}>{t('finance.detail.sourceReferences')}</Typography.Title>
            {(itemDetail.data.evidence?.sourceReferences || []).length ? (
              itemDetail.data.evidence?.sourceReferences.map((reference, index) => (
                <Typography.Paragraph key={`${reference.importBatchId || reference.sourceRef || 'source'}-${index}`}>
                  {reference.sourceKind}: {reference.sourceRef || '—'}
                  {reference.settlementId ? ` · ${reference.settlementId}` : ''}
                </Typography.Paragraph>
              ))
            ) : (
              <Typography.Text type="secondary">—</Typography.Text>
            )}
          </section>
          {canWrite && selectedItemId ? (
            <Button
              icon={<ReloadOutlined />}
              loading={isRecalculatingItem}
              onClick={() => onRecalculateItem(selectedItemId)}
            >
              {t('finance.actions.recalculateItem')}
            </Button>
          ) : null}
        </Space>
      ) : null}
    </Drawer>
  )
}
