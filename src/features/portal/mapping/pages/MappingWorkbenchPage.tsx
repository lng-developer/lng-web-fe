import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { SyncOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App as AntdApp, Button, Card, Space, Tag, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { orderKeys } from '@/features/portal/orders/api/orderKeys'
import { normalizeApiError } from '@/shared/api'
import { CopyableOrderId, FeedbackAlert, useFeedbackToast } from '@/shared/ui'

import {
  recheckOrderItem,
  recheckUnmatched,
  selectFulfillmentCandidate,
  type UnmatchedMappingItem,
  type VendorCandidateSearchRow,
} from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'
import { LiveTracePanel } from '../components/LiveTracePanel'
import { MappingContextBar, type MappingContextValue } from '../components/MappingContextBar'
import { ResolveQueuePanel } from '../components/ResolveQueuePanel'
import {
  useAuthorableShopsQuery,
  useOrderItemPreviewQuery,
  useUnmatchedItemsQuery,
  useVendorCandidatesQuery,
} from '../hooks'
import { toMappingTraceView, type TraceCandidate } from '../model/mappingModel'
import { getRulePageForFixType } from '../model/mappingPageConfig'
import styles from './MappingWorkspacePage.module.scss'

const PAGE_SIZE = 50

const toTraceCandidate = (item: VendorCandidateSearchRow): TraceCandidate => ({
  vendorProductId: item.vendorProduct.id,
  vendorCostCenterId: item.vendorCostCenter.id,
  vendorProductName: item.vendorProduct.name ?? item.vendorProduct.code ?? undefined,
  vendorCostCenterCode: item.vendorCostCenter.code ?? undefined,
  vendorName: item.vendor.name ?? item.vendor.code ?? undefined,
  size: item.vendorCostCenter.standardSize,
  color: item.vendorCostCenter.standardColor,
  confidence: item.match.confidence,
  matchScore: item.match.score,
  baseCostAmount: item.vendorCostCenter.baseCostAmount,
  currency: item.vendorCostCenter.currency,
})

export function MappingWorkbenchPage({
  account: accountProp,
}: {
  readonly account?: CurrentAccount
}) {
  const { t } = useTranslation()
  const { modal } = AntdApp.useApp()
  const [searchParams] = useSearchParams()
  const linkedOrderItemId = searchParams.get('orderItemId') ?? ''
  const loadedAccount = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const account = accountProp ?? loadedAccount
  const permissions = useMemo(
    () =>
      account
        ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
        : [],
    [account],
  )
  const canWrite = permissions.includes('MAPPING:WRITE')
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const [context, setContext] = useState<MappingContextValue>({})
  const [queueSearch, setQueueSearch] = useState(linkedOrderItemId)
  const deferredQueueSearch = useDeferredValue(queueSearch)
  const [queueBlocker, setQueueBlocker] = useState<string>()
  const [batchPage, setBatchPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<UnmatchedMappingItem | undefined>(() => {
    return linkedOrderItemId
      ? { id: linkedOrderItemId, orderItemId: linkedOrderItemId, blockingReasons: [] }
      : undefined
  })
  const [candidateSearch, setCandidateSearch] = useState('')

  const orderItemId = selectedItem?.orderItemId ?? selectedItem?.id
  const apiContext = useMemo(
    () => ({ shopId: context.shopId, marketplaceCode: context.marketplaceCode }),
    [context.shopId, context.marketplaceCode],
  )
  const unmatchedParams = useMemo(
    () => ({
      ...apiContext,
      q: deferredQueueSearch,
      blocker: queueBlocker,
      page: 1,
      limit: PAGE_SIZE,
    }),
    [apiContext, deferredQueueSearch, queueBlocker],
  )
  const shops = useAuthorableShopsQuery({ enabled: canWrite })
  const unmatched = useUnmatchedItemsQuery(unmatchedParams)
  const preview = useOrderItemPreviewQuery(selectedItem?.orderItemId ?? selectedItem?.id)
  const candidates = useVendorCandidatesQuery(orderItemId, candidateSearch)

  const notifyError = useCallback(
    (error: unknown) =>
      toast('error', t('mapping.feedback.actionFailed'), normalizeApiError(error).message),
    [t, toast],
  )
  const refreshQueue = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: mappingKeys.unmatchedRoot() }),
      queryClient.invalidateQueries({ queryKey: mappingKeys.summaryRoot() }),
      queryClient.invalidateQueries({ queryKey: orderKeys.all }),
    ])
  }, [queryClient])

  const recheck = useMutation({
    mutationFn: recheckOrderItem,
    onSuccess: async () => {
      await refreshQueue()
      toast('success', t('mapping.feedback.itemRechecked'))
    },
    onError: notifyError,
  })
  const selectCandidate = useMutation({
    mutationFn: ({ costCenterId, productId }: { costCenterId: string; productId: string }) =>
      selectFulfillmentCandidate(selectedItem!.orderItemId ?? selectedItem!.id, {
        vendorCostCenterId: costCenterId,
        vendorProductId: productId,
      }),
    onSuccess: () => {
      toast('success', t('mapping.feedback.candidateSelected'))
      void refreshQueue()
    },
    onError: notifyError,
  })
  const batch = useMutation({
    mutationFn: () => recheckUnmatched({ ...apiContext, limit: 10, page: batchPage }),
    onSuccess: async (result) => {
      setBatchPage((page) => page + 1)
      await refreshQueue()
      toast(
        'success',
        t('mapping.feedback.batchCompleted'),
        `checked ${result.checked} / resolved ${result.resolved} / blocked ${result.blocked} / skipped ${result.skippedExisting}`,
      )
    },
    onError: notifyError,
  })

  const candidateItems = candidates.data?.items
  const trace = useMemo(() => {
    if (!preview.data) return undefined
    const view = toMappingTraceView(preview.data)
    if (view.candidates.length || !candidateItems?.length) return view
    return { ...view, candidates: candidateItems.map(toTraceCandidate) }
  }, [candidateItems, preview.data])
  const rulePage = getRulePageForFixType(selectedItem?.recommendedFixTypes?.[0])
  const ruleSearch =
    orderItemId && rulePage
      ? new URLSearchParams({
          orderItemId,
          configCode:
            preview.data?.skuMapping?.configCode ?? selectedItem?.skuMapping?.configCode ?? '',
          returnTo: '/portal/mapping?tab=workbench',
        }).toString()
      : ''

  const handleBlockerChange = useCallback((value?: string) => {
    setBatchPage(1)
    setQueueBlocker(value)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setBatchPage(1)
    setQueueSearch(value)
  }, [])

  const handleSelectCandidate = useCallback(
    (costCenterId: string, productId: string) => {
      selectCandidate.mutate({ costCenterId, productId })
    },
    [selectCandidate],
  )

  const handleRecheck = useCallback(() => {
    if (orderItemId) recheck.mutate(orderItemId)
  }, [orderItemId, recheck])

  const handleCandidateSearchChange = useCallback((value: string) => {
    setCandidateSearch(value)
  }, [])

  const handleContextChange = useCallback((nextContext: MappingContextValue) => {
    setBatchPage(1)
    setContext(nextContext)
  }, [])

  const handleContextPreview = useCallback(() => {
    setBatchPage(1)
    setQueueSearch(context.search ?? '')
  }, [context.search])

  const handleBatchConfirm = useCallback(() => {
    modal.confirm({
      title: t('mapping.actions.batchRecheck'),
      onOk: () => batch.mutateAsync(),
    })
  }, [batch, modal, t])

  return (
    <section className={styles.workbenchPage}>
      {/* ── Context Filter Bar ── */}
      <MappingContextBar
        loading={shops.isLoading}
        shops={shops.data}
        value={context}
        actions={
          canWrite ? (
            <Button icon={<SyncOutlined />} loading={batch.isPending} onClick={handleBatchConfirm}>
              {t('mapping.actions.batchRecheck')}
            </Button>
          ) : null
        }
        onChange={handleContextChange}
        onPreview={handleContextPreview}
      />

      {unmatched.error ? (
        <FeedbackAlert type="error" title={t('mapping.feedback.loadFailed')} />
      ) : null}

      {/* ── Workspace Split Panel ── */}
      <div className={styles.workspace}>
        {/* Queue */}
        <Card
          size="small"
          className={styles.queueCard}
          title={
            <Space size={6}>
              <span>{t('mapping.sections.resolveQueue')}</span>
              <Tag color="blue" style={{ margin: 0 }}>
                {unmatched.data?.pagination.total ?? 0}
              </Tag>
            </Space>
          }
        >
          <ResolveQueuePanel
            items={unmatched.data?.items ?? []}
            loading={unmatched.isLoading}
            selectedId={selectedItem?.id}
            blocker={queueBlocker}
            search={queueSearch}
            onBlockerChange={handleBlockerChange}
            onSearchChange={handleSearchChange}
            onSelect={setSelectedItem}
            onRecommendedStage={() => undefined}
          />
        </Card>

        {/* Live Trace */}
        <Card
          size="small"
          className={styles.traceCard}
          title={
            <Space size={8}>
              <Typography.Text strong>
                {selectedItem?.sku ||
                  selectedItem?.externalOrderId ||
                  t('mapping.sections.liveTrace')}
              </Typography.Text>
              {selectedItem?.externalOrderId ? (
                <CopyableOrderId
                  value={selectedItem.externalOrderId}
                  fallback={selectedItem.asin || t('mapping.states.unavailable')}
                />
              ) : null}
            </Space>
          }
          extra={
            rulePage ? (
              <Link to={`/portal/mapping?tab=${rulePage.key}&${ruleSearch}`}>
                {t('mapping.actions.openRuleTab', { defaultValue: 'Fix in' })}{' '}
                {t(rulePage.titleKey)} →
              </Link>
            ) : null
          }
        >
          <LiveTracePanel
            canWrite={canWrite}
            loading={preview.isFetching || recheck.isPending}
            trace={trace}
            selectingCandidateId={
              selectCandidate.isPending ? selectCandidate.variables?.costCenterId : undefined
            }
            candidateSearch={candidateSearch}
            onRecheck={handleRecheck}
            onCandidateSearchChange={handleCandidateSearchChange}
            onSelectCandidate={handleSelectCandidate}
          />
        </Card>
      </div>
    </section>
  )
}

export default MappingWorkbenchPage
