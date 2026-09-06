import React from 'react'
import { useTranslation } from 'react-i18next'
import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Descriptions, Modal, Space, Spin, Typography } from 'antd'

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
    <Modal
      centered
      width={760}
      open={Boolean(selectedItemId)}
      title={t('finance.detail.itemSnapshot')}
      footer={null}
      onCancel={onClose}
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
    </Modal>
  )
}
