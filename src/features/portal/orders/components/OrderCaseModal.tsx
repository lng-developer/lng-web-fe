import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Select, Space, Spin, Typography } from 'antd'
import dayjs from 'dayjs'

import { modalQueryOptions } from '@/shared/query/modalQuery'
import { FeedbackAlert, PopupModal, type PopupModalAnchor } from '@/shared/ui'

import { getOrderCase, listOrderCases, type OrderCase, type OrderCaseInput } from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import type { OrderAction } from './orderTypes'

const CASE_TYPES: OrderCase['caseType'][] = [
  'REFUND',
  'RETURN',
  'REPLACEMENT',
  'ADDRESS',
  'CUSTOMIZATION',
  'SHIPMENT',
  'OTHER',
]
const CASE_SEVERITIES: OrderCase['severity'][] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const emptyCase = (orderId: string): OrderCaseInput => ({
  orderId,
  caseType: 'OTHER',
  severity: 'MEDIUM',
  title: '',
  description: '',
})

type OrderCaseModalProps = {
  readonly open: boolean
  readonly anchor?: PopupModalAnchor
  readonly orderId: string
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

export const OrderCaseModal = memo(function OrderCaseModal({
  open,
  anchor,
  orderId,
  pending,
  onClose,
  onAction,
}: OrderCaseModalProps) {
  const { t } = useTranslation()

  const cases = useQuery({
    queryKey: orderKeys.cases(orderId),
    queryFn: () => listOrderCases(orderId),
    enabled: open,
    ...modalQueryOptions,
    retry: false,
  })

  const openCase = cases.data?.items.find((item) => item.status === 'OPEN')

  const caseDetail = useQuery({
    queryKey: orderKeys.caseDetail(openCase?.id ?? ''),
    queryFn: () => getOrderCase(openCase!.id),
    enabled: open && Boolean(openCase?.id),
    ...modalQueryOptions,
    retry: false,
  })

  if (!open) return null

  if (cases.isLoading) {
    return (
      <PopupModal
        anchor={anchor}
        open={open}
        title={t('orders.actions.manageCase')}
        footer={null}
        onCancel={onClose}
      >
        <Spin />
      </PopupModal>
    )
  }

  if (cases.error) {
    return (
      <PopupModal
        anchor={anchor}
        open={open}
        title={t('orders.actions.manageCase')}
        footer={null}
        onCancel={onClose}
      >
        <FeedbackAlert type="error" title={t('orders.messages.caseLoadFailed')} />
      </PopupModal>
    )
  }

  const currentCase = caseDetail.data ?? openCase

  return (
    <CaseEditorModalInner
      key={currentCase?.id ?? 'new-case'}
      orderId={orderId}
      anchor={anchor}
      openCase={currentCase}
      commentsLoading={caseDetail.isLoading}
      pending={pending}
      onClose={onClose}
      onAction={onAction}
    />
  )
})

type CaseEditorModalInnerProps = {
  readonly orderId: string
  readonly anchor?: PopupModalAnchor
  readonly openCase?: OrderCase
  readonly commentsLoading: boolean
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

function CaseEditorModalInner({
  orderId,
  anchor,
  openCase,
  commentsLoading,
  pending,
  onClose,
  onAction,
}: CaseEditorModalInnerProps) {
  const { t } = useTranslation()
  const [comment, setComment] = useState('')
  const [note, setNote] = useState('')
  const [form, setForm] = useState<OrderCaseInput>(() =>
    openCase
      ? {
          orderId,
          orderItemId: openCase.orderItemId ?? undefined,
          caseType: openCase.caseType,
          severity: openCase.severity,
          title: openCase.title,
          description: openCase.description ?? '',
        }
      : emptyCase(orderId),
  )

  const handleAddComment = () => {
    if (!openCase || !comment.trim()) return
    onAction({ kind: 'case-comment', orderCase: openCase, body: comment.trim() })
    setComment('')
  }

  return (
    <PopupModal
      anchor={anchor}
      width={720}
      open
      title={t('orders.actions.manageCase')}
      okText={t(openCase ? 'orders.actions.updateCase' : 'orders.actions.createCase')}
      okButtonProps={{ disabled: !form.title.trim() }}
      confirmLoading={pending}
      onCancel={onClose}
      onOk={() => onAction({ kind: 'case-save', orderCase: openCase, input: form })}
    >
      <div className={styles.modalForm}>
        <div className={styles.caseGrid}>
          <label>
            <Typography.Text>{t('orders.case.type')}</Typography.Text>
            <Select
              value={form.caseType}
              options={CASE_TYPES.map((caseType) => ({ value: caseType, label: caseType }))}
              onChange={(caseType) => setForm((current) => ({ ...current, caseType }))}
            />
          </label>
          <label>
            <Typography.Text>{t('orders.case.severity')}</Typography.Text>
            <Select
              value={form.severity}
              options={CASE_SEVERITIES.map((severity) => ({ value: severity, label: severity }))}
              onChange={(severity) => setForm((current) => ({ ...current, severity }))}
            />
          </label>
        </div>
        <label>
          <Typography.Text>{t('orders.case.title')}</Typography.Text>
          <Input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label>
          <Typography.Text>{t('orders.case.description')}</Typography.Text>
          <Input.TextArea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </label>
        {openCase ? (
          <div className={styles.caseResolution}>
            <Typography.Text strong>{t('orders.case.comments')}</Typography.Text>
            {commentsLoading ? (
              <Spin size="small" />
            ) : openCase.comments?.length ? (
              <div className={styles.caseComments}>
                {openCase.comments.map((item, index) => (
                  <div key={`${item.createdAt}-${index}`}>
                    <Typography.Text>{item.body}</Typography.Text>
                    <Typography.Text type="secondary">
                      {item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : ''}
                    </Typography.Text>
                  </div>
                ))}
              </div>
            ) : (
              <Typography.Text type="secondary">{t('orders.case.noComments')}</Typography.Text>
            )}
            <Space.Compact block>
              <Input
                value={comment}
                placeholder={t('orders.case.newComment')}
                onChange={(event) => setComment(event.target.value)}
              />
              <Button disabled={!comment.trim()} loading={pending} onClick={handleAddComment}>
                {t('orders.actions.addComment')}
              </Button>
            </Space.Compact>
            <Input.TextArea
              value={note}
              placeholder={t('orders.case.outcomeNote')}
              onChange={(event) => setNote(event.target.value)}
            />
            <Space>
              <Button
                icon={<CheckCircleOutlined />}
                onClick={() => onAction({ kind: 'case-resolve', orderCase: openCase, note })}
              >
                {t('orders.actions.resolveCase')}
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => onAction({ kind: 'case-cancel', orderCase: openCase, note })}
              >
                {t('orders.actions.cancelCase')}
              </Button>
            </Space>
          </div>
        ) : null}
      </div>
    </PopupModal>
  )
}

export default OrderCaseModal
