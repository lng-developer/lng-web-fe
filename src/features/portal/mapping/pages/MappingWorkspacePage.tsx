import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { CloseOutlined, SyncOutlined, ToolOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App as AntdApp, Button, Card, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { normalizeApiError } from '@/shared/api'
import { FeedbackAlert, PageHeader, useFeedbackToast } from '@/shared/ui'

import {
  createMappingRule,
  findMappingRuleConflicts,
  getMappingSummary,
  listAuthorableShops,
  listMappingRules,
  listUnmatchedItems,
  type MappingRule,
  type MappingRuleInput,
  type MappingRuleType,
  previewMappingRule,
  previewOrderItem,
  recheckOrderItem,
  recheckUnmatched,
  resolveOrderItem,
  selectFulfillmentCandidate,
  type UnmatchedMappingItem,
  updateMappingRule,
} from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'
import { LiveTracePanel } from '../components/LiveTracePanel'
import { MappingContextBar, type MappingContextValue } from '../components/MappingContextBar'
import { MappingPipelineNav } from '../components/MappingPipelineNav'
import { ResolveQueuePanel } from '../components/ResolveQueuePanel'
import { RuleEditorPanel } from '../components/RuleEditorPanel'
import { RuleHistoryModal } from '../components/RuleHistoryModal'
import { RuleInventoryPanel } from '../components/RuleInventoryPanel'
import {
  getRuleTypeForStage,
  type MappingPipelineStage,
  toMappingTraceView,
} from '../model/mappingModel'
import styles from './MappingWorkspacePage.module.scss'

const PAGE_SIZE = 50

export function MappingWorkspacePage({
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
  const [activeStage, setActiveStage] = useState<MappingPipelineStage>('SKU_CLEANUP')
  const [selectedItem, setSelectedItem] = useState<UnmatchedMappingItem>()
  const [selectedRule, setSelectedRule] = useState<MappingRule>()
  const [creatingRule, setCreatingRule] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [historyRule, setHistoryRule] = useState<{
    rule: MappingRule
    type: MappingRuleType
  }>()
  const [dirtyEditor, setDirtyEditor] = useState(false)
  const [queueSearch, setQueueSearch] = useState('')
  const [queueBlocker, setQueueBlocker] = useState<string>()
  const [ruleSearch, setRuleSearch] = useState('')
  const [ruleStatus, setRuleStatus] = useState<'ACTIVE' | 'INACTIVE'>()

  const ruleType = getRuleTypeForStage(activeStage)
  const apiContext = { shopId: context.shopId, marketplaceCode: context.marketplaceCode }
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
    queryKey: mappingKeys.unmatched({ ...apiContext, page: 1, limit: PAGE_SIZE }),
    queryFn: () => listUnmatchedItems({ ...apiContext, page: 1, limit: PAGE_SIZE }),
    retry: false,
  })
  const rules = useQuery({
    queryKey: mappingKeys.rules(ruleType, { ...apiContext, page: 1, limit: 100 }),
    queryFn: () => listMappingRules(ruleType, { ...apiContext, page: 1, limit: 100 }),
    enabled: editorOpen,
    retry: false,
  })
  const preview = useQuery({
    queryKey: mappingKeys.preview(selectedItem?.id ?? ''),
    queryFn: () => previewOrderItem(selectedItem!.id),
    enabled: Boolean(selectedItem?.id),
    retry: false,
  })

  const notifyError = useCallback(
    (error: unknown) =>
      toast('error', t('mapping.feedback.actionFailed'), normalizeApiError(error).message),
    [t, toast],
  )
  const refreshMapping = useCallback(
    () => queryClient.invalidateQueries({ queryKey: mappingKeys.all }),
    [queryClient],
  )
  const recheck = useMutation({
    mutationFn: recheckOrderItem,
    onSuccess: async () => {
      await refreshMapping()
      toast('success', t('mapping.feedback.itemRechecked'))
    },
    onError: notifyError,
  })
  const resolve = useMutation({
    mutationFn: resolveOrderItem,
    onSuccess: async () => {
      await refreshMapping()
      toast('success', t('mapping.feedback.itemRechecked'))
    },
    onError: notifyError,
  })
  const selectCandidate = useMutation({
    mutationFn: ({ costCenterId, productId }: { costCenterId: string; productId: string }) =>
      selectFulfillmentCandidate(selectedItem!.id, {
        vendorCostCenterId: costCenterId,
        vendorProductId: productId,
      }),
    onSuccess: async () => {
      await refreshMapping()
      toast('success', t('mapping.feedback.candidateSelected'))
      const items = unmatched.data?.items ?? []
      const nextIndex = items.findIndex((item) => item.id === selectedItem?.id) + 1
      if (nextIndex > 0 && items[nextIndex]) setSelectedItem(items[nextIndex])
    },
    onError: notifyError,
  })
  const saveRule = useMutation({
    mutationFn: (input: MappingRuleInput) =>
      selectedRule
        ? updateMappingRule(ruleType, selectedRule.id, input)
        : createMappingRule(ruleType, input),
    onSuccess: async (rule) => {
      await queryClient.invalidateQueries({ queryKey: mappingKeys.rulesRoot(ruleType) })
      setSelectedRule(rule)
      setCreatingRule(false)
      setDirtyEditor(false)
      toast('success', t('mapping.feedback.ruleSaved'))
      if (selectedItem) await recheck.mutateAsync(selectedItem.id)
    },
    onError: notifyError,
  })
  const batch = useMutation({
    mutationFn: () => recheckUnmatched({ ...apiContext, limit: 50 }),
    onSuccess: async (result) => {
      await refreshMapping()
      toast(
        'success',
        t('mapping.feedback.batchCompleted'),
        `${result.processed ?? 0} / ${result.resolved ?? 0} / ${result.blocked ?? 0}`,
      )
    },
    onError: notifyError,
  })

  const confirmDiscard = useCallback(
    (next: () => void) => {
      if (!dirtyEditor) return next()
      modal.confirm({
        title: t('mapping.feedback.unsaved'),
        okText: t('foundation.actions.primary'),
        cancelText: t('foundation.actions.cancel'),
        onOk: () => {
          setDirtyEditor(false)
          next()
        },
      })
    },
    [dirtyEditor, modal, t],
  )
  const queueItems = useMemo(() => {
    const search = queueSearch.trim().toLowerCase()
    return (unmatched.data?.items ?? []).filter(
      (item) =>
        (!queueBlocker || item.blockingReasons.includes(queueBlocker)) &&
        (!search ||
          `${item.sku} ${item.asin} ${item.externalOrderId}`.toLowerCase().includes(search)),
    )
  }, [queueBlocker, queueSearch, unmatched.data?.items])
  const trace = preview.data ? toMappingTraceView(preview.data) : undefined
  const stageCounts = {
    SKU_CLEANUP: summary.data?.missingSkuConfigCount,
    PRODUCT_MAPPING: summary.data?.ambiguousSkuConfigCount,
    INPUT_SEMANTICS: summary.data?.missingSemanticRuleCount,
    VENDOR_ROUTING:
      (summary.data?.missingVendorProductCount ?? 0) +
      (summary.data?.missingVendorCostCenterCount ?? 0),
  }
  const changeStage = (stage: MappingPipelineStage) =>
    confirmDiscard(() => {
      setActiveStage(stage)
      setSelectedRule(undefined)
      setCreatingRule(false)
    })

  const closeEditor = () =>
    confirmDiscard(() => {
      setEditorOpen(false)
      setSelectedRule(undefined)
      setCreatingRule(false)
    })

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('mapping.title')}
        description={t('mapping.description')}
        actions={
          canWrite ? (
            <Button
              icon={<SyncOutlined />}
              loading={batch.isPending}
              onClick={() =>
                modal.confirm({
                  title: t('mapping.actions.batchRecheck'),
                  content: `${context.shopId || t('mapping.context.allShops')} · 50`,
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
        onChange={(next) => confirmDiscard(() => setContext(next))}
        onPreview={() => {
          const query = context.search?.trim().toLowerCase()
          const item = (unmatched.data?.items ?? []).find((candidate) =>
            `${candidate.id} ${candidate.sku} ${candidate.externalOrderId}`
              .toLowerCase()
              .includes(query ?? ''),
          )
          if (item) setSelectedItem(item)
        }}
      />
      {summary.error || unmatched.error || (editorOpen && rules.error) ? (
        <FeedbackAlert type="error" title={t('mapping.feedback.loadFailed')} />
      ) : null}
      <div className={styles.workspace}>
        <Card size="small" title={t('mapping.sections.resolveQueue')} className={styles.queue}>
          <ResolveQueuePanel
            items={queueItems}
            loading={unmatched.isLoading}
            selectedId={selectedItem?.id}
            blocker={queueBlocker}
            search={queueSearch}
            onBlockerChange={setQueueBlocker}
            onSearchChange={setQueueSearch}
            onSelect={(item) => {
              setSelectedItem(item)
              setEditorOpen(false)
            }}
            onRecommendedStage={changeStage}
          />
        </Card>
        <div className={styles.focus}>
          <Card
            size="small"
            className={styles.trace}
            title={
              selectedItem?.sku || selectedItem?.externalOrderId || t('mapping.sections.liveTrace')
            }
            extra={
              selectedItem && canWrite ? (
                <Button type="primary" icon={<ToolOutlined />} onClick={() => setEditorOpen(true)}>
                  {t('mapping.actions.fixNow')}
                </Button>
              ) : null
            }
          >
            {selectedItem ? (
              <Typography.Text type="secondary">
                {selectedItem.externalOrderId || selectedItem.asin || selectedItem.id}
              </Typography.Text>
            ) : null}
            <div className={styles.pipeline}>
              <MappingPipelineNav
                compact
                activeStage={activeStage}
                counts={stageCounts}
                onChange={changeStage}
              />
            </div>
            <LiveTracePanel
              canWrite={canWrite}
              loading={preview.isFetching || recheck.isPending || resolve.isPending}
              trace={trace}
              selectingCandidateId={
                selectCandidate.isPending ? selectCandidate.variables?.costCenterId : undefined
              }
              onRecheck={() => selectedItem && recheck.mutate(selectedItem.id)}
              onResolve={() => selectedItem && resolve.mutate(selectedItem.id)}
              onSelectCandidate={(costCenterId, productId) =>
                selectCandidate.mutate({ costCenterId, productId })
              }
            />
          </Card>
          {editorOpen ? (
            <div className={styles.editorWorkspace}>
              <Card size="small" title={t('mapping.sections.rules')} className={styles.rules}>
                <RuleInventoryPanel
                  canWrite={canWrite}
                  loading={rules.isLoading}
                  rules={rules.data?.items ?? []}
                  search={ruleSearch}
                  status={ruleStatus}
                  selectedId={selectedRule?.id}
                  onCreate={() =>
                    confirmDiscard(() => {
                      setSelectedRule(undefined)
                      setCreatingRule(true)
                    })
                  }
                  onHistory={(rule) => setHistoryRule({ rule, type: ruleType })}
                  onSearchChange={setRuleSearch}
                  onSelect={(rule) =>
                    confirmDiscard(() => {
                      setSelectedRule(rule)
                      setCreatingRule(false)
                    })
                  }
                  onStatusChange={setRuleStatus}
                />
              </Card>
              <Card
                size="small"
                className={styles.editor}
                title={
                  creatingRule ? t('mapping.actions.createRule') : t('mapping.sections.ruleEditor')
                }
                extra={
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    aria-label={t('mapping.actions.closeEditor')}
                    onClick={closeEditor}
                  />
                }
              >
                <RuleEditorPanel
                  key={`${ruleType}:${selectedRule?.id ?? creatingRule}`}
                  canWrite={canWrite}
                  rule={selectedRule}
                  type={ruleType}
                  saving={saveRule.isPending}
                  onDirtyChange={setDirtyEditor}
                  onPreview={(rule) => previewMappingRule({ ruleType, rule, samples: [] })}
                  onConflicts={(rule) =>
                    findMappingRuleConflicts({ ruleId: selectedRule?.id, ruleType, rule })
                  }
                  onSave={(rule) => saveRule.mutateAsync(rule).then(() => undefined)}
                />
              </Card>
            </div>
          ) : null}
        </div>
      </div>
      <RuleHistoryModal
        id={historyRule?.rule.id}
        open={Boolean(historyRule)}
        type={historyRule?.type ?? ruleType}
        onClose={() => setHistoryRule(undefined)}
      />
    </section>
  )
}

export default MappingWorkspacePage
