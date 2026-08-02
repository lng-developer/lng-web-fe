import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  HistoryOutlined,
  LinkOutlined,
  ReloadOutlined,
  SaveOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Descriptions,
  Image,
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

import { downloadMediaAsset } from '@/shared/media'
import { FeedbackAlert, StatusTag, useFeedbackToast } from '@/shared/ui'

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
  recheckOrderItem,
  resolveOrderCase,
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
import { formatMinorMoney, orderStatusTone } from './orderPresentation'
import styles from './OrderWorkbenchPage.module.scss'

type OrderModal = 'address' | 'customer' | 'shipping' | 'case' | 'replacement' | 'timeline'
type Action =
  | { kind: 'address'; address: ShippingAddress }
  | { kind: 'shipping'; shipping: ShippingService }
  | { kind: 'customer'; buyer: OrderBuyer }
  | { kind: 'validate-address' }
  | { kind: 'note'; itemId: string; note: string }
  | { kind: 'recheck'; itemId: string }
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

function value(input?: string | number | null) {
  return input == null || input === '' ? '—' : input
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
  requestedModal,
  onOrderModalClose,
}: {
  readonly row: OrderWorkbenchRow
  readonly canWrite: boolean
  readonly requestedModal?: OrderModal
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
  const [caseComment, setCaseComment] = useState('')
  const cases = useQuery({
    queryKey: orderKeys.cases(row.order.id),
    queryFn: () => listOrderCases(row.order.id),
    enabled: orderModal === 'case',
    retry: false,
  })
  const openCase = cases.data?.items.find((item) => item.status === 'OPEN')
  const caseDetail = useQuery({
    queryKey: orderKeys.caseDetail(openCase?.id ?? ''),
    queryFn: () => getOrderCase(openCase!.id),
    enabled: orderModal === 'case' && Boolean(openCase?.id),
    retry: false,
  })
  const timeline = useQuery({
    queryKey: orderKeys.timeline(row.order.id, itemTimelineId),
    queryFn: () =>
      itemTimelineId ? listOrderItemTimeline(itemTimelineId) : listOrderTimeline(row.order.id),
    enabled: orderModal === 'timeline' || Boolean(itemTimelineId),
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
      if (action.kind === 'note') return updateOrderItemCsNote(action.itemId, action.note)
      if (action.kind === 'recheck') return recheckOrderItem(action.itemId)
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
      setReplacementItems({})
      setOrderReplacementReason('')
      await queryClient.invalidateQueries({ queryKey: orderKeys.all })
      toast('success', t('orders.messages.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('orders.messages.actionFailed')),
  })

  const openConfirmation = (kind: Confirmation['kind'], item: OrderWorkbenchItem) => {
    setReason('')
    setQuantity(item.item.quantity || 1)
    setConfirmation({ kind, item })
  }

  return (
    <div className={styles.inlinePanel}>
      {row.items.map((item) => (
        <OrderItemPanel
          key={item.item.id}
          item={item}
          canWrite={canWrite}
          pending={mutation.isPending}
          onAction={mutation.mutate}
          onConfirm={openConfirmation}
          onHistory={setItemTimelineId}
        />
      ))}

      {orderModal === 'address' ? (
        <Modal
          centered
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
        </Modal>
      ) : null}

      {orderModal === 'customer' ? (
        <Modal
          centered
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
        </Modal>
      ) : null}

      {orderModal === 'shipping' ? (
        <Modal
          centered
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
              <Input
                value={shipping.level ?? ''}
                onChange={(event) =>
                  setShipping((current) => ({ ...current, level: event.target.value }))
                }
              />
            </label>
          </div>
        </Modal>
      ) : null}

      {orderModal === 'case' ? (
        cases.isLoading ? (
          <Modal
            centered
            open
            title={t('orders.actions.manageCase')}
            footer={null}
            onCancel={closeOrderModal}
          >
            <Spin />
          </Modal>
        ) : cases.error ? (
          <Modal
            centered
            open
            title={t('orders.actions.manageCase')}
            footer={null}
            onCancel={closeOrderModal}
          >
            <FeedbackAlert type="error" title={t('orders.messages.caseLoadFailed')} />
          </Modal>
        ) : (
          <CaseEditorModal
            orderId={row.order.id}
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
        <Modal
          centered
          width={720}
          open
          footer={null}
          title={t(itemTimelineId ? 'orders.history.itemTitle' : 'orders.history.orderTitle')}
          onCancel={() => (itemTimelineId ? setItemTimelineId(undefined) : closeOrderModal())}
        >
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
                        {event.createdAt ? dayjs(event.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
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
        </Modal>
      ) : null}

      {orderModal === 'replacement' ? (
        <Modal
          centered
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
        </Modal>
      ) : null}

      <Modal
        centered
        open={Boolean(confirmation)}
        title={t(
          confirmation?.kind === 'replacement'
            ? 'orders.actions.createReplacement'
            : 'orders.actions.cancelItem',
        )}
        okButtonProps={{ disabled: confirmation?.kind === 'cancel' && !reason.trim() }}
        confirmLoading={mutation.isPending}
        onCancel={() => setConfirmation(undefined)}
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
      </Modal>
    </div>
  )
})

function CaseEditorModal({
  orderId,
  openCase,
  commentsLoading,
  comment,
  pending,
  onClose,
  onCommentChange,
  onAction,
}: {
  readonly orderId: string
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
    <Modal
      centered
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
    </Modal>
  )
}

function OrderItemPanel({
  item,
  canWrite,
  pending,
  onAction,
  onConfirm,
  onHistory,
}: {
  readonly item: OrderWorkbenchItem
  readonly canWrite: boolean
  readonly pending: boolean
  readonly onAction: (action: Action) => void
  readonly onConfirm: (kind: Confirmation['kind'], item: OrderWorkbenchItem) => void
  readonly onHistory: (itemId: string) => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState(item.item.csNote ?? '')
  const preview = item.listing?.previewAsset?.previewUrl
  const customizationImage = item.customization?.inputs.find((input) => input.secureUrl)?.secureUrl
  const canRecheck = item.workflow.nextActions.some((action) => action.startsWith('RECHECK_'))
  const terminal = ['CANCELLED', 'FAILED', 'REFUNDED', 'SHIPPED'].includes(item.item.status ?? '')
  return (
    <article className={styles.itemPanel}>
      <section className={styles.assetColumn}>
        <Typography.Text strong>{t('orders.sections.imagePrint')}</Typography.Text>
        <Image
          width={112}
          height={112}
          src={preview || customizationImage || undefined}
          fallback="/favicon.svg"
        />
        <StatusTag status={orderStatusTone(item.listing?.psdStatus)}>
          PSD {value(item.listing?.psdStatus)}
        </StatusTag>
        {item.listing?.psdTemplate?.downloadUrl ? (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() =>
              void downloadMediaAsset(item.listing!.psdTemplate!.downloadUrl!, 'template.psd')
            }
          >
            PSD
          </Button>
        ) : null}
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.skuSeller')}</Typography.Text>
        <Descriptions
          size="small"
          column={1}
          colon={false}
          items={[
            { key: 'sku', label: 'SKU', children: value(item.item.sku) },
            { key: 'asin', label: 'ASIN', children: value(item.item.asin) },
            {
              key: 'seller',
              label: t('orders.fields.seller'),
              children: value(
                [item.seller?.employeeCode, item.seller?.name].filter(Boolean).join(' · '),
              ),
            },
          ]}
        />
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.customization')}</Typography.Text>
        <div className={styles.inputList}>
          {(item.customization?.inputs ?? []).map((input, index) => (
            <div key={`${input.label}-${index}`}>
              <Typography.Text type="secondary">{input.label || input.type}: </Typography.Text>
              {input.secureUrl ? (
                <a href={input.secureUrl} target="_blank" rel="noreferrer">
                  <LinkOutlined /> {t('orders.fields.image')}
                </a>
              ) : (
                <Typography.Text>{value(input.value)}</Typography.Text>
              )}
            </div>
          ))}
          {!item.customization?.inputs.length ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : null}
        </div>
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
              label: t('orders.columns.cost'),
              children: formatMinorMoney(
                item.pricing.baseCostAmount,
                item.pricing.currency ?? 'USD',
              ),
            },
          ]}
        />
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.fulfillment')}</Typography.Text>
        <Descriptions
          size="small"
          column={1}
          colon={false}
          items={[
            {
              key: 'vendor',
              label: t('orders.fields.vendor'),
              children: value(item.mapping?.vendor?.name),
            },
            {
              key: 'cc',
              label: t('orders.fields.costCenter'),
              children: value(item.mapping?.vendorCostCenter?.code),
            },
            {
              key: 'size',
              label: t('orders.fields.size'),
              children: value(item.mapping?.vendorCostCenter?.size),
            },
            {
              key: 'color',
              label: t('orders.fields.color'),
              children: value(item.mapping?.vendorCostCenter?.color),
            },
          ]}
        />
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.trackingState')}</Typography.Text>
        <div className={styles.statusStack}>
          <Space size={4}>
            <StatusTag status={orderStatusTone(item.item.status)}>
              {value(item.item.status)}
            </StatusTag>
            <Tooltip title={t('orders.actions.viewHistory')}>
              <Button
                type="text"
                size="small"
                aria-label={t('orders.actions.viewHistory')}
                icon={<HistoryOutlined />}
                onClick={() => onHistory(item.item.id)}
              />
            </Tooltip>
          </Space>
          <span>
            {t('orders.fields.stage')}: {value(item.workflow.stage)}
          </span>
          <span>
            {t('orders.fields.scale')}: {value(item.production?.scaleStatus)}
          </span>
          <span>
            {t('orders.fields.qc')}: {value(item.production?.qcStatus)}
          </span>
          <span>
            {t('orders.fields.tracking')}: {value(item.tracking?.trackingNumber)}
          </span>
        </div>
        <Input.TextArea
          value={note}
          placeholder={t('orders.fields.noNote')}
          onChange={(event) => setNote(event.target.value)}
          readOnly={!canWrite}
          autoSize={{ minRows: 2, maxRows: 3 }}
        />
        {canWrite ? (
          <Space wrap>
            <Button
              icon={<SaveOutlined />}
              loading={pending}
              onClick={() => onAction({ kind: 'note', itemId: item.item.id, note })}
            >
              {t('orders.actions.saveNote')}
            </Button>
          </Space>
        ) : null}
      </section>
      <section className={styles.itemActions}>
        <Typography.Text strong>{t('orders.sections.itemActions')}</Typography.Text>
        {canWrite ? (
          <Space orientation="vertical" size={4}>
            {!terminal ? (
              <Tooltip title={t('orders.actions.createReplacement')} placement="left">
                <Button
                  type="text"
                  aria-label={t('orders.actions.replaceShort')}
                  icon={<SwapOutlined />}
                  onClick={() => onConfirm('replacement', item)}
                >
                  {t('orders.actions.replaceShort')}
                </Button>
              </Tooltip>
            ) : null}
            {canRecheck ? (
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
            {!terminal ? (
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
            {!terminal ? (
              <Tooltip title={t('orders.actions.cancelItem')} placement="left">
                <Button
                  danger
                  type="text"
                  aria-label={t('orders.actions.cancelShort')}
                  icon={<DeleteOutlined />}
                  onClick={() => onConfirm('cancel', item)}
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
