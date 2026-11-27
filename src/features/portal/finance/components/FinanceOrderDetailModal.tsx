import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarCircleOutlined,
  InboxOutlined,
  ReloadOutlined,
  PictureOutlined,
  RiseOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Image, Select, Space, Spin, Timeline, Typography } from 'antd'

import { DetailDrawer, FormattedDateTime, humanizeCode, MetricCard, StatusTag } from '@/shared/ui'

import { type FinanceSnapshot, type FinanceParams, getOrderFinanceSummary } from '../api/financeApi'
import styles from '../pages/FinanceWorkspacePage.module.scss'
import { formatFinanceMoney } from './financeFormatters'

interface FinanceOrderDetailModalProps {
  filters?: FinanceParams
  selectedOrder?:
    (Pick<FinanceSnapshot, 'orderId'> & Partial<FinanceSnapshot> & { currency?: string }) | null
  canWrite: boolean
  isRecalculatingOrder: boolean
  isRecalculatingItem: boolean
  onClose: () => void
  onInspectItem: (orderItemId: string) => void
  onRecalculateOrder: (orderId: string) => void
  onRecalculateItem: (orderItemId: string) => void
}

export const FinanceOrderDetailModal: React.FC<FinanceOrderDetailModalProps> = ({
  filters,
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
  const [currencyChoice, setCurrencyChoice] = useState<{ key: string; currency: string }>()
  const selectionKey = `${selectedOrder?.orderId}|${selectedOrder?.currency || selectedOrder?.revenue?.currency || ''}`
  const currency =
    currencyChoice?.key === selectionKey
      ? currencyChoice.currency
      : selectedOrder?.currency || selectedOrder?.revenue?.currency

  const orderDetail = useQuery({
    queryKey: ['finance', 'orders', selectedOrder?.orderId, 'summary', filters],
    queryFn: () =>
      filters
        ? getOrderFinanceSummary(selectedOrder!.orderId, filters)
        : getOrderFinanceSummary(selectedOrder!.orderId),
    enabled: Boolean(selectedOrder?.orderId),
    retry: false,
  })
  const groups = orderDetail.data?.summaryByCurrency
  const summary =
    groups?.find((group) => group.currency === currency) || groups?.[0] || orderDetail.data

  return (
    <DetailDrawer
      width="min(1360px, 92vw)"
      open={Boolean(selectedOrder)}
      title={t('finance.detail.title')}
      footer={null}
      onClose={onClose}
      destroyOnHidden
      allowModeToggle
      allowMaximize
    >
      {orderDetail.isLoading ? (
        <Spin />
      ) : summary ? (
        <Space orientation="vertical" className={styles.detail} size="large">
          {groups && groups.length > 1 ? (
            <Select
              aria-label={t('finance.filters.currency')}
              value={summary.currency}
              onChange={(value) => setCurrencyChoice({ key: selectionKey, currency: value })}
              options={groups.map((group) => ({ value: group.currency, label: group.currency }))}
            />
          ) : null}
          <div className={styles.detailSummary}>
            <MetricCard
              icon={<InboxOutlined />}
              label={t('finance.detail.items')}
              value={String(summary.itemCount)}
              variant="neutral"
            />
            <MetricCard
              icon={<DollarCircleOutlined />}
              label={t('finance.columns.revenue')}
              value={formatFinanceMoney(summary.customerPaidAmount, summary.currency || 'USD')}
              variant="primary"
            />
            <MetricCard
              icon={<DollarCircleOutlined />}
              label="Net revenue"
              value={formatFinanceMoney(
                summary.recognizedNetRevenueAmount,
                summary.currency || 'USD',
              )}
              variant="neutral"
            />
            <MetricCard
              icon={<WalletOutlined />}
              label={t('finance.columns.cost')}
              value={formatFinanceMoney(summary.totalCostAmount, summary.currency || 'USD')}
              variant="warning"
            />
            <MetricCard
              icon={<RiseOutlined />}
              label={t('finance.columns.profit')}
              value={formatFinanceMoney(summary.grossProfitAmount, summary.currency || 'USD')}
              variant="success"
            />
          </div>

          {(() => {
            const orderCurrency = summary.currency || 'USD'
            const totalMarketplaceFee = summary.marketplaceFeeAmount
            const totalRefundDiscount = summary.revenueAdjustmentAmount
            const computedTotalCost = summary.totalCostAmount
            const isProfitable = (summary.grossProfitAmount ?? 0) >= 0
            const grossMarginBps = summary.grossMarginBps
            const marginPercent = grossMarginBps != null ? (grossMarginBps / 100).toFixed(1) : null
            const marginVal = grossMarginBps != null ? grossMarginBps / 100 : 0

            return (
              <div
                className={styles.waterfallCard}
                role="region"
                aria-label={t('finance.detail.pnlWaterfall')}
              >
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
                      {formatFinanceMoney(summary.customerPaidAmount, orderCurrency)}
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
                      {t('finance.detail.revenueAdjustment')}
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
                      {formatFinanceMoney(summary.grossProfitAmount, orderCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}

          {summary.snapshots.map((snapshot, index) => (
            <section key={snapshot.orderItemId} className={styles.itemBreakdown}>
              <div className={styles.itemHeader}>
                <Space align="center" size={12}>
                  {snapshot.productImageUrl ? (
                    <Image
                      src={snapshot.productImageUrl}
                      alt={snapshot.productTitle || ''}
                      width={44}
                      height={44}
                      style={{
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        fontSize: 18,
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <PictureOutlined />
                    </div>
                  )}
                  <Space orientation="vertical" size={2}>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      {t('finance.detail.item', { number: index + 1 })}:{' '}
                      {snapshot.productTitle || 'Custom Product'}
                    </Typography.Title>
                    {snapshot.productSku ? (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        SKU: {snapshot.productSku}
                      </Typography.Text>
                    ) : null}
                  </Space>
                </Space>
                <Space wrap>
                  <StatusTag
                    status={
                      snapshot.revenue.financialStatus === 'ACTIVE' ? 'operational' : 'warning'
                    }
                  >
                    {snapshot.revenue.financialStatus || 'ACTIVE'}
                  </StatusTag>
                  <Button
                    size="small"
                    onClick={() => {
                      if (snapshot.orderItemId) onInspectItem(snapshot.orderItemId)
                    }}
                  >
                    {t('finance.actions.inspectItem')}
                  </Button>
                  {canWrite ? (
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      loading={isRecalculatingItem}
                      onClick={() =>
                        snapshot.orderItemId && onRecalculateItem(snapshot.orderItemId)
                      }
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
                          {snapshot.revenue.feeConfidence === 'ALLOCATED' ? (
                            <StatusTag status="warning">
                              {t('finance.detail.allocatedFee')}
                            </StatusTag>
                          ) : snapshot.revenue.feeSource ? (
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
                      <span>Net revenue</span>
                      <strong>
                        {formatFinanceMoney(
                          snapshot.recognizedNetRevenueAmount,
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
                {snapshot.actualVendorCost?.totalAmount != null ? (
                  <section className={styles.itemGroup}>
                    <Typography.Text strong>
                      {t('finance.metrics.actualVendorCost')}
                    </Typography.Text>
                    {snapshot.actualVendorCost.allocation ? (
                      <Typography.Paragraph type="secondary">
                        {t('finance.detail.vendorAllocation', {
                          order: snapshot.actualVendorCost.allocation.vendorOrderId,
                          total: formatFinanceMoney(
                            snapshot.actualVendorCost.allocation.totalAmount,
                            snapshot.actualVendorCost.allocation.currency,
                          ),
                          count: snapshot.actualVendorCost.allocation.orderItemIds.length,
                        })}
                      </Typography.Paragraph>
                    ) : null}
                    <div className={styles.itemStats}>
                      <div>
                        <span>Vendor base cost</span>
                        <strong>
                          {formatFinanceMoney(
                            snapshot.actualVendorCost.baseCostAmount,
                            snapshot.actualVendorCost.currency || snapshot.revenue.currency,
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Vendor shipping</span>
                        <strong>
                          {formatFinanceMoney(
                            snapshot.actualVendorCost.shippingAmount,
                            snapshot.actualVendorCost.currency || snapshot.revenue.currency,
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Vendor total</span>
                        <strong>
                          {formatFinanceMoney(
                            snapshot.actualVendorCost.totalAmount,
                            snapshot.actualVendorCost.currency || snapshot.revenue.currency,
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Estimate variance</span>
                        <strong>
                          {formatFinanceMoney(
                            snapshot.costVarianceAmount,
                            snapshot.actualVendorCost.currency || snapshot.revenue.currency,
                          )}
                        </strong>
                      </div>
                    </div>
                  </section>
                ) : null}
                <section className={styles.itemGroup}>
                  <Typography.Text strong>{t('finance.detail.costProfit')}</Typography.Text>
                  <div className={styles.itemStats}>
                    {(snapshot.costComponents || []).map((component) => (
                      <div key={component.code}>
                        <span>
                          {t(`finance.costComponents.${component.code}`, {
                            defaultValue: component.label || humanizeCode(component.code),
                          })}
                        </span>
                        <strong>
                          {formatFinanceMoney(component.amount, snapshot.revenue.currency)}
                        </strong>
                      </div>
                    ))}
                  </div>
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
                          {humanizeCode(entry.snapshotStatus)}
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
    </DetailDrawer>
  )
}
