import { memo, type MouseEvent, useState, type WheelEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExportOutlined,
  HistoryOutlined,
  HolderOutlined,
  LeftOutlined,
  LinkOutlined,
  ReloadOutlined,
  RightOutlined,
  SaveOutlined,
  SwapOutlined,
  SyncOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Descriptions,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Timeline,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { AuthenticatedMediaImage, downloadMediaAsset } from '@/shared/media'
import { modalQueryOptions } from '@/shared/query/modalQuery'
import {
  FeedbackAlert,
  getPopupAnchorFromMouseEvent,
  PopupModal,
  type PopupModalAnchor,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  addOrderCaseComment,
  cancelOrderCase,
  cancelOrderItem,
  createOrderCase,
  createOrderItemReplacement,
  createOrderReplacement,
  getOrderCase,
  listOrderCases,
  listOrderItemTimeline,
  listOrderTimeline,
  markOrderItemFulfillmentReady,
  type OrderBuyer,
  type OrderCase,
  type OrderCaseInput,
  type OrderWorkbenchItem,
  type OrderWorkbenchRow,
  overrideShippingAddress,
  recheckOrderItem,
  resolveOrderCase,
  retryCustomizationAssets,
  type ShippingAddress,
  type ShippingService,
  updateOrderBuyer,
  updateOrderCase,
  updateOrderItemCsNote,
  updateShippingAddress,
  updateShippingService,
  validateShippingAddress,
} from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'
import { FulfillmentInlineEditor } from './FulfillmentInlineEditor'
import { formatMinorMoney, orderStatusTone } from './orderPresentation'
import styles from './OrderWorkbenchPage.module.scss'

type OrderModal = 'address' | 'customer' | 'shipping' | 'case' | 'replacement' | 'timeline'
type Action =
  | { kind: 'address'; address: ShippingAddress }
  | { kind: 'shipping'; shipping: ShippingService }
  | { kind: 'customer'; buyer: OrderBuyer }
  | { kind: 'validate-address' }
  | { kind: 'override-address'; reason?: string }
  | { kind: 'note'; itemId: string; note: string }
  | { kind: 'recheck'; itemId: string }
  | { kind: 'retry-customization-assets'; itemId: string }
  | { kind: 'ready'; itemId: string }
  | { kind: 'cancel'; itemId: string; reason: string }
  | { kind: 'replacement'; itemId: string; reason: string; quantity: number }
  | {
      kind: 'order-replacement'
      reason: string
      items: Array<{ orderItemId: string; quantity: number }>
    }
  | { kind: 'case-save'; orderCase?: OrderCase; input: OrderCaseInput }
  | { kind: 'case-resolve'; orderCase: OrderCase; note: string }
  | { kind: 'case-cancel'; orderCase: OrderCase; note: string }
  | { kind: 'case-comment'; orderCase: OrderCase; body: string }
type Confirmation = { kind: 'cancel' | 'replacement'; item: OrderWorkbenchItem }

const ADDRESS_FIELDS: Array<keyof ShippingAddress> = [
  'name',
  'company',
  'addressLine1',
  'addressLine2',
  'city',
  'stateOrProvinceCode',
  'postalCode',
  'countryCode',
  'phoneMasked',
]
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
const SHIPPING_LEVEL_OPTIONS = ['Standard', 'Expedited', 'SecondDay', 'NextDay', 'Scheduled']

function value(input?: string | number | null) {
  return input == null || input === '' ? '—' : input
}

function amazonProductUrl(asin?: string | null) {
  const cleanAsin = asin?.trim()
  return cleanAsin ? `https://www.amazon.com/dp/${encodeURIComponent(cleanAsin)}` : null
}

const emptyCase = (orderId: string): OrderCaseInput => ({
  orderId,
  caseType: 'OTHER',
  severity: 'MEDIUM',
  title: '',
  description: '',
})

export const OrderInlinePanel = memo(function OrderInlinePanel({
  row,
  canWrite,
  canOperate = canWrite,
  requestedModal,
  requestedPopupAnchor,
  onOrderModalClose,
}: {
  readonly row: OrderWorkbenchRow
  readonly canWrite: boolean
  readonly canOperate?: boolean
  readonly requestedModal?: OrderModal
  readonly requestedPopupAnchor?: PopupModalAnchor
  readonly onOrderModalClose?: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const orderModal = requestedModal
  const [address, setAddress] = useState<ShippingAddress>(row.order.shippingAddress)
  const [buyer, setBuyer] = useState<OrderBuyer>(row.order.buyer)
  const [shipping, setShipping] = useState<ShippingService>(row.order.shippingService)
  const [confirmation, setConfirmation] = useState<Confirmation>()
  const [reason, setReason] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [replacementItems, setReplacementItems] = useState<Record<string, number>>({})
  const [orderReplacementReason, setOrderReplacementReason] = useState('')
  const [itemTimelineId, setItemTimelineId] = useState<string>()
  const [itemTimelineAnchor, setItemTimelineAnchor] = useState<PopupModalAnchor>()
  const [caseComment, setCaseComment] = useState('')
  const [confirmationAnchor, setConfirmationAnchor] = useState<PopupModalAnchor>()
  const [overrideReasonOpen, setOverrideReasonOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const cases = useQuery({
    queryKey: orderKeys.cases(row.order.id),
    queryFn: () => listOrderCases(row.order.id),
    enabled: orderModal === 'case',
    ...modalQueryOptions,
    retry: false,
  })
  const openCase = cases.data?.items.find((item) => item.status === 'OPEN')
  const caseDetail = useQuery({
    queryKey: orderKeys.caseDetail(openCase?.id ?? ''),
    queryFn: () => getOrderCase(openCase!.id),
    enabled: orderModal === 'case' && Boolean(openCase?.id),
    ...modalQueryOptions,
    retry: false,
  })
  const timeline = useQuery({
    queryKey: orderKeys.timeline(row.order.id, itemTimelineId),
    queryFn: () =>
      itemTimelineId ? listOrderItemTimeline(itemTimelineId) : listOrderTimeline(row.order.id),
    enabled: orderModal === 'timeline' || Boolean(itemTimelineId),
    ...modalQueryOptions,
    retry: false,
  })

  const closeOrderModal = () => {
    onOrderModalClose?.()
  }

  const mutation = useMutation({
    mutationFn: (action: Action) => {
      if (action.kind === 'address') return updateShippingAddress(row.order.id, action.address)
      if (action.kind === 'customer') return updateOrderBuyer(row.order.id, action.buyer)
      if (action.kind === 'shipping') return updateShippingService(row.order.id, action.shipping)
      if (action.kind === 'validate-address') return validateShippingAddress(row.order.id)
      if (action.kind === 'override-address')
        return overrideShippingAddress(row.order.id, action.reason)
      if (action.kind === 'note') return updateOrderItemCsNote(action.itemId, action.note)
      if (action.kind === 'recheck') return recheckOrderItem(action.itemId)
      if (action.kind === 'retry-customization-assets')
        return retryCustomizationAssets(action.itemId)
      if (action.kind === 'ready') return markOrderItemFulfillmentReady(action.itemId)
      if (action.kind === 'cancel') return cancelOrderItem(action.itemId, action.reason)
      if (action.kind === 'replacement') {
        return createOrderItemReplacement(action.itemId, {
          reason: action.reason,
          quantity: action.quantity,
        })
      }
      if (action.kind === 'order-replacement') {
        return createOrderReplacement(row.order.id, { reason: action.reason, items: action.items })
      }
      if (action.kind === 'case-save') {
        if (!action.orderCase) return createOrderCase(action.input)
        const { caseType, severity, title, description } = action.input
        return updateOrderCase(action.orderCase.id, { caseType, severity, title, description })
      }
      if (action.kind === 'case-resolve') return resolveOrderCase(action.orderCase.id, action.note)
      if (action.kind === 'case-cancel') return cancelOrderCase(action.orderCase.id, action.note)
      if (action.kind === 'case-comment')
        return addOrderCaseComment(action.orderCase.id, action.body)
      return Promise.reject(new Error('Unsupported order action'))
    },
    onSuccess: async (_, action) => {
      if (action.kind === 'case-comment') {
        await queryClient.invalidateQueries({ queryKey: orderKeys.caseDetail(action.orderCase.id) })
        setCaseComment('')
        toast('success', t('orders.messages.commentAdded'))
        return
      }
      closeOrderModal()
      setConfirmation(undefined)
      setReason('')
      setOverrideReason('')
      setOverrideReasonOpen(false)
      setReplacementItems({})
      setOrderReplacementReason('')
      await queryClient.invalidateQueries({ queryKey: orderKeys.all })
      toast('success', t('orders.messages.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('orders.messages.actionFailed')),
  })

  const openConfirmation = (
    event: MouseEvent<HTMLElement>,
    kind: Confirmation['kind'],
    item: OrderWorkbenchItem,
  ) => {
    setReason('')
    setQuantity(item.item.quantity || 1)
    setConfirmation({ kind, item })
    setConfirmationAnchor(getPopupAnchorFromMouseEvent(event))
  }

  const openTimelineForItem = (event: MouseEvent<HTMLElement>, itemId: string) => {
    setItemTimelineId(itemId)
    setItemTimelineAnchor(getPopupAnchorFromMouseEvent(event))
  }

  const closeTimeline = () => {
    setItemTimelineId(undefined)
    setItemTimelineAnchor(undefined)
  }

  return (
    <div className={styles.inlinePanel}>
      {row.items.map((item) => (
        <OrderItemPanel
          key={item.item.id}
          item={item}
          canWrite={canWrite}
          canOperate={canOperate}
          pending={mutation.isPending}
          onAction={mutation.mutate}
          onConfirm={openConfirmation}
          onHistory={openTimelineForItem}
        />
      ))}

      {orderModal === 'address' ? (
        <PopupModal
          centered
          anchor={requestedPopupAnchor}
          width={920}
          open
          title={t('orders.actions.editAddress')}
          okText={t('orders.actions.saveAddress')}
          confirmLoading={mutation.isPending}
          onCancel={closeOrderModal}
          onOk={() => mutation.mutate({ kind: 'address', address })}
        >
          <div className={styles.modalToolbar}>
            <StatusTag status={orderStatusTone(row.order.addressValidationStatus)}>
              {value(row.order.addressValidationStatus)}
            </StatusTag>
            <Button
              icon={<CheckCircleOutlined />}
              loading={mutation.isPending}
              onClick={() => mutation.mutate({ kind: 'validate-address' })}
            >
              {t('orders.actions.validateAddress')}
            </Button>
            <Button loading={mutation.isPending} onClick={() => setOverrideReasonOpen(true)}>
              {t('orders.actions.overrideAddress')}
            </Button>
          </div>
          <div className={styles.addressEditor}>
            {ADDRESS_FIELDS.map((field) => (
              <label key={field}>
                <Typography.Text type="secondary">{t(`orders.address.${field}`)}</Typography.Text>
                <Input
                  value={address[field] ?? ''}
                  onChange={(event) =>
                    setAddress((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        </PopupModal>
      ) : null}

      <Modal
        centered
        open={overrideReasonOpen}
        title={t('orders.actions.overrideAddress')}
        okText={t('orders.actions.overrideAddress')}
        confirmLoading={mutation.isPending}
        onCancel={() => setOverrideReasonOpen(false)}
        onOk={() =>
          mutation.mutate({
            kind: 'override-address',
            reason: overrideReason.trim() || undefined,
          })
        }
      >
        <Input.TextArea
          rows={4}
          value={overrideReason}
          placeholder={t('orders.actions.overrideAddressReason')}
          onChange={(event) => setOverrideReason(event.target.value)}
        />
      </Modal>

      {orderModal === 'customer' ? (
        <PopupModal
          centered
          anchor={requestedPopupAnchor}
          width={680}
          open
          title={t('orders.actions.editCustomer')}
          okText={t('orders.actions.saveCustomer')}
          confirmLoading={mutation.isPending}
          onCancel={closeOrderModal}
          onOk={() => mutation.mutate({ kind: 'customer', buyer })}
        >
          <div className={styles.customerEditor}>
            {(['name', 'emailMasked', 'phoneMasked', 'externalBuyerId'] as const).map((field) => (
              <label key={field}>
                <Typography.Text>{t(`orders.customer.${field}`)}</Typography.Text>
                <Input
                  value={buyer[field] ?? ''}
                  onChange={(event) =>
                    setBuyer((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        </PopupModal>
      ) : null}

      {orderModal === 'shipping' ? (
        <PopupModal
          centered
          anchor={requestedPopupAnchor}
          open
          title={t('orders.actions.editShipping')}
          okText={t('orders.actions.saveShipping')}
          confirmLoading={mutation.isPending}
          onCancel={closeOrderModal}
          onOk={() => mutation.mutate({ kind: 'shipping', shipping })}
        >
          <div className={styles.modalForm}>
            <label>
              <Typography.Text>{t('orders.shipping.name')}</Typography.Text>
              <Input
                value={shipping.name ?? ''}
                onChange={(event) =>
                  setShipping((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              <Typography.Text>{t('orders.shipping.level')}</Typography.Text>
              <Select
                showSearch
                allowClear
                mode="tags"
                maxCount={1}
                value={shipping.level ? [shipping.level] : []}
                options={SHIPPING_LEVEL_OPTIONS.map((level) => ({ label: level, value: level }))}
                onChange={(values) =>
                  setShipping((current) => ({ ...current, level: values[0] ?? null }))
                }
              />
            </label>
          </div>
        </PopupModal>
      ) : null}

      {orderModal === 'case' ? (
        cases.isLoading ? (
          <PopupModal
            centered
            anchor={requestedPopupAnchor}
            open
            title={t('orders.actions.manageCase')}
            footer={null}
            onCancel={closeOrderModal}
          >
            <Spin />
          </PopupModal>
        ) : cases.error ? (
          <PopupModal
            centered
            anchor={requestedPopupAnchor}
            open
            title={t('orders.actions.manageCase')}
            footer={null}
            onCancel={closeOrderModal}
          >
            <FeedbackAlert type="error" title={t('orders.messages.caseLoadFailed')} />
          </PopupModal>
        ) : (
          <CaseEditorModal
            orderId={row.order.id}
            requestedPopupAnchor={requestedPopupAnchor}
            openCase={caseDetail.data ?? openCase}
            commentsLoading={caseDetail.isLoading}
            comment={caseComment}
            pending={mutation.isPending}
            onClose={closeOrderModal}
            onCommentChange={setCaseComment}
            onAction={mutation.mutate}
          />
        )
      ) : null}

      {orderModal === 'timeline' || itemTimelineId ? (
        <PopupModal
          centered
          anchor={itemTimelineId ? itemTimelineAnchor : requestedPopupAnchor}
          width={720}
          open
          footer={null}
          title={t(itemTimelineId ? 'orders.history.itemTitle' : 'orders.history.orderTitle')}
          onCancel={() => (itemTimelineId ? closeTimeline() : closeOrderModal())}
        >
          <div className={styles.historyScroll}>
            {timeline.isLoading ? (
              <Spin />
            ) : timeline.error ? (
              <FeedbackAlert type="error" title={t('orders.messages.historyLoadFailed')} />
            ) : timeline.data?.items.length ? (
              <Timeline
                items={timeline.data.items.map((event) => ({
                  children: (
                    <div className={styles.historyEntry}>
                      <Space wrap>
                        <Typography.Text strong>{event.eventType}</Typography.Text>
                        <Typography.Text type="secondary">
                          {event.createdAt
                            ? dayjs(event.createdAt).format('DD/MM/YYYY HH:mm')
                            : '—'}
                        </Typography.Text>
                      </Space>
                      {event.message ? <Typography.Text>{event.message}</Typography.Text> : null}
                      {event.fromStatus || event.toStatus ? (
                        <Typography.Text type="secondary">
                          {value(event.fromStatus)} → {value(event.toStatus)}
                        </Typography.Text>
                      ) : null}
                      {event.actor ? (
                        <Typography.Text type="secondary">
                          {event.actor.displayName || event.actor.employeeCode}
                        </Typography.Text>
                      ) : null}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Typography.Text type="secondary">{t('orders.history.empty')}</Typography.Text>
            )}
          </div>
        </PopupModal>
      ) : null}

      {orderModal === 'replacement' ? (
        <PopupModal
          centered
          anchor={requestedPopupAnchor}
          width={760}
          open
          title={t('orders.actions.replaceOrder')}
          okText={t('orders.actions.createReplacement')}
          okButtonProps={{ disabled: Object.keys(replacementItems).length === 0 }}
          confirmLoading={mutation.isPending}
          onCancel={closeOrderModal}
          onOk={() =>
            mutation.mutate({
              kind: 'order-replacement',
              reason: orderReplacementReason,
              items: Object.entries(replacementItems).map(([orderItemId, selectedQuantity]) => ({
                orderItemId,
                quantity: selectedQuantity,
              })),
            })
          }
        >
          <div className={styles.replacementForm}>
            {row.items.map((item) => {
              const selected = replacementItems[item.item.id] !== undefined
              return (
                <div key={item.item.id} className={styles.replacementRow}>
                  <Checkbox
                    checked={selected}
                    onChange={(event) =>
                      setReplacementItems((current) => {
                        if (event.target.checked)
                          return { ...current, [item.item.id]: item.item.quantity || 1 }
                        const next = { ...current }
                        delete next[item.item.id]
                        return next
                      })
                    }
                  >
                    <Typography.Text strong>{value(item.item.sku)}</Typography.Text>
                  </Checkbox>
                  <InputNumber
                    min={1}
                    max={item.item.quantity || 1}
                    disabled={!selected}
                    value={replacementItems[item.item.id] ?? item.item.quantity ?? 1}
                    onChange={(nextQuantity) =>
                      setReplacementItems((current) => ({
                        ...current,
                        [item.item.id]: nextQuantity ?? 1,
                      }))
                    }
                  />
                </div>
              )
            })}
            <Input.TextArea
              value={orderReplacementReason}
              placeholder={t('orders.fields.replacementReason')}
              autoSize={{ minRows: 2, maxRows: 4 }}
              onChange={(event) => setOrderReplacementReason(event.target.value)}
            />
          </div>
        </PopupModal>
      ) : null}

      <PopupModal
        centered
        anchor={confirmationAnchor}
        open={Boolean(confirmation)}
        title={t(
          confirmation?.kind === 'replacement'
            ? 'orders.actions.createReplacement'
            : 'orders.actions.cancelItem',
        )}
        okButtonProps={{ disabled: confirmation?.kind === 'cancel' && !reason.trim() }}
        confirmLoading={mutation.isPending}
        onCancel={() => {
          setConfirmation(undefined)
          setConfirmationAnchor(undefined)
        }}
        onOk={() => {
          if (!confirmation) return
          mutation.mutate(
            confirmation.kind === 'cancel'
              ? { kind: 'cancel', itemId: confirmation.item.item.id, reason: reason.trim() }
              : {
                  kind: 'replacement',
                  itemId: confirmation.item.item.id,
                  reason: reason.trim(),
                  quantity,
                },
          )
        }}
      >
        <div className={styles.modalForm}>
          <Descriptions
            size="small"
            column={1}
            items={[
              { key: 'sku', label: 'SKU', children: value(confirmation?.item.item.sku) },
              {
                key: 'seller',
                label: t('orders.fields.seller'),
                children: value(confirmation?.item.seller?.employeeCode),
              },
            ]}
          />
          <label>
            <Typography.Text>{t('orders.fields.reason')}</Typography.Text>
            <Input.TextArea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          {confirmation?.kind === 'replacement' ? (
            <label>
              <Typography.Text>{t('orders.fields.quantity')}</Typography.Text>
              <InputNumber min={1} value={quantity} onChange={(next) => setQuantity(next ?? 1)} />
            </label>
          ) : null}
        </div>
      </PopupModal>
    </div>
  )
})

function CaseEditorModal({
  orderId,
  requestedPopupAnchor,
  openCase,
  commentsLoading,
  comment,
  pending,
  onClose,
  onCommentChange,
  onAction,
}: {
  readonly orderId: string
  readonly requestedPopupAnchor?: PopupModalAnchor
  readonly openCase?: OrderCase
  readonly commentsLoading: boolean
  readonly comment: string
  readonly pending: boolean
  readonly onClose: () => void
  readonly onCommentChange: (value: string) => void
  readonly onAction: (action: Action) => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<OrderCaseInput>(
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
  const [note, setNote] = useState('')

  return (
    <PopupModal
      centered
      anchor={requestedPopupAnchor}
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
                onChange={(event) => onCommentChange(event.target.value)}
              />
              <Button
                disabled={!comment.trim()}
                loading={pending}
                onClick={() =>
                  onAction({ kind: 'case-comment', orderCase: openCase, body: comment.trim() })
                }
              >
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

function OrderItemPanel({
  item,
  canWrite,
  canOperate,
  pending,
  onAction,
  onConfirm,
  onHistory,
}: {
  readonly item: OrderWorkbenchItem
  readonly canWrite: boolean
  readonly canOperate: boolean
  readonly pending: boolean
  readonly onAction: (action: Action) => void
  readonly onConfirm: (
    event: MouseEvent<HTMLElement>,
    kind: Confirmation['kind'],
    item: OrderWorkbenchItem,
  ) => void
  readonly onHistory: (event: MouseEvent<HTMLElement>, itemId: string) => void
}) {
  const { t } = useTranslation()
  const preview = item.customization?.previewImageUrl
  const customizationImage = item.customization?.inputs.find(
    (input) => input.assetDownloadUrl,
  )?.assetDownloadUrl
  const psdSource = item.mapping?.listingVariant || item.mapping?.listingPsd
  const psdStatus = psdSource?.psdReadiness?.status
  const psdDownloadUrl = psdSource?.psdTemplate?.downloadUrl
  const canRecheck =
    item.workflow.nextActions.some((action) => action.startsWith('RECHECK_')) ||
    (item.production?.status === 'BLOCKED' && psdStatus === 'PRESENT')
  const relatedImages = Array.from(
    new Set([
      preview,
      customizationImage,
      ...(item.customization?.inputs ?? []).map((input) => input.assetDownloadUrl),
    ]),
  )
    .filter((image): image is string => Boolean(image))
    .slice(0, 5)
  const [imageViewer, setImageViewer] = useState<string>()
  const [imageViewerAnchor, setImageViewerAnchor] = useState<PopupModalAnchor>()
  const [imageZoom, setImageZoom] = useState(100)
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>()
  const terminal = ['CANCELLED', 'FAILED', 'REFUNDED', 'SHIPPED'].includes(item.item.status ?? '')

  const resetImageView = () => {
    setImageZoom(100)
    setImageOffset({ x: 0, y: 0 })
    setDragStart(undefined)
  }

  const openImageViewer = (event: MouseEvent<HTMLElement>, url?: string | null) => {
    if (!url) return
    setImageViewer(url)
    setImageViewerAnchor(getPopupAnchorFromMouseEvent(event))
    resetImageView()
  }

  const closeImageViewer = () => {
    setImageViewer(undefined)
    setImageViewerAnchor(undefined)
    resetImageView()
  }

  const showImageAt = (nextIndex: number) => {
    const nextImage = relatedImages[nextIndex]
    if (!nextImage) return
    setImageViewer(nextImage)
    setImageViewerAnchor(undefined)
    resetImageView()
  }

  const currentImageIndex = Math.max(0, relatedImages.indexOf(imageViewer ?? ''))
  const hasMultipleImages = relatedImages.length > 1

  const zoomByWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setImageZoom((value) => Math.min(300, Math.max(75, value + (event.deltaY < 0 ? 15 : -15))))
  }

  const startDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || imageZoom <= 100) return
    event.preventDefault()
    setDragStart({ x: event.clientX, y: event.clientY })
  }

  const moveDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragStart) return
    setImageOffset((current) => ({
      x: current.x + event.clientX - dragStart.x,
      y: current.y + event.clientY - dragStart.y,
    }))
    setDragStart({ x: event.clientX, y: event.clientY })
  }

  const stopDrag = () => setDragStart(undefined)
  const renderAsin = (asin?: string | null, chip = false) => {
    const productUrl = amazonProductUrl(asin)

    return (
      <Space size={4} className={styles.asinWithLink}>
        <span className={chip ? styles.asinChip : undefined}>{value(asin)}</span>
        {productUrl ? (
          <Tooltip title={t('orders.actions.openProduct', { defaultValue: 'Open product' })}>
            <Button
              type="text"
              size="small"
              className={styles.asinLink}
              icon={<ExportOutlined />}
              href={productUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t('orders.actions.openProduct', { defaultValue: 'Open product' })}
            />
          </Tooltip>
        ) : null}
      </Space>
    )
  }

  return (
    <article className={styles.itemPanel}>
      <section className={styles.assetColumn}>
        <Typography.Text strong>{t('orders.sections.imagePrint')}</Typography.Text>
        <AuthenticatedMediaImage
          width={112}
          height={112}
          downloadUrl={preview || customizationImage || undefined}
          alt={t('orders.fields.image')}
          style={{ cursor: 'zoom-in' }}
          onClick={(event) => openImageViewer(event, preview || customizationImage)}
          fallback="/favicon.svg"
        />
        <StatusTag status={orderStatusTone(psdStatus)}>PSD {value(psdStatus)}</StatusTag>
        {psdDownloadUrl ? (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => void downloadMediaAsset(psdDownloadUrl, 'template.psd')}
          >
            PSD
          </Button>
        ) : null}
      </section>
      <section className={styles.identifierSection}>
        <Typography.Text strong>{t('orders.sections.skuSeller')}</Typography.Text>
        <Descriptions
          size="small"
          column={1}
          colon={false}
          items={[
            { key: 'sku', label: 'SKU', children: value(item.item.sku) },
            { key: 'asin', label: 'ASIN', children: renderAsin(item.item.asin) },
            {
              key: 'seller',
              label: t('orders.fields.seller'),
              children: value(
                [item.seller?.employeeCode, item.seller?.name].filter(Boolean).join(' · '),
              ),
            },
          ]}
        />
        <div className={styles.identifierList}>
          <div>
            <Typography.Text type="secondary">SKU</Typography.Text>
            <span className={styles.skuChip}>{value(item.item.sku)}</span>
          </div>
          <div>
            <Typography.Text type="secondary">ASIN</Typography.Text>
            {renderAsin(item.item.asin, true)}
          </div>
          <div>
            <Typography.Text type="secondary">{t('orders.fields.seller')}</Typography.Text>
            <span className={styles.sellerChip}>
              {value([item.seller?.employeeCode, item.seller?.name].filter(Boolean).join(' · '))}
            </span>
          </div>
        </div>
      </section>
      <section>
        <Space className={styles.customizationHeader} size="small" wrap>
          <Typography.Text strong>{t('orders.sections.customization')}</Typography.Text>
          {canOperate && item.customization?.sourceCustomizationUrl ? (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              href={item.customization.sourceCustomizationUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('orders.actions.downloadAmazonCustomization')}
            </Button>
          ) : null}
          {canOperate && item.customization?.downloadedZip?.status === 'FAILED' ? (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={pending}
              onClick={() => onAction({ kind: 'retry-customization-assets', itemId: item.item.id })}
            >
              Retry Amazon data
            </Button>
          ) : null}
        </Space>
        <div className={styles.inputList}>
          {(item.customization?.inputs ?? []).map((input, index) => (
            <div key={`${input.label}-${index}`}>
              <Typography.Text type="secondary">{input.label || input.type}: </Typography.Text>
              {input.assetDownloadUrl ? (
                <div className={styles.buyerImage}>
                  <AuthenticatedMediaImage
                    width={72}
                    height={72}
                    downloadUrl={input.assetDownloadUrl}
                    alt={input.label || t('orders.fields.image')}
                    fallback="/favicon.svg"
                    style={{ cursor: 'zoom-in' }}
                    onClick={(event) => openImageViewer(event, input.assetDownloadUrl)}
                  />
                  <Button
                    size="small"
                    type="link"
                    icon={<LinkOutlined />}
                    onClick={(event) => openImageViewer(event, input.assetDownloadUrl)}
                  >
                    {t('orders.fields.image')}
                  </Button>
                </div>
              ) : (
                <Typography.Text>{value(input.value)}</Typography.Text>
              )}
            </div>
          ))}
          {!item.customization?.inputs.length ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : null}
        </div>

        <PopupModal
          centered
          anchor={imageViewerAnchor}
          open={Boolean(imageViewer)}
          footer={null}
          width="min(82vw, 760px)"
          title={null}
          closeIcon={null}
          className={styles.imagePreviewModal}
          onCancel={closeImageViewer}
          style={{ padding: 0 }}
          styles={{
            body: { padding: 0 },
            mask: { background: 'rgba(0, 0, 0, 0.52)' },
          }}
        >
          {imageViewer ? (
            <div
              style={{
                position: 'relative',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <div
                role="button"
                aria-label="Image zoom and pan viewer"
                tabIndex={0}
                onWheel={zoomByWheel}
                onMouseDown={startDrag}
                onMouseMove={moveDrag}
                onMouseUp={stopDrag}
                onMouseLeave={stopDrag}
                onKeyDown={(event) => event.key === 'Escape' && stopDrag()}
                style={{
                  width: '100%',
                  height: 'min(78vh, 748px)',
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                  background: '#fff',
                  cursor: imageZoom > 100 ? (dragStart ? 'grabbing' : 'grab') : 'default',
                }}
              >
                <AuthenticatedMediaImage
                  downloadUrl={imageViewer}
                  alt={t('orders.fields.image')}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    userSelect: 'none',
                    transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageZoom / 100})`,
                    transition: dragStart ? undefined : 'transform 120ms ease',
                  }}
                />
              </div>
              <Space
                className={styles.imagePreviewToolbar}
                size={4}
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: -38,
                  transform: 'translateX(-50%)',
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(80, 80, 80, 0.72)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<LeftOutlined />}
                  disabled={!hasMultipleImages}
                  onClick={() =>
                    showImageAt(
                      (currentImageIndex - 1 + relatedImages.length) % relatedImages.length,
                    )
                  }
                />
                <Button type="text" size="small" icon={<HolderOutlined />} disabled />
                <Button
                  type="text"
                  size="small"
                  icon={<RightOutlined />}
                  disabled={!hasMultipleImages}
                  onClick={() => showImageAt((currentImageIndex + 1) % relatedImages.length)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<ZoomOutOutlined />}
                  onClick={() => setImageZoom((value) => Math.max(75, value - 15))}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<ZoomInOutlined />}
                  onClick={() => setImageZoom((value) => Math.min(300, value + 15))}
                />
                <Button type="text" size="small" icon={<SyncOutlined />} onClick={resetImageView} />
              </Space>
            </div>
          ) : null}
        </PopupModal>
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.quantityCost')}</Typography.Text>
        <Descriptions
          size="small"
          column={1}
          colon={false}
          items={[
            { key: 'qty', label: t('orders.fields.quantity'), children: item.item.quantity },
            {
              key: 'paid',
              label: t('orders.fields.customerPaid'),
              children: formatMinorMoney(
                item.pricing.customerPaidAmount,
                item.pricing.currency ?? 'USD',
              ),
            },
            {
              key: 'base',
              label: t('orders.fields.totalCost'),
              children: formatMinorMoney(
                item.pricing.totalCostAmount ?? item.pricing.baseCostAmount,
                item.pricing.currency ?? 'USD',
              ),
            },
          ]}
        />
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.fulfillment')}</Typography.Text>
        <FulfillmentInlineEditor item={item} canWrite={canOperate} />
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.trackingState')}</Typography.Text>
        <div className={styles.trackingRow}>
          <Space size={4}>
            <Typography.Text type="secondary">{t('orders.fields.tracking')}</Typography.Text>
            <Typography.Text type={item.tracking?.trackingNumber ? undefined : 'secondary'}>
              {item.tracking?.trackingNumber || t('orders.fields.notSet')}
            </Typography.Text>
            <Tooltip title={t('orders.actions.viewHistory')}>
              <Button
                type="text"
                size="small"
                aria-label={t('orders.actions.viewHistory')}
                icon={<HistoryOutlined />}
                onClick={(event) => onHistory(event, item.item.id)}
              />
            </Tooltip>
          </Space>
        </div>
        <OrderItemNoteEditor
          key={`${item.item.id}:${item.item.csNote ?? ''}`}
          canWrite={canOperate}
          initialNote={item.item.csNote ?? ''}
          pending={pending}
          onSave={(note) => onAction({ kind: 'note', itemId: item.item.id, note })}
        />
      </section>
      <section className={styles.itemActions}>
        <Typography.Text strong>{t('orders.sections.itemActions')}</Typography.Text>
        {canWrite || canOperate ? (
          <Space orientation="vertical" size={4}>
            {canWrite ? (
              <Tooltip title={t('orders.actions.createReplacement')} placement="left">
                <Button
                  type="text"
                  aria-label={t('orders.actions.replaceShort')}
                  icon={<SwapOutlined />}
                  onClick={(event) => onConfirm(event, 'replacement', item)}
                >
                  {t('orders.actions.replaceShort')}
                </Button>
              </Tooltip>
            ) : null}
            {canOperate && canRecheck ? (
              <Tooltip title={t('orders.actions.recheck')} placement="left">
                <Button
                  type="text"
                  aria-label={t('orders.actions.recheckShort')}
                  icon={<ReloadOutlined />}
                  onClick={() => onAction({ kind: 'recheck', itemId: item.item.id })}
                >
                  {t('orders.actions.recheckShort')}
                </Button>
              </Tooltip>
            ) : null}
            {canOperate && !terminal ? (
              <Tooltip title={t('orders.actions.markReady')} placement="left">
                <Button
                  type="text"
                  aria-label={t('orders.actions.readyShort')}
                  icon={<CheckCircleOutlined />}
                  onClick={() => onAction({ kind: 'ready', itemId: item.item.id })}
                >
                  {t('orders.actions.readyShort')}
                </Button>
              </Tooltip>
            ) : null}
            {canOperate && !terminal ? (
              <Tooltip title={t('orders.actions.cancelItem')} placement="left">
                <Button
                  danger
                  type="text"
                  aria-label={t('orders.actions.cancelShort')}
                  icon={<DeleteOutlined />}
                  onClick={(event) => onConfirm(event, 'cancel', item)}
                >
                  {t('orders.actions.cancelShort')}
                </Button>
              </Tooltip>
            ) : null}
          </Space>
        ) : null}
      </section>
    </article>
  )
}

const OrderItemNoteEditor = memo(function OrderItemNoteEditor({
  canWrite,
  initialNote,
  pending,
  onSave,
}: {
  readonly canWrite: boolean
  readonly initialNote: string
  readonly pending: boolean
  readonly onSave: (note: string) => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState(initialNote)

  return (
    <>
      <Input.TextArea
        value={note}
        placeholder={t('orders.fields.noNote')}
        onChange={(event) => setNote(event.target.value)}
        readOnly={!canWrite}
        autoSize={{ minRows: 2, maxRows: 3 }}
      />
      {canWrite ? (
        <Space wrap>
          <Button icon={<SaveOutlined />} loading={pending} onClick={() => onSave(note)}>
            {t('orders.actions.saveNote')}
          </Button>
        </Space>
      ) : null}
    </>
  )
})
