import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRouteLoaderData } from 'react-router-dom'
import { SyncOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App as AntdApp, Button, Card, Select, Space, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { normalizeApiError } from '@/shared/api'
import { FeedbackAlert, PageHeader, useFeedbackToast } from '@/shared/ui'

import {
  getMappingSummary,
  listAuthorableShops,
  listUnmatchedItems,
  previewOrderItem,
  recheckOrderItem,
  recheckUnmatched,
  resolveOrderItem,
  selectFulfillmentCandidate,
  type UnmatchedMappingItem,
  type UnmatchedParams,
} from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'
import { LiveTracePanel } from '../components/LiveTracePanel'
import { MappingContextBar, type MappingContextValue } from '../components/MappingContextBar'
import { ResolveQueuePanel } from '../components/ResolveQueuePanel'
import { toMappingTraceView } from '../model/mappingModel'
import { getRulePageForFixType } from '../model/mappingPageConfig'
import styles from './MappingWorkspacePage.module.scss'

const PAGE_SIZE = 50

export function MappingWorkbenchPage({
  account: accountProp,
}: {
  readonly account?: CurrentAccount
}) {
  const { t } = useTranslation()
  const { modal } = AntdApp.useApp()
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
  const [queueSearch, setQueueSearch] = useState('')
  const [queueBlocker, setQueueBlocker] = useState<string>()
  const [queueStage, setQueueStage] = useState<UnmatchedParams['stage']>()
  const [queueAge, setQueueAge] = useState<UnmatchedParams['age']>()
  const [selectedItem, setSelectedItem] = useState<UnmatchedMappingItem>()
  const apiContext = { shopId: context.shopId, marketplaceCode: context.marketplaceCode }
  const unmatchedParams = {
    ...apiContext,
    q: queueSearch,
    blocker: queueBlocker,
    stage: queueStage,
    age: queueAge,
    page: 1,
    limit: PAGE_SIZE,
  }

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

  const notifyError = useCallback(
    (error: unknown) =>
      toast('error', t('mapping.feedback.actionFailed'), normalizeApiError(error).message),
    [t, toast],
  )
  const refreshQueue = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: mappingKeys.unmatchedRoot() }),
      queryClient.invalidateQueries({ queryKey: mappingKeys.summaryRoot() }),
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
    onSuccess: async () => {
      await refreshQueue()
      toast('success', t('mapping.feedback.candidateSelected'))
    },
    onError: notifyError,
  })
  const batch = useMutation({
    mutationFn: () => recheckUnmatched({ ...apiContext, limit: 50 }),
    onSuccess: async (result) => {
      await refreshQueue()
      toast(
        'success',
        t('mapping.feedback.batchCompleted'),
        `${result.processed ?? 0} / ${result.resolved ?? 0} / ${result.blocked ?? 0}`,
      )
    },
    onError: notifyError,
  })

  const trace = preview.data ? toMappingTraceView(preview.data) : undefined
  const rulePage = getRulePageForFixType(selectedItem?.recommendedFixTypes?.[0])
  const orderItemId = selectedItem?.orderItemId ?? selectedItem?.id
  const ruleSearch =
    orderItemId && rulePage
      ? new URLSearchParams({
          orderItemId,
          configCode:
            preview.data?.skuMapping?.configCode ?? selectedItem?.skuMapping?.configCode ?? '',
          returnTo: '/portal/mapping/workbench',
        }).toString()
      : ''

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('mapping.pages.workbench')}
        description={t('mapping.description')}
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
      />
      <MappingContextBar
        loading={shops.isLoading}
        shops={shops.data}
        value={context}
        onChange={setContext}
        onPreview={() => setQueueSearch(context.search ?? '')}
      />
      <Space wrap>
        <Select
          allowClear
          className="min-w-48"
          aria-label={t('mapping.filters.stage')}
          placeholder={t('mapping.filters.stage')}
          value={queueStage}
          options={[
            'SKU_CLEANUP',
            'PRODUCT_MAPPING',
            'INPUT_SEMANTICS',
            'VALUE_ALIASES',
            'VENDOR_ROUTING',
          ].map((value) => ({ value, label: value }))}
          onChange={setQueueStage}
        />
        <Select
          allowClear
          className="min-w-48"
          aria-label={t('mapping.filters.age')}
          placeholder={t('mapping.filters.age')}
          value={queueAge}
          options={['TODAY', 'OVER_24_HOURS', 'OVER_3_DAYS'].map((value) => ({
            value,
            label: value,
          }))}
          onChange={setQueueAge}
        />
      </Space>
      {summary.error || unmatched.error ? (
        <FeedbackAlert type="error" title={t('mapping.feedback.loadFailed')} />
      ) : null}
      <div className={styles.workspace}>
        <Card
          size="small"
          title={`${t('mapping.sections.resolveQueue')} · ${unmatched.data?.pagination.total ?? 0}`}
          className={styles.queue}
        >
          <ResolveQueuePanel
            items={unmatched.data?.items ?? []}
            loading={unmatched.isLoading}
            selectedId={selectedItem?.id}
            blocker={queueBlocker}
            search={queueSearch}
            onBlockerChange={setQueueBlocker}
            onSearchChange={setQueueSearch}
            onSelect={setSelectedItem}
            onRecommendedStage={() => undefined}
          />
        </Card>
        <Card
          size="small"
          className={styles.focus}
          title={
            selectedItem?.sku || selectedItem?.externalOrderId || t('mapping.sections.liveTrace')
          }
          extra={
            rulePage ? (
              <Link to={`/portal/mapping/${rulePage.path}?${ruleSearch}`}>
                Open {t(rulePage.titleKey)}
              </Link>
            ) : null
          }
        >
          {selectedItem ? (
            <Typography.Text type="secondary">
              {selectedItem.externalOrderId || selectedItem.asin || selectedItem.id}
            </Typography.Text>
          ) : null}
          <LiveTracePanel
            canWrite={canWrite}
            loading={preview.isFetching || recheck.isPending || resolve.isPending}
            trace={trace}
            selectingCandidateId={
              selectCandidate.isPending ? selectCandidate.variables?.costCenterId : undefined
            }
            onRecheck={() => orderItemId && recheck.mutate(orderItemId)}
            onResolve={() => orderItemId && resolve.mutate(orderItemId)}
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
