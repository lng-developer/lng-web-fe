import { type ReactNode, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRouteLoaderData, useSearchParams } from 'react-router-dom'
import {
  ApartmentOutlined,
  BlockOutlined,
  BranchesOutlined,
  FieldStringOutlined,
  ScissorOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App as AntdApp, Button, Card, Select, Space, Tag, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { orderKeys } from '@/features/portal/orders/api/orderKeys'
import { normalizeApiError } from '@/shared/api'
import { CopyableOrderId, FeedbackAlert, useFeedbackToast } from '@/shared/ui'

import {
  getMappingSummary,
  listAuthorableShops,
  listUnmatchedItems,
  previewOrderItem,
  recheckOrderItem,
  recheckUnmatched,
  resolveOrderItem,
  searchVendorCandidates,
  selectFulfillmentCandidate,
  type UnmatchedMappingItem,
  type UnmatchedParams,
  type VendorCandidateSearchRow,
} from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'
import { LiveTracePanel } from '../components/LiveTracePanel'
import { MappingContextBar, type MappingContextValue } from '../components/MappingContextBar'
import { ResolveQueuePanel } from '../components/ResolveQueuePanel'
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

type StageKey =
  | 'SKU_CLEANUP'
  | 'PRODUCT_MAPPING'
  | 'INPUT_SEMANTICS'
  | 'VALUE_ALIASES'
  | 'VENDOR_ROUTING'

type StageCounts = Record<StageKey, number>

const STAGE_CONFIG: {
  key: StageKey
  icon: ReactNode
  labelKey: string
  countKey: StageKey
}[] = [
  {
    key: 'SKU_CLEANUP',
    icon: <ScissorOutlined />,
    labelKey: 'mapping.pipeline.skuCleanup',
    countKey: 'SKU_CLEANUP',
  },
  {
    key: 'PRODUCT_MAPPING',
    icon: <BlockOutlined />,
    labelKey: 'mapping.pipeline.productMapping',
    countKey: 'PRODUCT_MAPPING',
  },
  {
    key: 'INPUT_SEMANTICS',
    icon: <FieldStringOutlined />,
    labelKey: 'mapping.pipeline.inputSemantics',
    countKey: 'INPUT_SEMANTICS',
  },
  {
    key: 'VALUE_ALIASES',
    icon: <ApartmentOutlined />,
    labelKey: 'mapping.pipeline.valueAliases',
    countKey: 'VALUE_ALIASES',
  },
  {
    key: 'VENDOR_ROUTING',
    icon: <BranchesOutlined />,
    labelKey: 'mapping.pipeline.vendorRouting',
    countKey: 'VENDOR_ROUTING',
  },
]

function buildStageCounters(summary?: {
  missingSkuConfigCount?: number
  missingSemanticRuleCount?: number
  missingVendorProductCount?: number
  missingVendorCostCenterCount?: number
}): StageCounts {
  return {
    SKU_CLEANUP: 0,
    PRODUCT_MAPPING: summary?.missingSkuConfigCount ?? 0,
    INPUT_SEMANTICS: summary?.missingSemanticRuleCount ?? 0,
    VALUE_ALIASES: 0,
    VENDOR_ROUTING:
      (summary?.missingVendorProductCount ?? 0) + (summary?.missingVendorCostCenterCount ?? 0),
  }
}

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
  const [queueStage, setQueueStage] = useState<UnmatchedParams['stage']>()
  const [queueAge, setQueueAge] = useState<UnmatchedParams['age']>()
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
      stage: queueStage,
      age: queueAge,
      page: 1,
      limit: PAGE_SIZE,
    }),
    [apiContext, deferredQueueSearch, queueBlocker, queueStage, queueAge],
  )

  const summary = useQuery({
    queryKey: mappingKeys.summary(apiContext),
    queryFn: () => getMappingSummary(apiContext),
    retry: false,
  })
  const shops = useQuery({
    queryKey: mappingKeys.shops(),
    queryFn: listAuthorableShops,
    enabled: canWrite,
    retry: false,
  })
  const unmatched = useQuery({
    queryKey: mappingKeys.unmatched(unmatchedParams),
    queryFn: () => listUnmatchedItems(unmatchedParams),
    retry: false,
  })
  const preview = useQuery({
    queryKey: mappingKeys.preview(selectedItem?.orderItemId ?? selectedItem?.id ?? ''),
    queryFn: () => previewOrderItem(selectedItem!.orderItemId ?? selectedItem!.id),
    enabled: Boolean(selectedItem),
    retry: false,
  })
  const candidates = useQuery({
    queryKey: mappingKeys.candidates(orderItemId ?? '', candidateSearch),
    queryFn: () => searchVendorCandidates(orderItemId!, { q: candidateSearch, limit: 100 }),
    enabled: Boolean(orderItemId),
    retry: false,
  })

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
  const resolve = useMutation({
    mutationFn: resolveOrderItem,
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

  const stageCounters = useMemo(() => buildStageCounters(summary.data), [summary.data])

  return (
    <section className={styles.page}>
      {/* ── Context Filter Bar ── */}
      <MappingContextBar
        loading={shops.isLoading}
        shops={shops.data}
        value={context}
        actions={
          canWrite ? (
            <Button
              icon={<SyncOutlined />}
              loading={batch.isPending}
              onClick={() =>
                modal.confirm({
                  title: t('mapping.actions.batchRecheck'),
                  onOk: () => batch.mutateAsync(),
                })
              }
            >
              {t('mapping.actions.batchRecheck')}
            </Button>
          ) : null
        }
        onChange={(nextContext) => {
          setBatchPage(1)
          setContext(nextContext)
        }}
        onPreview={() => {
          setBatchPage(1)
          setQueueSearch(context.search ?? '')
        }}
      />

      {/* ── Stage Quick-Filter Pills ── */}
      <div className={styles.stageFilters}>
        {STAGE_CONFIG.map(({ key, icon, labelKey }) => {
          const count = stageCounters[key]
          const isActive = queueStage === key
          return (
            <button
              key={key}
              type="button"
              className={`${styles.stagePill} ${isActive ? styles.active : ''}`}
              onClick={() => {
                setBatchPage(1)
                setQueueStage(isActive ? undefined : key)
              }}
            >
              {icon}
              <span>{t(labelKey)}</span>
              <span
                className={`${styles.stagePillCount} ${count > 0 && !isActive ? styles.urgent : ''}`}
              >
                {count}
              </span>
            </button>
          )
        })}
        <Select
          allowClear
          size="small"
          style={{ minWidth: 140 }}
          aria-label={t('mapping.filters.age')}
          placeholder={t('mapping.filters.age')}
          value={queueAge}
          options={[
            { value: 'TODAY', label: t('mapping.age.today', { defaultValue: 'Today' }) },
            {
              value: 'OVER_24_HOURS',
              label: t('mapping.age.over24h', { defaultValue: '>24 hours' }),
            },
            { value: 'OVER_3_DAYS', label: t('mapping.age.over3d', { defaultValue: '>3 days' }) },
          ]}
          onChange={(value) => {
            setBatchPage(1)
            setQueueAge(value)
          }}
        />
      </div>

      {summary.error || unmatched.error ? (
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
            onBlockerChange={(value) => {
              setBatchPage(1)
              setQueueBlocker(value)
            }}
            onSearchChange={(value) => {
              setBatchPage(1)
              setQueueSearch(value)
            }}
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
            loading={preview.isFetching || recheck.isPending || resolve.isPending}
            trace={trace}
            selectingCandidateId={
              selectCandidate.isPending ? selectCandidate.variables?.costCenterId : undefined
            }
            candidateSearch={candidateSearch}
            onRecheck={() => orderItemId && recheck.mutate(orderItemId)}
            onResolve={() => orderItemId && resolve.mutate(orderItemId)}
            onCandidateSearchChange={setCandidateSearch}
            onSelectCandidate={(costCenterId, productId) =>
              selectCandidate.mutate({ costCenterId, productId })
            }
          />
        </Card>
      </div>
    </section>
  )
}

export default MappingWorkbenchPage
