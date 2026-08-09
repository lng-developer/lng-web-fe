import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Card, Drawer, Flex, Modal, Select, Space, Tag, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getListingOptions } from '@/features/portal/catalog/api/catalogApi'
import { listVendors } from '@/features/portal/vendors/api/vendorApi'
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
  const editorOpen = creating || Boolean(selectedRule)

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
  const catalogOptions = useQuery({
    queryKey: ['portal', 'catalog', 'listing-options'],
    queryFn: getListingOptions,
    enabled: ['skuConfig', 'semanticRules', 'vendorRouting'].includes(page.ruleType),
    retry: false,
  })
  const vendors = useQuery({
    queryKey: ['portal', 'vendors', { status: 'ACTIVE', limit: 100 }],
    queryFn: () => listVendors({ status: 'ACTIVE', limit: 100 }),
    enabled: page.ruleType === 'vendorRouting',
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
    onSuccess: async () => {
      setSelectedRule(undefined)
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
    const productTypeGroupId = originPreview.data?.productTypeGroup?.id
    return {
      id: '',
      ...(shopId ? { shopId } : {}),
      ...(configCode && page.ruleType === 'skuConfig' ? { configCode } : {}),
      ...(productTypeGroupId && page.ruleType === 'skuConfig' ? { productTypeGroupId } : {}),
    }
  }, [
    contextConfigCode,
    creating,
    originPreview.data?.productTypeGroup?.id,
    originPreview.data?.skuMapping?.configCode,
    page.ruleType,
    shopId,
  ])
  const referenceLabels = useMemo(
    () => ({
      productGroups: Object.fromEntries(
        (catalogOptions.data?.productTypeGroups ?? []).map(({ id, code, name }) => [
          id,
          code ? `${name} · ${code}` : name,
        ]),
      ),
      templates: Object.fromEntries(
        (catalogOptions.data?.internalTemplates ?? []).map(({ id, code, name }) => [
          id,
          code ? `${name} · ${code}` : name,
        ]),
      ),
      vendors: Object.fromEntries(
        (vendors.data?.items ?? []).map(({ id, code, name }) => [
          id,
          code ? `${name} · ${code}` : name,
        ]),
      ),
    }),
    [catalogOptions.data, vendors.data],
  )
  const toggleRuleStatus = (rule: MappingRule) => {
    const active = rule.status === 'ACTIVE'
    Modal.confirm({
      centered: true,
      title: t(active ? 'mapping.actions.disableTitle' : 'mapping.actions.enableTitle'),
      content: t(
        active ? 'mapping.actions.disableDescription' : 'mapping.actions.enableDescription',
      ),
      okText: t(active ? 'mapping.actions.disableRule' : 'mapping.actions.enableRule'),
      okButtonProps: { danger: active },
      onOk: () =>
        updateMappingRule(page.ruleType, rule.id, {
          status: active ? 'INACTIVE' : 'ACTIVE',
        })
          .then(() =>
            queryClient.invalidateQueries({ queryKey: mappingKeys.rulesRoot(page.ruleType) }),
          )
          .then(() =>
            toast(
              'success',
              t(active ? 'mapping.feedback.ruleDisabled' : 'mapping.feedback.ruleEnabled'),
            ),
          )
          .catch(notifyError),
    })
  }

  return (
    <Flex vertical gap={16} style={{ minHeight: 0 }}>
      <PageHeader title={t(page.titleKey)} description={t(page.descriptionKey)} />
      {rules.error || originPreview.error ? (
        <FeedbackAlert type="error" title={t('mapping.feedback.loadFailed')} />
      ) : null}
      <Card
        size="small"
        title={
          <Space size={8}>
            <span>{t('mapping.sections.rules')}</span>
            {rules.data ? (
              <Badge
                count={rules.data.pagination.total}
                showZero
                color="blue"
                style={{ fontSize: 11 }}
              />
            ) : null}
          </Space>
        }
      >
        <RuleInventoryPanel
          canWrite={canWrite}
          shopFilter={
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder={t('mapping.context.allShops')}
              loading={shops.isLoading}
              value={shopId}
              options={(shops.data?.items ?? []).map((shop) => ({
                value: shop.id,
                label: shop.name || shop.code || t('mapping.states.unavailable'),
              }))}
              onChange={setShopId}
            />
          }
          loading={rules.isLoading}
          references={referenceLabels}
          rules={rules.data?.items ?? []}
          search={search}
          status={status}
          type={page.ruleType}
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
          onToggleStatus={toggleRuleStatus}
        />
      </Card>
      {/* Rule Editor — Drawer */}
      <Drawer
        destroyOnHidden
        open={editorOpen}
        width={720}
        title={
          <Space size={8}>
            <span>
              {creating ? t('mapping.actions.createRule') : t('mapping.sections.ruleEditor')}
            </span>
            {selectedRule?.status ? (
              <Tag color={selectedRule.status === 'ACTIVE' ? 'green' : 'default'}>
                {selectedRule.status}
              </Tag>
            ) : null}
          </Space>
        }
        onClose={() => {
          setCreating(false)
          setSelectedRule(undefined)
        }}
      >
        {orderItemId ? (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 12px',
              background: '#f0f9ff',
              borderRadius: 8,
              border: '1px solid #bae0ff',
            }}
          >
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Context order item
            </Typography.Text>
            <br />
            <Typography.Text strong>
              {originPreview.data?.skuMapping?.configCode || orderItemId}
            </Typography.Text>
          </div>
        ) : null}
        <RuleEditorPanel
          key={`${page.ruleType}:${selectedRule?.id ?? contextConfigCode ?? 'new'}:${contextRule?.productTypeGroupId ?? ''}`}
          canWrite={canWrite}
          rule={selectedRule ?? contextRule}
          type={page.ruleType}
          saving={saveRule.isPending}
          productTypeGroups={catalogOptions.data?.productTypeGroups}
          internalTemplates={catalogOptions.data?.internalTemplates}
          vendors={vendors.data?.items}
          initialSampleSku={originPreview.data?.skuNormalization?.originalSku || undefined}
          onDirtyChange={() => undefined}
          onPreview={(rule, samples) =>
            previewMappingRule({
              ruleType: page.ruleType,
              rule,
              samples,
            })
          }
          onConflicts={(rule) =>
            findMappingRuleConflicts({ ruleId: selectedRule?.id, ruleType: page.ruleType, rule })
          }
          onSave={(rule) => saveRule.mutateAsync(rule).then(() => undefined)}
        />
      </Drawer>
      <RuleHistoryModal
        id={historyRule?.id}
        open={Boolean(historyRule)}
        type={page.ruleType}
        onClose={() => setHistoryRule(undefined)}
      />
    </Flex>
  )
}

export default MappingRulePage
