import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { CheckCircleOutlined, ReloadOutlined, UserAddOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Modal, Select, Space, Tag, Tooltip, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ArtworkInspector } from '@/features/portal/production/pages/ArtworkInspector'
import { ProductionWorkbenchExpandedRow } from '@/features/portal/production/pages/ProductionWorkbenchExpandedRow'
import {
  assignProductionTask,
  claimProductionTask,
  type FileCheck,
  listProductionTasks,
  listScaleAssignees,
  type ProductionParams,
  type ProductionTask,
  submitScaleForQc,
  summarizeProductionQueueCounts,
  summarizeProductionTasks,
  updateDesignNote,
  uploadScaledOutput,
} from '@/features/portal/production/api/productionApi'
import { productionKeys } from '@/features/portal/production/api/productionKeys'
import { canUseScopedPermission, hasScopedPermission } from '@/shared/auth/permissions'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { listShops } from '@/features/portal/shops/api/shopApi'
import {
  CopyableOrderId,
  DateRangePicker,
  type DateRangeValue,
  EmployeeAvatar,
  FormattedDateTime,
  StatusTag,
  UiTabLabel,
  UiTabs,
  useFeedbackToast,
} from '@/shared/ui'

import { ASIN_TYPE_OPTIONS } from '../api/designApi'
import styles from './PngTasksPage.module.scss'

const { Text } = Typography

const STATUS_TABS = [
  { key: 'all', title: 'All', status: undefined, unassigned: false },
  { key: 'unassigned', title: 'Pending Assignment', status: undefined, unassigned: true },
  { key: 'need_scale', title: 'Need Scale', status: 'NEED_SCALE' as const, unassigned: false },
  { key: 'qc_pending', title: 'Pending QC', status: 'QC_PENDING' as const, unassigned: false },
  {
    key: 'completed',
    title: 'Completed',
    status: 'READY_TO_SEND_VENDOR' as const,
    unassigned: false,
  },
  { key: 'qc_rejected', title: 'QC Rejected', status: 'QC_REJECTED' as const, unassigned: false },
] as const

function getScaleStatusTone(
  status?: string,
): 'operational' | 'processing' | 'pending' | 'critical' | 'ready' {
  if (!status) return 'pending'
  if (['PASSED', 'SENT_TO_VENDOR'].includes(status)) return 'operational'
  if (['READY_TO_SEND_VENDOR'].includes(status)) return 'ready'
  if (['QC_PENDING', 'PENDING', 'NEED_SCALE'].includes(status)) return 'processing'
  if (['QC_REJECTED', 'REJECTED', 'BLOCKED'].includes(status)) return 'critical'
  return 'pending'
}

