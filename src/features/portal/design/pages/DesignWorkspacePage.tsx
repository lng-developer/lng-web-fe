import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Modal, Select, Space, Tag, Tooltip, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  DateRangePicker,
  type DateRangeValue,
  EmployeeAvatar,
  FormattedDateTime,
  MetricCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  assignDesignTask,
  bulkAssignDesignTasks,
  type DesignTask,
  type DesignTaskPriority,
  getDesignSummary,
  getDesignWorkload,
  listDesignAssignees,
  listDesignTasks,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'
import styles from './DesignWorkspacePage.module.scss'

const { Text } = Typography

const TASK_TYPES = ['PSD_TEMPLATE', 'MOCKUP', 'PNG_ASSET', 'IDEA', 'CLONE'] as const

const STATUSES = [
  'NEW',
  'REQUESTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const

function getStatusTone(
  status: string,
): 'pending' | 'ready' | 'operational' | 'warning' | 'approved' | 'cancelled' {
  switch (status) {
    case 'NEW':
    case 'REQUESTED':
      return 'pending'
    case 'ASSIGNED':
      return 'ready'
    case 'IN_PROGRESS':
      return 'warning'
    case 'SUBMITTED':
      return 'operational'
    case 'APPROVED':
      return 'approved'
    case 'REJECTED':
    case 'CANCELLED':
      return 'cancelled'
    default:
      return 'pending'
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'URGENT':
      return 'red'
    case 'HIGH':
      return 'orange'
    case 'NORMAL':
      return 'blue'
    case 'LOW':
      return 'default'
    default:
      return 'default'
  }
}

function formatEnumLabel(val: string): string {
  return val
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function DesignWorkspacePage({
  account: accountProp,
}: {
  readonly account?: CurrentAccount
}) {
  const { t } = useTranslation()
  const loaded = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const account = accountProp ?? loaded
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const permissions = useMemo(
    () =>
      new Set([
        ...(account?.permissions ?? []),
        ...(account?.scopes ?? []).flatMap(({ permissions: perms }) => perms),
      ]),
    [account?.permissions, account?.scopes],
  )
  const canWrite = permissions.has('DESIGN:WRITE')
  const canReview = permissions.has('DESIGN:REVIEW') || permissions.has('DESIGN:WRITE')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [taskType, setTaskType] = useState<string>()
  const [status, setStatus] = useState<string>()
  const [priority, setPriority] = useState<DesignTaskPriority>()
  const [designerId, setDesignerId] = useState<string>()
  const [dates, setDates] = useState<DateRangeValue>({})

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [singleAssignTask, setSingleAssignTask] = useState<DesignTask | null>(null)
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>()

  const queryParams = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: deferredSearch || undefined,
      taskType: taskType || undefined,
      status: status || undefined,
      priority: priority || undefined,
      assignedDesignerId: designerId || undefined,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
    }),
    [page, deferredSearch, taskType, status, priority, designerId, dates.dateFrom, dates.dateTo],
  )

  const summaryParams = useMemo(
    () => ({
      taskType: taskType || undefined,
    }),
    [taskType],
  )

  const tasksQuery = useQuery({
    queryKey: designKeys.list(queryParams),
    queryFn: () => listDesignTasks(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })

  const summaryQuery = useQuery({
    queryKey: designKeys.summary(summaryParams),
    queryFn: () => getDesignSummary(summaryParams),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  })

  const workloadQuery = useQuery({
    queryKey: designKeys.workload(summaryParams),
    queryFn: () => getDesignWorkload(summaryParams),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  })

  const assigneesQuery = useQuery({
    queryKey: designKeys.assignees(),
    queryFn: listDesignAssignees,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: designKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: designKeys.summaries() })
    void queryClient.invalidateQueries({ queryKey: designKeys.workloads() })
  }, [queryClient])

  const assignMutation = useMutation({
    mutationFn: ({ taskId, assigneeId }: { taskId: string; assigneeId: string }) =>
      assignDesignTask(taskId, assigneeId),
    onSuccess: () => {
      toast(
        'success',
        t('portal.design.workspace.assignSuccess', { defaultValue: 'Designer assigned' }),
      )
      setSingleAssignTask(null)
      setSelectedDesignerId(undefined)
      invalidate()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : t('portal.design.workspace.assignFailed', { defaultValue: 'Assign failed' })
      toast('error', msg)
    },
  })

  const bulkAssignMutation = useMutation({
    mutationFn: ({ taskIds, designerId: dId }: { taskIds: string[]; designerId: string }) =>
      bulkAssignDesignTasks(taskIds, dId),
    onSuccess: () => {
      toast(
        'success',
        t('portal.design.workspace.bulkAssignSuccess', { defaultValue: 'Designers assigned' }),
      )
      setSelectedRowKeys([])
      setSelectedDesignerId(undefined)
      setBulkAssignOpen(false)
      invalidate()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : t('portal.design.workspace.assignFailed', { defaultValue: 'Assign failed' })
      toast('error', msg)
    },
  })

  const columns = useMemo<TableColumnsType<DesignTask>>(
    () => [
      {
        title: t('portal.design.taskId', { defaultValue: 'Task ID' }),
        key: 'id',
        width: 140,
        render: (_, record) => (
          <Text copyable={{ text: record.id }} style={{ fontSize: 12 }}>
            {record.id.slice(-8).toUpperCase()}
          </Text>
        ),
      },
      {
        title: t('portal.design.taskType', { defaultValue: 'Type' }),
        key: 'taskType',
        width: 120,
        render: (_, record) => (
          <Tag color="purple">
            {t(`portal.design.taskTypes.${record.taskType}`, {
              defaultValue: formatEnumLabel(record.taskType),
            })}
          </Tag>
        ),
      },
      {
        title: t('portal.design.status', { defaultValue: 'Status' }),
        key: 'status',
        width: 130,
        render: (_, record) => (
          <StatusTag status={getStatusTone(record.status)}>
            {t(`portal.design.statuses.${record.status}`, {
              defaultValue: formatEnumLabel(record.status),
            })}
          </StatusTag>
        ),
      },
      {
        title: t('common.priority', { defaultValue: 'Priority' }),
        key: 'priority',
        width: 100,
        render: (_, record) => {
          const p = record.priority ?? 'NORMAL'
          return (
            <Tag color={getPriorityColor(p)}>
              {t(`portal.design.priorities.${p}`, {
                defaultValue: formatEnumLabel(p),
              })}
            </Tag>
          )
        },
      },
      {
        title: t('portal.design.title', { defaultValue: 'Title / Brief' }),
        key: 'title',
        width: 220,
        render: (_, record) => (
          <Text ellipsis={{ tooltip: record.title || record.brief || '-' }}>
            {record.title || record.brief || '-'}
          </Text>
        ),
      },
      {
        title: t('portal.design.assignedTo', { defaultValue: 'Designer' }),
        key: 'assignedDesigner',
        width: 180,
        render: (_, record) =>
          record.assignedDesigner ? (
            <Space size={6}>
              <EmployeeAvatar
                name={record.assignedDesigner.fullName || '?'}
                avatarUrl={record.assignedDesigner.avatarUrl}
                size="small"
              />
              <Text>{record.assignedDesigner.fullName || '-'}</Text>
            </Space>
          ) : (
            <Text type="secondary">
              {t('portal.design.unassigned', { defaultValue: 'Unassigned' })}
            </Text>
          ),
      },
      {
        title: t('portal.design.shop', { defaultValue: 'Shop' }),
        key: 'shop',
        width: 130,
        render: (_, record) => <Text>{record.shop?.name || '-'}</Text>,
      },
      {
        title: t('common.createdAt', { defaultValue: 'Created' }),
        key: 'createdAt',
        width: 155,
        render: (_, record) => <FormattedDateTime value={record.createdAt} />,
      },
      ...(canWrite || canReview
        ? [
            {
              title: t('common.actions', { defaultValue: 'Actions' }),
              key: 'actions',
              width: 90,
              render: (_: unknown, record: DesignTask) => (
                <Space size={4}>
                  {(canWrite || canReview) && !record.assignedDesigner ? (
                    <Tooltip
                      title={t('portal.design.workspace.assignDesigner', {
                        defaultValue: 'Assign designer',
                      })}
                    >
                      <Button
                        size="small"
                        icon={<UserAddOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSingleAssignTask(record)
                          setSelectedDesignerId(undefined)
                        }}
                      />
                    </Tooltip>
                  ) : null}
                </Space>
              ),
            },
          ]
        : []),
    ],
    [canReview, canWrite, t],
  )

  const tasks = tasksQuery.data?.items ?? []
  const total = tasksQuery.data?.pagination?.total ?? 0
  const summary = summaryQuery.data
  const workload = workloadQuery.data

  const assigneeOptions = useMemo(
    () =>
      (assigneesQuery.data ?? []).map((a) => ({
        value: a.id,
        label: a.fullName || a.name || a.id,
      })),
    [assigneesQuery.data],
  )

  return (
    <section className={styles.page}>
      {/* Metric Cards */}
      <div className={styles.metrics}>
        <MetricCard
          icon={<AppstoreOutlined />}
          variant="neutral"
          label={t('portal.design.workspace.totalTasks', { defaultValue: 'Total tasks' })}
          value={summary?.total ?? 0}
          loading={summaryQuery.isLoading}
        />
        <MetricCard
          icon={<UserAddOutlined />}
          variant="warning"
          label={t('portal.design.workspace.unassigned', { defaultValue: 'Unassigned' })}
          value={workload?.totals?.unassignedCount ?? summary?.unassigned ?? 0}
          loading={workloadQuery.isLoading || summaryQuery.isLoading}
        />
        <MetricCard
          icon={<SyncOutlined />}
          variant="info"
          label={t('portal.design.workspace.inProgress', { defaultValue: 'In progress' })}
          value={summary?.byStatus?.IN_PROGRESS ?? 0}
          loading={summaryQuery.isLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="primary"
          label={t('portal.design.workspace.pendingReview', { defaultValue: 'Pending review' })}
          value={summary?.byStatus?.SUBMITTED ?? 0}
          loading={summaryQuery.isLoading}
        />
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <Input
          allowClear
          className={styles.search}
          placeholder={t('common.search', { defaultValue: 'Search...' })}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <Select
          allowClear
          className={styles.filter}
          placeholder={t('portal.design.allTaskTypes', { defaultValue: 'All types' })}
          value={taskType}
          onChange={(v) => {
            setTaskType(v)
            setPage(1)
          }}
          options={TASK_TYPES.map((v) => ({
            value: v,
            label: t(`portal.design.taskTypes.${v}`, { defaultValue: formatEnumLabel(v) }),
          }))}
        />
        <Select
          allowClear
          className={styles.filter}
          placeholder={t('common.status', { defaultValue: 'Status' })}
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
          options={STATUSES.map((v) => ({
            value: v,
            label: t(`portal.design.statuses.${v}`, { defaultValue: formatEnumLabel(v) }),
          }))}
        />
        <Select
          allowClear
          className={styles.filter}
          placeholder={t('common.priority', { defaultValue: 'Priority' })}
          value={priority}
          onChange={(v) => {
            setPriority(v)
            setPage(1)
          }}
          options={PRIORITIES.map((v) => ({
            value: v,
            label: t(`portal.design.priorities.${v}`, { defaultValue: formatEnumLabel(v) }),
          }))}
        />
        <Select
          allowClear
          className={styles.designerFilter}
          placeholder={t('portal.design.allDesigners', { defaultValue: 'All designers' })}
          value={designerId}
          onChange={(v) => {
            setDesignerId(v)
            setPage(1)
          }}
          loading={assigneesQuery.isLoading}
          options={assigneeOptions}
          showSearch
          optionFilterProp="label"
        />
        <DateRangePicker
          allowClear
          value={dates}
          onChange={(val) => {
            setDates(val)
            setPage(1)
          }}
        />
        <Tooltip title={t('common.refresh', { defaultValue: 'Refresh' })}>
          <Button icon={<ReloadOutlined />} onClick={invalidate} loading={tasksQuery.isFetching} />
        </Tooltip>
      </div>

      {/* Bulk actions bar */}
      {selectedRowKeys.length > 0 && (canWrite || canReview) ? (
        <div className={styles.bulkBar}>
          <Text type="secondary">
            {t('portal.design.workspace.selected', {
              count: selectedRowKeys.length,
              defaultValue: '{{count}} selected',
            })}
          </Text>
          <Button
            size="small"
            icon={<UserAddOutlined />}
            onClick={() => {
              setSelectedDesignerId(undefined)
              setBulkAssignOpen(true)
            }}
          >
            {t('portal.design.workspace.bulkAssign', { defaultValue: 'Bulk assign' })}
          </Button>
          <Button size="small" onClick={() => setSelectedRowKeys([])}>
            {t('portal.design.workspace.clearSelection', { defaultValue: 'Clear' })}
          </Button>
        </div>
      ) : null}

      {/* Table */}
      <div className={styles.tableArea}>
        <CoreDataTable
          rowKey="id"
          columns={columns}
          dataSource={tasks}
          loading={tasksQuery.isLoading}
          rowSelection={
            canWrite || canReview
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys as string[]),
                }
              : undefined
          }
          pagination={{
            current: page,
            pageSize: DEFAULT_PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: (p) => setPage(p),
          }}
          scroll={{ x: 1300 }}
        />
      </div>

      {/* Single assign modal */}
      <Modal
        open={Boolean(singleAssignTask)}
        title={t('portal.design.workspace.assignDesigner', { defaultValue: 'Assign designer' })}
        okText={t('portal.design.workspace.assign', { defaultValue: 'Assign' })}
        cancelText={t('portal.design.workspace.cancel', { defaultValue: 'Cancel' })}
        confirmLoading={assignMutation.isPending}
        onOk={() => {
          if (!singleAssignTask || !selectedDesignerId) return
          assignMutation.mutate({ taskId: singleAssignTask.id, assigneeId: selectedDesignerId })
        }}
        onCancel={() => {
          setSingleAssignTask(null)
          setSelectedDesignerId(undefined)
        }}
        okButtonProps={{ disabled: !selectedDesignerId }}
      >
        <Select
          style={{ width: '100%' }}
          placeholder={t('portal.design.allDesigners', { defaultValue: 'Select designer' })}
          value={selectedDesignerId}
          onChange={setSelectedDesignerId}
          loading={assigneesQuery.isLoading}
          options={assigneeOptions}
          showSearch
          optionFilterProp="label"
        />
      </Modal>

      {/* Bulk assign modal */}
      <Modal
        open={bulkAssignOpen}
        title={t('portal.design.workspace.bulkAssign', { defaultValue: 'Bulk assign' })}
        okText={t('portal.design.workspace.assign', { defaultValue: 'Assign' })}
        cancelText={t('portal.design.workspace.cancel', { defaultValue: 'Cancel' })}
        confirmLoading={bulkAssignMutation.isPending}
        onOk={() => {
          if (!selectedDesignerId) return
          bulkAssignMutation.mutate({ taskIds: selectedRowKeys, designerId: selectedDesignerId })
        }}
        onCancel={() => {
          setBulkAssignOpen(false)
          setSelectedDesignerId(undefined)
        }}
        okButtonProps={{ disabled: !selectedDesignerId }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {t('portal.design.workspace.bulkAssignDesc', {
            count: selectedRowKeys.length,
            defaultValue: 'Assign designer for {{count}} task(s)',
          })}
        </Text>
        <Select
          style={{ width: '100%' }}
          placeholder={t('portal.design.allDesigners', { defaultValue: 'Select designer' })}
          value={selectedDesignerId}
          onChange={setSelectedDesignerId}
          loading={assigneesQuery.isLoading}
          options={assigneeOptions}
          showSearch
          optionFilterProp="label"
        />
      </Modal>
    </section>
  )
}
