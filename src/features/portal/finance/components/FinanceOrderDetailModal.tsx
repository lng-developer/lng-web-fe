import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarCircleOutlined,
  InboxOutlined,
  ReloadOutlined,
  RiseOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Modal, Space, Spin, Timeline, Typography } from 'antd'

import { FormattedDateTime, MetricCard, StatusTag } from '@/shared/ui'

import { type FinanceSnapshot, getOrderFinanceSummary } from '../api/financeApi'
import styles from '../pages/FinanceWorkspacePage.module.scss'
import { formatFinanceMoney } from './financeFormatters'

interface FinanceOrderDetailModalProps {
  selectedOrder?: FinanceSnapshot
  canWrite: boolean
  isRecalculatingOrder: boolean
  isRecalculatingItem: boolean
  onClose: () => void
  onInspectItem: (orderItemId: string) => void
  onRecalculateOrder: (orderId: string) => void
  onRecalculateItem: (orderItemId: string) => void
}

export const FinanceOrderDetailModal: React.FC<FinanceOrderDetailModalProps> = ({
  selectedOrder,
  canWrite,
  isRecalculatingOrder,
  isRecalculatingItem,
  onClose,
  onInspectItem,
  onRecalculateOrder,
  onRecalculateItem,
}) => {
  const { t } = useTranslation()

  const orderDetail = useQuery({
    queryKey: ['finance', 'orders', selectedOrder?.orderId, 'summary'],
    queryFn: () => getOrderFinanceSummary(selectedOrder!.orderId),
    enabled: Boolean(selectedOrder?.orderId),
    retry: false,
  })

  return (
    <Modal
      width={900}
      open={Boolean(selectedOrder)}
      title={t('finance.detail.title')}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
    >
      {orderDetail.isLoading ? (
        <Spin />
      ) : orderDetail.data ? (
        <Space orientation="vertical" className={styles.detail} size="large">
          <div className={styles.detailSummary}>
            <MetricCard
              icon={<InboxOutlined />}
              label={t('finance.detail.items')}
              value={String(orderDetail.data.itemCount)}
              variant="neutral"
            />
            <MetricCard
              icon={<DollarCircleOutlined />}
              label={t('finance.columns.revenue')}
              value={formatFinanceMoney(
                orderDetail.data.customerPaidAmount,
                orderDetail.data.currency || 'USD',
              )}
              variant="primary"
            />
            <MetricCard
              icon={<WalletOutlined />}
              label={t('finance.columns.cost')}
              value={formatFinanceMoney(
                orderDetail.data.totalCostAmount,
                orderDetail.data.currency || 'USD',
              )}
              variant="warning"
            />
            <MetricCard
              icon={<RiseOutlined />}
              label={t('finance.columns.profit')}
              value={formatFinanceMoney(
                orderDetail.data.grossProfitAmount,
                orderDetail.data.currency || 'USD',
              )}
              variant="success"
            />
          </div>

          {(() => {
            const orderCurrency = orderDetail.data.currency || 'USD'
            const totalMarketplaceFee = orderDetail.data.snapshots.reduce(
              (acc, s) => acc + (s.orderPnl?.marketplaceFeeAmount ?? 0),
              0,
            )
            const totalRefundDiscount = orderDetail.data.snapshots.reduce(
              (acc, s) => acc + (s.orderPnl?.refundAmount ?? 0) + (s.orderPnl?.discountAmount ?? 0),
              0,
            )
            const totalBaseCost = orderDetail.data.snapshots.reduce(
              (acc, s) => acc + (s.orderPnl?.baseCostAmount ?? 0),
              0,
            )
            const totalFulfillmentCost = orderDetail.data.snapshots.reduce(
              (acc, s) => acc + (s.orderPnl?.additionalFulfillmentCostAmount ?? 0),
              0,
            )
            const computedTotalCost =
              orderDetail.data.totalCostAmount ?? totalBaseCost + totalFulfillmentCost
            const isProfitable = (orderDetail.data.grossProfitAmount ?? 0) >= 0
            const grossMarginBps = orderDetail.data.grossMarginBps
            const marginPercent = grossMarginBps != null ? (grossMarginBps / 100).toFixed(1) : null
            const marginVal = grossMarginBps != null ? grossMarginBps / 100 : 0

            return (
              <div className={styles.waterfallCard}>
                <div className={styles.waterfallHeader}>
                  <Typography.Text strong>{t('finance.detail.pnlWaterfall')}</Typography.Text>
                  {marginPercent != null && (
                    <span
                      className={`${styles.marginPill} ${
                        marginVal >= 20
                          ? styles.marginPillSuccess
                          : marginVal >= 10
                            ? styles.marginPillWarning
                            : styles.marginPillDanger
                      }`}
                    >
                      {marginPercent}% Margin
                    </span>
                  )}
                </div>
                <div className={styles.waterfallSteps}>
                  <div className={`${styles.waterfallStep} ${styles.waterfallInflow}`}>
                    <span className={styles.waterfallStepTitle}>
                      {t('finance.columns.revenue')}
                    </span>
                    <span className={styles.waterfallStepValue}>
                      {formatFinanceMoney(orderDetail.data.customerPaidAmount, orderCurrency)}
                    </span>
                  </div>
                  <div className={`${styles.waterfallStep} ${styles.waterfallOutflow}`}>
                    <span className={styles.waterfallStepTitle}>{t('finance.detail.fees')}</span>
                    <span className={styles.waterfallStepValue}>
                      -{formatFinanceMoney(totalMarketplaceFee, orderCurrency)}
                    </span>
                  </div>
                  <div className={`${styles.waterfallStep} ${styles.waterfallOutflow}`}>
                    <span className={styles.waterfallStepTitle}>
                      {t('finance.detail.refund')} / {t('finance.detail.discount')}
                    </span>
                    <span className={styles.waterfallStepValue}>
                      -{formatFinanceMoney(totalRefundDiscount, orderCurrency)}
                    </span>
                  </div>
                  <div className={`${styles.waterfallStep} ${styles.waterfallOutflow}`}>
                    <span className={styles.waterfallStepTitle}>{t('finance.columns.cost')}</span>
                    <span className={styles.waterfallStepValue}>
                      -{formatFinanceMoney(computedTotalCost, orderCurrency)}
                    </span>
                  </div>
                  <div
                    className={`${styles.waterfallStep} ${
                      isProfitable ? styles.waterfallProfit : styles.waterfallLoss
                    }`}
                  >
                    <span className={styles.waterfallStepTitle}>{t('finance.columns.profit')}</span>
                    <span className={styles.waterfallStepValue}>
                      {formatFinanceMoney(orderDetail.data.grossProfitAmount, orderCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}

          {orderDetail.data.snapshots.map((snapshot, index) => (
            <section key={snapshot.orderItemId} className={styles.itemBreakdown}>
              <div className={styles.itemHeader}>
                <Typography.Title level={5}>
                  {t('finance.detail.item', { number: index + 1 })}
                </Typography.Title>
                <Space wrap>
                  <Button
                    size="small"
                    onClick={() => {
                      onInspectItem(snapshot.orderItemId)
                    }}
                  >
                    {t('finance.actions.inspectItem')}
                  </Button>
                  {canWrite ? (
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      loading={isRecalculatingItem}
                      onClick={() => onRecalculateItem(snapshot.orderItemId)}
                    >
                      {t('finance.actions.recalculateItem')}
                    </Button>
                  ) : null}
                </Space>
              </div>
              <div className={styles.itemGroups}>
                <section className={styles.itemGroup}>
                  <Typography.Text strong>{t('finance.detail.revenueDeductions')}</Typography.Text>
                  <div className={styles.itemStats}>
                    <div>
                      <span>{t('finance.columns.revenue')}</span>
                      <strong>
                        {formatFinanceMoney(
                          snapshot.revenue.customerPaidAmount,
                          snapshot.revenue.currency,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>{t('finance.detail.fees')}</span>
                      <strong>
                        <Space size="small">
                          {formatFinanceMoney(
                            snapshot.orderPnl?.marketplaceFeeAmount,
                            snapshot.revenue.currency,
                          )}
                          {snapshot.revenue.feeSource ? (
                            <StatusTag
                              status={
                                snapshot.revenue.feeSource === 'ESTIMATED_15_PERCENT'
                                  ? 'warning'
                                  : 'operational'
                              }
                            >
                              {t(`finance.detail.feeSources.${snapshot.revenue.feeSource}`)}
                            </StatusTag>
                          ) : null}
                        </Space>
                      </strong>
                    </div>
                    <div>
                      <span>{t('finance.detail.refund')}</span>
                      <strong>
                        {formatFinanceMoney(
                          snapshot.orderPnl?.refundAmount,
                          snapshot.revenue.currency,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>{t('finance.detail.discount')}</span>
                      <strong>
                        {formatFinanceMoney(
                          snapshot.orderPnl?.discountAmount,
                          snapshot.revenue.currency,
                        )}
                      </strong>
                    </div>
                  </div>
                </section>
                <section className={styles.itemGroup}>
                  <Typography.Text strong>{t('finance.detail.costProfit')}</Typography.Text>
                  <div className={styles.itemStats}>
                    <div>
                      <span>{t('finance.detail.baseCost')}</span>
                      <strong>
                        {formatFinanceMoney(
                          snapshot.orderPnl?.baseCostAmount,
                          snapshot.revenue.currency,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>{t('finance.detail.additionalCost')}</span>
                      <strong>
                        {formatFinanceMoney(
                          snapshot.orderPnl?.additionalFulfillmentCostAmount,
                          snapshot.revenue.currency,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>{t('finance.detail.deductions')}</span>
                      <strong>
                        {formatFinanceMoney(
                          snapshot.orderPnl?.totalDeductionAmount,
                          snapshot.revenue.currency,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>{t('finance.columns.profit')}</span>
                      <strong>
                        {formatFinanceMoney(
                          snapshot.orderPnl?.profitAmount,
                          snapshot.revenue.currency,
                        )}
                      </strong>
                    </div>
                  </div>
                </section>
              </div>
              {snapshot.cost.missingCostReason ? (
                <Alert
                  type="warning"
                  showIcon
                  message={t('finance.detail.currentCalculation')}
                  description={t(`finance.missingReasons.${snapshot.cost.missingCostReason}`)}
                />
              ) : null}
              <div className={styles.history}>
                <Typography.Text strong>{t('finance.detail.history')}</Typography.Text>
                <Timeline
                  items={snapshot.calculationHistory.map((entry) => ({
                    color: entry.costStatus === 'MISSING' ? 'red' : 'green',
                    children: (
                      <Space wrap>
                        <FormattedDateTime value={entry.calculatedAt} />
                        <StatusTag
                          status={entry.costStatus === 'MISSING' ? 'critical' : 'operational'}
                        >
                          {entry.snapshotStatus}
                        </StatusTag>
                        {entry.missingCostReason ? (
                          <Typography.Text type="secondary">
                            {t(`finance.missingReasons.${entry.missingCostReason}`)}
                          </Typography.Text>
                        ) : null}
                      </Space>
                    ),
                  }))}
                />
              </div>
            </section>
          ))}
          {canWrite && selectedOrder ? (
            <Button
              icon={<ReloadOutlined />}
              loading={isRecalculatingOrder}
              onClick={() => onRecalculateOrder(selectedOrder.orderId)}
            >
              {t('finance.actions.recalculateOrder')}
            </Button>
          ) : null}
        </Space>
      ) : null}
    </Modal>
  )
}