export function PngTasksPage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const allowed = useMemo(
    () =>
      new Set(
        account
          ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
          : [],
      ),
    [account],
  )
  const currentAccountId = account?.account?.id

  const hasTeamDesignReview = hasScopedPermission(account, 'DESIGN:REVIEW', 'team')
  const hasScopedScaleAssign =
    hasTeamDesignReview ||
    hasScopedPermission(account, 'DESIGN:REVIEW', 'shop') ||
    hasScopedPermission(account, 'PRODUCTION:WRITE', 'team') ||
    hasScopedPermission(account, 'PRODUCTION:WRITE', 'shop')
  const canAssignScale = allowed.has('PRODUCTION:WRITE') || hasScopedScaleAssign

  const canWriteProductionTask = useCallback(
    (task: ProductionTask) =>
      canUseScopedPermission(account, 'PRODUCTION:WRITE', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }),
    [account],
  )

  const canScaleTask = useCallback(
    (task: ProductionTask) =>
      canWriteProductionTask(task) ||
      (Boolean(currentAccountId) && task.assignedDesignUserId === currentAccountId),
    [canWriteProductionTask, currentAccountId],
  )

  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const [searchParams] = useSearchParams()
  const rawSalesChannel = searchParams.get('salesChannelCode')?.toLowerCase()
  const salesChannelCode: 'AMAZON' | 'ETSY' | undefined =
    rawSalesChannel === 'amazon' ? 'AMAZON' : rawSalesChannel === 'etsy' ? 'ETSY' : undefined

  const [page, setPage] = useState(1)
  const [prevChannel, setPrevChannel] = useState(salesChannelCode)
  if (prevChannel !== salesChannelCode) {
    setPrevChannel(salesChannelCode)
    setPage(1)
  }

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [activeTabKey, setActiveTabKey] = useState<string>('all')
  const [selectedShopId, setSelectedShopId] = useState<string>()
  const [selectedAsinType, setSelectedAsinType] = useState<string>()
  const [dates, setDates] = useState<DateRangeValue>({})

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null)
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>()

  const [inspect, setInspect] = useState<{
    check: FileCheck
    listingReferenceUrl?: string | null
    readonly?: boolean
  }>()
  const [uploadingFileCheckIds, setUploadingFileCheckIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const activeTabConfig = useMemo(
    () => STATUS_TABS.find((tab) => tab.key === activeTabKey) || STATUS_TABS[0],
    [activeTabKey],
  )

  const queryParams: ProductionParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      view: 'SCALE',
      psdReadyOnly: true,
      search: deferredSearch || undefined,
      status: activeTabConfig.status,
      shopId: selectedShopId || undefined,
      salesChannelCode,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
    }),
    [
      page,
      pageSize,
      deferredSearch,
      activeTabConfig.status,
      selectedShopId,
      salesChannelCode,
      dates.dateFrom,
      dates.dateTo,
    ],
  )

  const tasksQuery = useQuery({
    queryKey: productionKeys.list(queryParams),
    queryFn: () => listProductionTasks(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const shopsQuery = useQuery({
    queryKey: ['shops', 'active'],
    queryFn: () => listShops({ page: 1, limit: 100, status: 'ACTIVE' }),
    staleTime: 5 * 60 * 1000,
  })

  const summaryQuery = useQuery({
    queryKey: productionKeys.summary({ view: 'SCALE', psdReadyOnly: true, salesChannelCode }),
    queryFn: () =>
      summarizeProductionTasks({ view: 'SCALE', psdReadyOnly: true, salesChannelCode }),
    staleTime: 20_000,
  })

  const queueCountsQuery = useQuery({
    queryKey: productionKeys.queueSummary({}),
    queryFn: () => summarizeProductionQueueCounts({}),
    staleTime: 20_000,
  })

  const scaleAssigneesQuery = useQuery({
    queryKey: productionKeys.scaleAssignees(),
    queryFn: () => listScaleAssignees(),
    staleTime: 60_000,
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: productionKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: productionKeys.summaries() })
    void queryClient.invalidateQueries({ queryKey: productionKeys.queueSummaries() })
  }, [queryClient])

  const assignMutation = useMutation({
    mutationFn: ({ taskId, designerId }: { taskId: string; designerId: string }) =>
      assignProductionTask(taskId, designerId),
    onSuccess: () => {
      toast('success', t('portal.production.updated', { defaultValue: 'Assigned successfully' }))
      setAssignModalOpen(false)
      setSelectedDesignerId(undefined)
      setTargetTaskId(null)
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Assign failed'
      toast('error', msg)
    },
  })

  const claimMutation = useMutation({
    mutationFn: (taskId: string) => claimProductionTask(taskId),
    onSuccess: () => {
      toast('success', t('portal.production.updated', { defaultValue: 'Task claimed' }))
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Claim failed'
      toast('error', msg)
    },
  })

  const submitScaleMutation = useMutation({
    mutationFn: (taskId: string) => submitScaleForQc(taskId),
    onSuccess: () => {
      toast('success', t('portal.production.updated', { defaultValue: 'Submitted for QC' }))
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Submit failed'
      toast('error', msg)
    },
  })

  const saveNoteMutation = useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note: string }) =>
      updateDesignNote(taskId, note),
    onSuccess: () => {
      toast('success', t('portal.production.updated', { defaultValue: 'Note saved' }))
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Save failed'
      toast('error', msg)
    },
  })

  const handleUploadScaledOutput = useCallback(
    async (taskId: string, fileCheckId: string, file: File) => {
      setUploadingFileCheckIds((current) => new Set(current).add(fileCheckId))
      try {
        await uploadScaledOutput(taskId, fileCheckId, file)
        invalidate()
        toast('success', t('portal.production.updated', { defaultValue: 'File uploaded' }))
      } catch (error) {
        toast('error', error instanceof Error ? error.message : 'Upload failed')
      } finally {
        setUploadingFileCheckIds((current) => {
          const next = new Set(current)
          next.delete(fileCheckId)
          return next
        })
      }
    },
    [invalidate, t, toast],
  )

  const handleInspectSlot = useCallback(
    (task: ProductionTask, check: FileCheck, readonly = false) => {
      setInspect({ check, listingReferenceUrl: task.productImageUrl, readonly })
    },
    [],
  )

  const counts = useMemo(() => {
    const summaryData = summaryQuery.data || {}
    const items = tasksQuery.data?.items || []
    const unassignedCount = items.filter(
      (item) => !item.assignedDesignUserId && !item.assignedDesigner,
    ).length
    return {
      all: summaryData.total ?? queueCountsQuery.data?.scaleQueue ?? tasksQuery.data?.total ?? 0,
      unassigned: unassignedCount,
      need_scale: summaryData.needScale ?? 0,
      qc_pending: summaryData.qcPending ?? 0,
      completed:
        (summaryData.readyToSendVendor ?? summaryData.ready ?? 0) + (summaryData.sentToVendor ?? 0),
      qc_rejected: summaryData.qcRejected ?? 0,
    }
  }, [summaryQuery.data, queueCountsQuery.data, tasksQuery.data])

  const displayedTasks = useMemo(() => {
    let items = tasksQuery.data?.items || []
    if (activeTabConfig.unassigned) {
      items = items.filter((item) => !item.assignedDesignUserId && !item.assignedDesigner)
    }
    if (selectedShopId) {
      items = items.filter((item) => (item.shopId || item.shop?.id) === selectedShopId)
    }
    if (salesChannelCode) {
      items = items.filter((item) => {
        const code = item.orderItem?.salesChannelCode?.toUpperCase()
        return !code || code === salesChannelCode
      })
    }
    if (selectedAsinType) {
      const target = selectedAsinType.toLowerCase()
      items = items.filter((item) => {
        const type =
          item.asinType ||
          item.asin_type ||
          (item.listing as { asinType?: string; asin_type?: string } | undefined)?.asinType ||
          (item.listing as { asinType?: string; asin_type?: string } | undefined)?.asin_type
        if (type) {
          return type.toLowerCase() === target
        }
        if (selectedAsinType === 'Custom Image') {
          return item.fileChecks?.some((check) => check.sourceType === 'CUSTOMER_IMAGE')
        }
        return false
      })
    }
    return items
  }, [
    tasksQuery.data?.items,
    activeTabConfig.unassigned,
    selectedShopId,
    salesChannelCode,
    selectedAsinType,
  ])

  const columns = useMemo<TableColumnsType<ProductionTask>>(() => {
    const baseColumns: TableColumnsType<ProductionTask> = [
      {
        title: t('common.orderId', { defaultValue: 'Order ID' }),
        key: 'orderId',
        width: 170,
        render: (_, record) => {
          const orderId = record.orderItem?.externalOrderId || record.order?.id
          return <CopyableOrderId value={orderId} />
        },
      },
      {
        title: t('common.createdAt', { defaultValue: 'Order Date' }),
        key: 'date',
        width: 140,
        render: (_, record) => (
          <FormattedDateTime value={record.readyAt || record.createdAt || record.updatedAt} />
        ),
      },
      {
        title: t('common.status', { defaultValue: 'Scale Status' }),
        key: 'status',
        width: 140,
        render: (_, record) => (
          <StatusTag status={getScaleStatusTone(record.status)}>
            {t(`portal.production.statuses.${record.status}`, { defaultValue: record.status })}
          </StatusTag>
        ),
      },
      {
        title: t('portal.production.assignedTo', { defaultValue: 'Scale By' }),
        key: 'assigned',
        width: 160,
        render: (_, record) =>
          record.assignedDesigner ? (
            <Space size={6}>
              <EmployeeAvatar name={record.assignedDesigner.fullName || 'Designer'} size="small" />
              <Text>
                {record.assignedDesigner.fullName || record.assignedDesigner.employeeCode}
              </Text>
            </Space>
          ) : (
            <Text type="secondary">
              {t('portal.production.unassigned', { defaultValue: 'Unassigned' })}
            </Text>
          ),
      },
      {
        title: t('portal.production.columns.shop', { defaultValue: 'Shop' }),
        key: 'shop',
        width: 140,
        render: (_, record) => record.shop?.name || record.shopName || '-',
      },
      {
        title: t('portal.design.asinType', { defaultValue: 'ASIN Type' }),
        key: 'asinType',
        width: 130,
        align: 'center',
        render: (_, record) => {
          const asinType =
            record.asinType ||
            record.asin_type ||
            (record.listing as { asinType?: string; asin_type?: string } | undefined)?.asinType ||
            (record.listing as { asinType?: string; asin_type?: string } | undefined)?.asin_type ||
            (record.fileChecks?.some((check) => check.sourceType === 'CUSTOMER_IMAGE')
              ? 'Custom Image'
              : null)
          return asinType ? <Tag color="magenta">{asinType}</Tag> : '-'
        },
      },
      {
        title: t('common.channel', { defaultValue: 'Channel' }),
        key: 'channel',
        width: 100,
        align: 'center',
        render: (_, record) => {
          const channel = record.orderItem?.salesChannelCode
          return channel ? (
            <Tag color={channel === 'AMAZON' ? 'orange' : 'volcano'}>{channel}</Tag>
          ) : (
            '-'
          )
        },
      },
      {
        title: t('portal.production.psdStatus', { defaultValue: 'PSD Status' }),
        key: 'psdStatus',
        width: 120,
        align: 'center',
        render: (_, record) => {
          const hasInput = (record.qcPreviewFileChecks || record.fileChecks || []).some(
            (check) => check.sourceType === 'PSD_TEMPLATE' && check.inputAssetDownloadUrl,
          )
          return (
            <StatusTag status={hasInput ? 'operational' : 'pending'}>
              {hasInput
                ? t('portal.production.psdReady', { defaultValue: 'Ready' })
                : t('portal.production.psdMissing', { defaultValue: 'Missing' })}
            </StatusTag>
          )
        },
      },
      {
        title: t('common.actions', { defaultValue: 'Actions' }),
        key: 'actions',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Space size={4} wrap>
            {canAssignScale ? (
              <Tooltip title="Assign Designer">
                <Button
                  type="text"
                  size="small"
                  icon={<UserAddOutlined />}
                  onClick={() => {
                    setTargetTaskId(record.id)
                    setSelectedDesignerId(record.assignedDesignUserId || undefined)
                    setAssignModalOpen(true)
                  }}
                />
              </Tooltip>
            ) : null}

            {!record.assignedDesignUserId && canScaleTask(record) ? (
              <Button
                type="link"
                size="small"
                loading={claimMutation.isPending}
                onClick={() => claimMutation.mutate(record.id)}
              >
                Claim
              </Button>
            ) : null}

            {record.status === 'NEED_SCALE' && canScaleTask(record) ? (
              <Tooltip title="Submit for QC">
                <Button
                  type="text"
                  size="small"
                  style={{ color: 'var(--ant-color-success)' }}
                  icon={<CheckCircleOutlined />}
                  onClick={() => submitScaleMutation.mutate(record.id)}
                />
              </Tooltip>
            ) : null}
          </Space>
        ),
      },
    ]

    return baseColumns
  }, [canAssignScale, canScaleTask, claimMutation, submitScaleMutation, t])

  return (
    <section className={styles.page}>
      {/* Top row: Status Tabs + Refresh */}
      <div className={styles.topRow}>
        <div className={styles.tabs}>
          <UiTabs
            activeKey={activeTabKey}
            onChange={(key) => {
              setActiveTabKey(key)
              setPage(1)
            }}
            items={STATUS_TABS.map((tab) => ({
              key: tab.key,
              label: (
                <UiTabLabel count={counts[tab.key]} active={activeTabKey === tab.key}>
                  {tab.title}
                </UiTabLabel>
              ),
            }))}
          />
        </div>

        <div className={styles.headerActions}>
          <DateRangePicker
            allowClear
            value={dates}
            onChange={(val) => {
              setDates(val)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Filter bar: Search, Shop, ASIN Type, Refresh */}
      <div className={styles.filterBar}>
        <Input
          placeholder={t('portal.production.search', {
            defaultValue: 'Search orders, SKU, ASIN...',
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          className={styles.search}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t('portal.design.shop', { defaultValue: 'Shop' })}
          value={selectedShopId}
          onChange={(val) => {
            setSelectedShopId(val)
            setPage(1)
          }}
          className={styles.select}
          style={{ minWidth: 150 }}
          options={(shopsQuery.data?.items || []).map((shop) => ({
            label: shop.name,
            value: shop.id,
          }))}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t('portal.design.asinType', { defaultValue: 'ASIN Type' })}
          value={selectedAsinType}
          onChange={(val) => {
            setSelectedAsinType(val)
            setPage(1)
          }}
          className={styles.select}
          style={{ minWidth: 140 }}
          options={ASIN_TYPE_OPTIONS.map((opt) => ({
            label: opt.label,
            value: opt.value,
          }))}
        />
        <Tooltip title={t('common.refresh', { defaultValue: 'Refresh' })}>
          <Button icon={<ReloadOutlined />} onClick={invalidate} loading={tasksQuery.isFetching} />
        </Tooltip>
      </div>

      {/* Table Area with CoreDataTable and expandable row */}
      <div className={styles.tableArea}>
        <CoreDataTable
          rowKey="id"
          columns={columns}
          dataSource={displayedTasks}
          loading={tasksQuery.isLoading}
          pagination={{
            current: page,
            pageSize,
            total: activeTabConfig.unassigned ? displayedTasks.length : tasksQuery.data?.total || 0,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          expandable={{
            expandedRowRender: (record) => (
              <ProductionWorkbenchExpandedRow
                task={record}
                tab="scale"
                canScale={canScaleTask(record)}
                canQc={false}
                decisions={{}}
                submittingQc={false}
                submittingScale={submitScaleMutation.isPending}
                uploadingFileCheckIds={uploadingFileCheckIds}
                onSaveNote={(taskId, note) => saveNoteMutation.mutate({ taskId, note })}
                onSubmitQc={() => {}}
                onSubmitScaleForQc={(taskId) => submitScaleMutation.mutate(taskId)}
                onUploadScaledOutput={handleUploadScaledOutput}
                onInspectSlot={handleInspectSlot}
                onPassSlot={() => {}}
                onManualSlotUploaded={invalidate}
              />
            ),
          }}
          scroll={{ x: 1280 }}
        />
      </div>

      {/* Assign Designer Modal */}
      <Modal
        open={assignModalOpen}
        title="Assign Designer"
        okText="Assign"
        confirmLoading={assignMutation.isPending}
        onCancel={() => {
          setAssignModalOpen(false)
          setTargetTaskId(null)
          setSelectedDesignerId(undefined)
        }}
        onOk={() => {
          if (targetTaskId && selectedDesignerId) {
            assignMutation.mutate({ taskId: targetTaskId, designerId: selectedDesignerId })
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Select Designer
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder="Select a designer"
            value={selectedDesignerId}
            onChange={(val) => setSelectedDesignerId(val)}
            options={(scaleAssigneesQuery.data?.items || []).map((a) => ({
              label: a.fullName || a.employeeCode || a.id,
              value: a.id,
            }))}
          />
        </div>
      </Modal>

      {/* Artwork Inspector Modal */}
      {inspect ? (
        <ArtworkInspector
          check={inspect.check}
          listingReferenceUrl={inspect.listingReferenceUrl}
          readonly={inspect.readonly ?? true}
          onClose={() => setInspect(undefined)}
          onPass={() => setInspect(undefined)}
          onReject={() => setInspect(undefined)}
        />
      ) : null}
    </section>
  )
}

export default PngTasksPage
