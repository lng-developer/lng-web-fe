import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Card, Drawer, Flex, Modal, Select, Space, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getListingOptions } from '@/features/portal/catalog/api/catalogApi'
import { listVendors } from '@/features/portal/vendors/api/vendorApi'
import { normalizeApiError } from '@/shared/api'
import { FeedbackAlert, StatusTag, useFeedbackToast } from '@/shared/ui'

import {
  createMappingRule,
  findMappingRuleConflicts,
  type MappingRule,
  type MappingRuleInput,
  previewMappingRule,
  recheckOrderItem,
  updateMappingRule,
} from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'
import { RuleEditorPanel } from '../components/RuleEditorPanel'
import { RuleHistoryModal } from '../components/RuleHistoryModal'
import { RuleInventoryPanel } from '../components/RuleInventoryPanel'
import { useAuthorableShopsQuery, useMappingRulesQuery, useOrderItemPreviewQuery } from '../hooks'
import {
  getMappingRulePage,
  type MappingRulePageKey,
  safeMappingReturnTo,
} from '../model/mappingPageConfig'
import styles from './MappingWorkspacePage.module.scss'

const RULE_PAGE_SIZE = 20

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
  const [rulePage, setRulePage] = useState(1)
  const [rulePageSize, setRulePageSize] = useState(RULE_PAGE_SIZE)
  const [selectedRule, setSelectedRule] = useState<MappingRule>()
  const [creating, setCreating] = useState(Boolean(orderItemId))
  const [historyRule, setHistoryRule] = useState<MappingRule>()
  const editorOpen = creating || Boolean(selectedRule)

  const deferredSearch = useDeferredValue(search)
  const ruleParams = useMemo(
    () => ({ shopId, q: deferredSearch, status, page: rulePage, limit: rulePageSize }),
    [deferredSearch, rulePage, rulePageSize, shopId, status],
  )
  const rules = useMappingRulesQuery(page.ruleType, ruleParams)
  const shops = useAuthorableShopsQuery({ enabled: canWrite })
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
  const originPreview = useOrderItemPreviewQuery(orderItemId)
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

  const shopOptions = useMemo(
    () =>
      (shops.data?.items ?? []).map((shop) => ({
        value: shop.id,
        label: shop.name || shop.code || t('mapping.states.unavailable'),
      })),
    [shops.data?.items, t],
  )

  const handleCreateRule = useCallback(() => {
    setSelectedRule(undefined)
    setCreating(true)
  }, [])

  const handleSelectRule = useCallback((rule: MappingRule) => {
    setSelectedRule(rule)
    setCreating(false)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setCreating(false)
    setSelectedRule(undefined)
  }, [])

  const toggleRuleStatus = useCallback(
    (rule: MappingRule) => {
      const active = rule.status === 'ACTIVE'
      Modal.confirm({
        centered: true,
        title: active ? t('mapping.actions.disableTitle') : t('mapping.actions.enableTitle'),
        content: active
          ? t('mapping.actions.disableDescription')
          : t('mapping.actions.enableDescription'),
        okText: active ? t('mapping.actions.disableRule') : t('mapping.actions.enableRule'),
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
                active ? t('mapping.feedback.ruleDisabled') : t('mapping.feedback.ruleEnabled'),
              ),
            )
            .catch(notifyError),
      })
    },
    [notifyError, page.ruleType, queryClient, t, toast],
  )

  return (
    <Flex vertical gap={16} className={styles.rulePage}>
      {rules.error || originPreview.error ? (
        <FeedbackAlert type="error" title={t('mapping.feedback.loadFailed')} />
      ) : null}
      <Card
        size="small"
        className={styles.ruleCard}
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
              options={shopOptions}
              onChange={(value) => {
                setRulePage(1)
                setShopId(value)
              }}
            />
          }
          loading={rules.isLoading}
          references={referenceLabels}
          rules={rules.data?.items ?? []}
          pagination={{
            current: rulePage,
            pageSize: rulePageSize,
            total: rules.data?.pagination.total ?? 0,
            onChange: (nextPage, nextPageSize) => {
              setRulePage(nextPage)
              setRulePageSize(nextPageSize)
            },
          }}
          search={search}
          status={status}
          type={page.ruleType}
          onCreate={handleCreateRule}
          onHistory={setHistoryRule}
          onSearchChange={(value) => {
            setRulePage(1)
            setSearch(value)
          }}
          onSelect={handleSelectRule}
          onStatusChange={(value) => {
            setRulePage(1)
            setStatus(value)
          }}
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
              <StatusTag status={selectedRule.status === 'ACTIVE' ? 'operational' : 'draft'}>
                {selectedRule.status}
              </StatusTag>
            ) : null}
          </Space>
        }
        onClose={handleCloseDrawer}
      >
        {orderItemId ? (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 12px',
              background: 'var(--ant-color-info-bg)',
              borderRadius: 8,
              border: '1px solid var(--ant-color-info-border)',
            }}
          >
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('mapping.context.contextOrderItem')}
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
          initialSampleSku={originPreview.data?.skuNormalization?.originalSku ?? undefined}
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
