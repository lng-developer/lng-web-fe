import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, Select } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { normalizeApiError } from '@/shared/api'
import { FeedbackAlert, PageHeader, useFeedbackToast } from '@/shared/ui'

import {
  createMappingRule,
  findMappingRuleConflicts,
  listAuthorableShops,
  listMappingRules,
  type MappingRule,
  type MappingRuleInput,
  previewMappingRule,
  previewOrderItem,
  recheckOrderItem,
  updateMappingRule,
} from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'
import { RuleEditorPanel } from '../components/RuleEditorPanel'
import { RuleHistoryModal } from '../components/RuleHistoryModal'
import { RuleInventoryPanel } from '../components/RuleInventoryPanel'
import {
  getMappingRulePage,
  type MappingRulePageKey,
  safeMappingReturnTo,
} from '../model/mappingPageConfig'

export function MappingRulePage({ pageKey }: { readonly pageKey: MappingRulePageKey }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const page = getMappingRulePage(pageKey)
  const loadedAccount = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const permissions = useMemo(
    () =>
      loadedAccount
        ? [
            ...loadedAccount.permissions,
            ...loadedAccount.scopes.flatMap((scope) => scope.permissions),
          ]
        : [],
    [loadedAccount],
  )
  const canWrite = permissions.includes('MAPPING:WRITE')
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const orderItemId = searchParams.get('orderItemId') || undefined
  const returnTo = safeMappingReturnTo(searchParams.get('returnTo'))
  const contextConfigCode = searchParams.get('configCode') || undefined
  const [shopId, setShopId] = useState<string>()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>()
  const [selectedRule, setSelectedRule] = useState<MappingRule>()
  const [creating, setCreating] = useState(Boolean(orderItemId))
  const [historyRule, setHistoryRule] = useState<MappingRule>()

  const rules = useQuery({
    queryKey: mappingKeys.rules(page.ruleType, { shopId, page: 1, limit: 100 }),
    queryFn: () => listMappingRules(page.ruleType, { shopId, page: 1, limit: 100 }),
    retry: false,
  })
  const shops = useQuery({
    queryKey: mappingKeys.shops(),
    queryFn: listAuthorableShops,
    enabled: canWrite,
    retry: false,
  })
  const originPreview = useQuery({
    queryKey: mappingKeys.preview(orderItemId ?? ''),
    queryFn: () => previewOrderItem(orderItemId!),
    enabled: Boolean(orderItemId),
    retry: false,
  })
  const notifyError = useCallback(
    (error: unknown) =>
      toast('error', t('mapping.feedback.actionFailed'), normalizeApiError(error).message),
    [t, toast],
  )
  const saveRule = useMutation({
    mutationFn: (input: MappingRuleInput) =>
      selectedRule
        ? updateMappingRule(page.ruleType, selectedRule.id, input)
        : createMappingRule(page.ruleType, input),
    onSuccess: async (rule) => {
      setSelectedRule(rule)
      setCreating(false)
      await queryClient.invalidateQueries({ queryKey: mappingKeys.rulesRoot(page.ruleType) })
      toast('success', t('mapping.feedback.ruleSaved'))
      if (!orderItemId) return
      const result = await recheckOrderItem(orderItemId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mappingKeys.preview(orderItemId) }),
        queryClient.invalidateQueries({ queryKey: mappingKeys.unmatchedRoot() }),
        queryClient.invalidateQueries({ queryKey: mappingKeys.summaryRoot() }),
      ])
      const status = result.plan?.status
      if (result.ready || status === 'READY' || status === 'CONFIRMED') navigate(returnTo)
      else toast('success', t('mapping.feedback.itemRechecked'))
    },
    onError: notifyError,
  })
  const contextRule = useMemo<MappingRule | undefined>(() => {
    if (!creating) return undefined
    const configCode = contextConfigCode ?? originPreview.data?.skuMapping?.configCode
    return { id: '', ...(configCode && page.ruleType === 'skuConfig' ? { configCode } : {}) }
  }, [contextConfigCode, creating, originPreview.data?.skuMapping?.configCode, page.ruleType])

  return (
    <section className="flex min-h-0 flex-col gap-4">
      <PageHeader title={t(page.titleKey)} description={t(page.descriptionKey)} />
      {rules.error || originPreview.error ? (
        <FeedbackAlert type="error" title={t('mapping.feedback.loadFailed')} />
      ) : null}
      <div className="grid min-h-0 grid-cols-[18rem_minmax(0,1fr)] gap-4">
        <Card size="small" title={t('mapping.sections.rules')}>
          <Select
            allowClear
            className="mb-2 w-full"
            placeholder={t('mapping.context.allShops')}
            loading={shops.isLoading}
            value={shopId}
            options={(shops.data?.items ?? []).map((shop) => ({
              value: shop.id,
              label: shop.name || shop.code || shop.id,
            }))}
            onChange={setShopId}
          />
          <RuleInventoryPanel
            canWrite={canWrite}
            loading={rules.isLoading}
            rules={rules.data?.items ?? []}
            search={search}
            status={status}
            selectedId={selectedRule?.id}
            onCreate={() => {
              setSelectedRule(undefined)
              setCreating(true)
            }}
            onHistory={setHistoryRule}
            onSearchChange={setSearch}
            onSelect={(rule) => {
              setSelectedRule(rule)
              setCreating(false)
            }}
            onStatusChange={setStatus}
          />
        </Card>
        <Card
          size="small"
          title={creating ? t('mapping.actions.createRule') : t('mapping.sections.ruleEditor')}
        >
          {orderItemId ? (
            <FeedbackAlert
              type="success"
              title={originPreview.data?.skuMapping?.configCode || orderItemId}
              description={orderItemId}
            />
          ) : null}
          <RuleEditorPanel
            key={`${page.ruleType}:${selectedRule?.id ?? contextConfigCode ?? 'new'}`}
            canWrite={canWrite}
            rule={selectedRule ?? contextRule}
            type={page.ruleType}
            saving={saveRule.isPending}
            onDirtyChange={() => undefined}
            onPreview={(rule) =>
              previewMappingRule({
                ruleType: page.ruleType,
                rule,
                samples: orderItemId ? [{ orderItemId }] : [],
              })
            }
            onConflicts={(rule) =>
              findMappingRuleConflicts({ ruleId: selectedRule?.id, ruleType: page.ruleType, rule })
            }
            onSave={(rule) => saveRule.mutateAsync(rule).then(() => undefined)}
          />
        </Card>
      </div>
      <RuleHistoryModal
        id={historyRule?.id}
        open={Boolean(historyRule)}
        type={page.ruleType}
        onClose={() => setHistoryRule(undefined)}
      />
    </section>
  )
}

export default MappingRulePage
