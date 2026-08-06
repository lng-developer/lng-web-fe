import { type Key, useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  AuditOutlined,
  EyeOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType, UploadFile } from 'antd'
import {
  Button,
  Descriptions,
  Dropdown,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Tooltip,
  Typography,
  Upload,
} from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getListingOptions, listListings } from '@/features/portal/catalog/api/catalogApi'
import { downloadMediaAsset, uploadMultipartAsset } from '@/shared/media'
import {
  DataTable,
  DetailDrawer,
  FilterBar,
  PageHeader,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  approveDesignTask,
  assignDesignTask,
  bulkAssignDesignTasks,
  cancelDesignTask,
  createDesignTask,
  type CreateDesignTaskInput,
  type DesignTask,
  getDesignSummary,
  getDesignTask,
  getDesignWorkload,
  listDesignAssignees,
  listDesignSubmissions,
  listDesignTasks,
  rejectDesignTask,
  startDesignTask,
  submitDesignTask,
  uploadDesignAsset,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'
import { type CreateDesignTaskDraft, CreateDesignTaskModal } from './CreateDesignTaskModal'
import styles from './DesignWorkbenchPage.module.scss'

const PAGE_SIZE = 20
const STATUSES = [
  'REQUESTED',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]
const TYPES = ['PSD_TEMPLATE', 'MOCKUP', 'PNG_ASSET', 'IDEA', 'CLONE']
const tone = (status: string) =>
  status === 'APPROVED'
    ? 'approved'
    : status === 'REJECTED'
      ? 'rejected'
      : status === 'CANCELLED'
        ? 'cancelled'
        : status === 'SUBMITTED'
          ? 'ready'
          : 'processing'
const priorityTone = (priority: string) =>
  priority === 'URGENT'
    ? 'critical'
    : priority === 'HIGH'
      ? 'warning'
      : priority === 'NORMAL'
        ? 'ready'
        : 'cancelled'
const taskChanged = (task: DesignTask, previousTask: DesignTask) => task !== previousTask

export function DesignWorkbenchPage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const permissions = new Set([
    ...account.permissions,
    ...account.scopes.flatMap(({ permissions }) => permissions),
  ])
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>()
  const [taskType, setTaskType] = useState<string>()
  const [selectedId, setSelectedId] = useState<string>()
  const [activeTask, setActiveTask] = useState<DesignTask>()
  const [assignOpen, setAssignOpen] = useState(false)
  const [designerId, setDesignerId] = useState<string>()
  const [bulkDesignerId, setBulkDesignerId] = useState<string>()
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [submitOpen, setSubmitOpen] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [packageFile, setPackageFile] = useState<File>()
  const [previewFile, setPreviewFile] = useState<File>()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadController, setUploadController] = useState<AbortController>()
  const [note, setNote] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveOpen, setApproveOpen] = useState(false)
  const [approvedAssetId, setApprovedAssetId] = useState<string>()
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const params = { page, limit: PAGE_SIZE, search: search || undefined, status, taskType }
  const tasks = useQuery({
    queryKey: designKeys.list(params),
    queryFn: () => listDesignTasks(params),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const detail = useQuery({
    queryKey: designKeys.detail(selectedId ?? ''),
    queryFn: () => getDesignTask(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  })
  const assignees = useQuery({
    queryKey: designKeys.assignees(),
    queryFn: listDesignAssignees,
    retry: false,
  })
  const dashboardParams = { search: search || undefined, status, taskType }
  const summary = useQuery({
    queryKey: designKeys.summary(dashboardParams),
    queryFn: () => getDesignSummary(dashboardParams),
    retry: false,
  })
  const workload = useQuery({
    queryKey: designKeys.workload(dashboardParams),
    queryFn: () => getDesignWorkload(dashboardParams),
    retry: false,
  })
  const submissions = useQuery({
    queryKey: designKeys.submissions(selectedId ?? ''),
    queryFn: () => listDesignSubmissions(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  })
  const createListings = useQuery({
    queryKey: ['catalog', 'listings', 'design-task-create'],
    queryFn: () => listListings({ page: 1, limit: 100 }),
    enabled: createTaskOpen,
    retry: false,
  })
  const createOptions = useQuery({
    queryKey: ['catalog', 'listing-options', 'design-task-create'],
    queryFn: getListingOptions,
    enabled: createTaskOpen,
    retry: false,
  })
  const displayedTasks = useDeferredValue(tasks.data)
  const refresh = async () => queryClient.invalidateQueries({ queryKey: designKeys.all })
  const action = useMutation({
    mutationFn: async ({ type, task }: { type: string; task: DesignTask }) => {
      if (type === 'assign') return assignDesignTask(task.id, designerId!)
      if (type === 'start') return startDesignTask(task.id)
      if (type === 'approve') return approveDesignTask(task.id, approvedAssetId!)
      if (type === 'reject') return rejectDesignTask(task.id, rejectReason.trim())
      if (type === 'cancel') return cancelDesignTask(task.id, cancelReason.trim())
      if (task.taskType === 'PSD_TEMPLATE') {
        if (!packageFile) throw new Error(t('portal.design.designPackageRequired'))
        const controller = new AbortController()
        setUploadController(controller)
        const packageAsset = await uploadMultipartAsset(packageFile, {
          assetPurpose: 'DESIGN_PACKAGE',
          signal: controller.signal,
          onProgress: setUploadProgress,
        })
        const previewAsset = previewFile ? await uploadDesignAsset(previewFile) : undefined
        return submitDesignTask(
          task.id,
          [packageAsset.id, ...(previewAsset ? [previewAsset.id] : [])],
          note.trim() || undefined,
        )
      }
      const assets = await Promise.all(
        files.map(({ originFileObj }) => uploadDesignAsset(originFileObj as File)),
      )
      return submitDesignTask(
        task.id,
        assets.map(({ id }) => id),
        note.trim() || undefined,
      )
    },
    onSuccess: async () => {
      setAssignOpen(false)
      setSubmitOpen(false)
      setRejectOpen(false)
      setApproveOpen(false)
      setApprovedAssetId(undefined)
      setFiles([])
      setPackageFile(undefined)
      setPreviewFile(undefined)
      setUploadProgress(0)
      setUploadController(undefined)
      setNote('')
      setRejectReason('')
      setCancelReason('')
      setCancelOpen(false)
      setActiveTask(undefined)
      await refresh()
      toast('success', t('portal.design.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not update design task'),
  })
  const createTask = useMutation({
    mutationFn: async (draft: CreateDesignTaskDraft) => {
      const { referenceFiles, ...input } = draft
      const assets = await Promise.all(
        referenceFiles.map(({ originFileObj }) => uploadDesignAsset(originFileObj as File)),
      )
      return createDesignTask({
        ...(input as CreateDesignTaskInput),
        ...(assets.length ? { referenceAssetIds: assets.map(({ id }) => id) } : {}),
      })
    },
    onSuccess: async () => {
      setCreateTaskOpen(false)
      await refresh()
      toast('success', t('portal.design.tasksCreated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not create design task'),
  })
  const bulkAssign = useMutation({
    mutationFn: () => bulkAssignDesignTasks(selectedRowKeys.map(String), bulkDesignerId!),
    onSuccess: async ({ failed }) => {
      setSelectedRowKeys([])
      await refresh()
      toast(
        failed.length ? 'warning' : 'success',
        failed.length
          ? t('portal.design.bulkAssignPartial', { count: failed.length })
          : t('portal.design.bulkAssigned'),
      )
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.design.actionFailed')),
  })
  const canAssign = permissions.has('DESIGN:WRITE')
  const canWork = permissions.has('DESIGN:WRITE') || permissions.has('DESIGN:WORK')
  const canReview = permissions.has('DESIGN:WRITE') || permissions.has('DESIGN:REVIEW')
  const assigneeNames = new Map(
    (assignees.data ?? []).map(({ id, fullName, name }) => [id, fullName ?? name]),
  )
  const openQuickAction = (task: DesignTask, type: 'assign' | 'start' | 'submit' | 'review') => {
    if (type === 'review') setSelectedId(task.id)
    if (type === 'assign') {
      setActiveTask(task)
      setAssignOpen(true)
    }
    if (type === 'start') action.mutate({ type: 'start', task })
    if (type === 'submit') {
      setActiveTask(task)
      setSubmitOpen(true)
    }
  }
  const columns: TableColumnsType<DesignTask> = [
    {
      title: t('portal.design.listing'),
      shouldCellUpdate: taskChanged,
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{row.listing?.sku ?? '-'}</Typography.Text>
          {row.listing?.productTypeName ? (
            <Typography.Text type="secondary">{row.listing.productTypeName}</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: t('portal.design.type'),
      dataIndex: 'taskType',
      width: 130,
      shouldCellUpdate: taskChanged,
    },
    {
      title: t('portal.design.shop'),
      shouldCellUpdate: taskChanged,
      render: (_, row) => row.shop?.name ?? '-',
    },
    {
      title: t('portal.design.designer'),
      shouldCellUpdate: taskChanged,
      render: (_, row) => row.assignedDesigner?.fullName ?? t('portal.design.unassigned'),
    },
    {
      title: t('portal.design.priority'),
      dataIndex: 'priority',
      width: 100,
      shouldCellUpdate: taskChanged,
      render: (value) => <StatusTag status={priorityTone(value)}>{value}</StatusTag>,
    },
    {
      title: t('portal.design.status'),
      width: 130,
      shouldCellUpdate: taskChanged,
      render: (_, row) => <StatusTag status={tone(row.status)}>{row.status}</StatusTag>,
    },
    {
      title: t('portal.design.updatedAt'),
      dataIndex: 'updatedAt',
      width: 170,
      shouldCellUpdate: taskChanged,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: 'actions',
      title: t('portal.design.actions'),
      width: 150,
      fixed: 'right',
      shouldCellUpdate: taskChanged,
      render: (_, row) => {
        const primary =
          canAssign && ['REQUESTED', 'OPEN'].includes(row.status)
            ? (['assign', t('portal.design.assign')] as const)
            : canWork && row.status === 'ASSIGNED'
              ? (['start', t('portal.design.start')] as const)
              : canWork && ['IN_PROGRESS', 'REJECTED'].includes(row.status)
                ? (['submit', t('portal.design.submit')] as const)
                : canReview && row.status === 'SUBMITTED'
                  ? (['review', t('portal.design.review')] as const)
                  : null
        return (
          <Space onClick={(event) => event.stopPropagation()}>
            {primary ? (
              <Tooltip title={primary[1]}>
                <Button
                  type="text"
                  aria-label={primary[1]}
                  icon={
                    primary[0] === 'assign' ? (
                      <UserAddOutlined />
                    ) : primary[0] === 'start' ? (
                      <PlayCircleOutlined />
                    ) : primary[0] === 'submit' ? (
                      <UploadOutlined />
                    ) : (
                      <AuditOutlined />
                    )
                  }
                  onClick={() => openQuickAction(row, primary[0])}
                />
              </Tooltip>
            ) : (
              <Tooltip title={t('portal.design.view')}>
                <Button
                  type="text"
                  aria-label={t('portal.design.view')}
                  icon={<EyeOutlined />}
                  onClick={() => setSelectedId(row.id)}
                />
              </Tooltip>
            )}
            {primary ? (
              <Dropdown
                menu={{
                  items: [{ key: 'view', label: t('portal.design.view') }],
                  onClick: () => setSelectedId(row.id),
                }}
              >
                <Button
                  type="text"
                  aria-label={t('portal.design.moreActions')}
                  icon={<MoreOutlined />}
                />
              </Dropdown>
            ) : null}
          </Space>
        )
      },
    },
  ]
  const task = detail.data

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.design.title')}
        description={t('portal.design.description')}
        actions={
          <Space>
            <Button href="/portal/design/files">PSD files</Button>
            {canAssign ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateTaskOpen(true)}
              >
                {t('portal.design.createDesignTask')}
              </Button>
            ) : null}
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
              {t('portal.design.refresh')}
            </Button>
          </Space>
        }
      />
      <SectionCard>
        <Space size="large" wrap>
          <Typography.Text>
            {t('portal.design.total')}: <strong>{summary.data?.total ?? 0}</strong>
          </Typography.Text>
          <Typography.Text>
            {t('portal.design.active')}: <strong>{summary.data?.active ?? 0}</strong>
          </Typography.Text>
          <Typography.Text>
            {t('portal.design.unassigned')}:{' '}
            <strong>{workload.data?.totals.unassignedCount ?? 0}</strong>
          </Typography.Text>
          {(workload.data?.byDesigner ?? []).slice(0, 5).map((designer) => (
            <Typography.Text key={designer.assignedDesignerId}>
              {assigneeNames.get(designer.assignedDesignerId) ?? t('portal.design.unknownDesigner')}
              : <strong>{designer.totalActive}</strong>
            </Typography.Text>
          ))}
        </Space>
      </SectionCard>
      <SectionCard>
        <DataTable
          rowKey="id"
          rowSelection={
            canAssign
              ? {
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                  getCheckboxProps: (row) => ({
                    disabled: !['REQUESTED', 'OPEN', 'ASSIGNED'].includes(row.status),
                  }),
                }
              : undefined
          }
          columns={columns}
          dataSource={displayedTasks?.items ?? []}
          loading={tasks.isFetching}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: displayedTasks?.pagination.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar label={t('portal.design.filters')} contentClassName={styles.filters}>
              <Input.Search
                className={styles.search}
                allowClear
                placeholder={t('portal.design.search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={() => setPage(1)}
              />
              <Select
                className={styles.filter}
                allowClear
                placeholder={t('portal.design.allStatuses')}
                value={status}
                onChange={(value) => {
                  setStatus(value)
                  setPage(1)
                }}
                options={STATUSES.map((value) => ({ value, label: value }))}
              />
              <Select
                className={styles.filter}
                allowClear
                placeholder={t('portal.design.allTypes')}
                value={taskType}
                onChange={(value) => {
                  setTaskType(value)
                  setPage(1)
                }}
                options={TYPES.map((value) => ({ value, label: value }))}
              />
              {canAssign ? (
                <>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    className={styles.filter}
                    placeholder={t('portal.design.selectDesigner')}
                    value={bulkDesignerId}
                    onChange={setBulkDesignerId}
                    options={(assignees.data ?? []).map(({ id, fullName, name }) => ({
                      value: id,
                      label: fullName ?? name ?? id,
                    }))}
                  />
                  <Button
                    disabled={!selectedRowKeys.length || !bulkDesignerId}
                    loading={bulkAssign.isPending}
                    onClick={() => bulkAssign.mutate()}
                  >
                    {t('portal.design.bulkAssign', { count: selectedRowKeys.length })}
                  </Button>
                </>
              ) : null}
            </FilterBar>
          }
        />
      </SectionCard>
      <DetailDrawer
        open={Boolean(selectedId)}
        width={720}
        title={task?.listing?.sku ?? t('portal.design.task')}
        onClose={() => setSelectedId(undefined)}
        footer={
          task ? (
            <div className={styles.actions}>
              {canAssign && ['REQUESTED', 'OPEN', 'ASSIGNED'].includes(task.status) ? (
                <Button
                  onClick={() => {
                    setActiveTask(task)
                    setAssignOpen(true)
                  }}
                >
                  {t('portal.design.assign')}
                </Button>
              ) : null}
              {canWork && task.status === 'ASSIGNED' ? (
                <Button type="primary" onClick={() => action.mutate({ type: 'start', task })}>
                  {t('portal.design.start')}
                </Button>
              ) : null}
              {canWork && ['IN_PROGRESS', 'REJECTED'].includes(task.status) ? (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => {
                    setActiveTask(task)
                    setSubmitOpen(true)
                  }}
                >
                  {t('portal.design.submitFiles')}
                </Button>
              ) : null}
              {canReview && task.status === 'SUBMITTED' && task.latestSubmission?.assets.length ? (
                <>
                  <Button type="primary" onClick={() => setApproveOpen(true)}>
                    {t('portal.design.approve')}
                  </Button>
                  <Button danger onClick={() => setRejectOpen(true)}>
                    {t('portal.design.reject')}
                  </Button>
                </>
              ) : null}
              {canAssign && !['APPROVED', 'CANCELLED'].includes(task.status) ? (
                <Button danger onClick={() => setCancelOpen(true)}>
                  {t('portal.design.cancel')}
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {task ? (
          <div className={styles.detail}>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                { key: 'status', label: 'Status', children: task.status },
                { key: 'type', label: 'Task type', children: task.taskType },
                {
                  key: 'listing',
                  label: 'Listing',
                  children: task.listing?.sku ?? '-',
                },
                {
                  key: 'template',
                  label: 'Template',
                  children: task.internalTemplate?.name ?? '-',
                },
                {
                  key: 'productType',
                  label: 'Product type',
                  children: task.listing?.productTypeName ?? '-',
                },
                {
                  key: 'designer',
                  label: 'Designer',
                  children: task.assignedDesigner?.fullName ?? '-',
                },
                { key: 'brief', label: 'Brief', children: task.brief ?? '-' },
                {
                  key: 'outputs',
                  label: 'Expected outputs',
                  children: task.expectedOutputs.join(', ') || '-',
                },
                {
                  key: 'rejection',
                  label: 'Reject reason',
                  children: task.rejectReason ?? task.latestSubmission?.rejectReason ?? '-',
                },
              ]}
            />
            {task.latestSubmission?.assets.map((asset) => (
              <Button
                key={asset.id}
                disabled={!asset.downloadUrl}
                onClick={() =>
                  asset.downloadUrl &&
                  void downloadMediaAsset(asset.downloadUrl, asset.originalFilename ?? undefined)
                }
              >
                {asset.originalFilename ?? asset.id}
              </Button>
            ))}
            <Typography.Title level={5}>{t('portal.design.submissionHistory')}</Typography.Title>
            {(submissions.data ?? []).map((submission) => (
              <Descriptions
                key={submission.id}
                bordered
                size="small"
                column={1}
                items={[
                  {
                    key: 'version',
                    label: t('portal.design.version'),
                    children: `v${submission.version} · ${submission.status}`,
                  },
                  { key: 'note', label: t('portal.design.note'), children: submission.note ?? '-' },
                  {
                    key: 'reason',
                    label: t('portal.design.rejectReason'),
                    children: submission.rejectReason ?? '-',
                  },
                  {
                    key: 'files',
                    label: t('portal.design.files'),
                    children: submission.assets.map((asset) => (
                      <Button
                        type="link"
                        key={asset.id}
                        disabled={!asset.downloadUrl}
                        onClick={() =>
                          asset.downloadUrl &&
                          void downloadMediaAsset(
                            asset.downloadUrl,
                            asset.originalFilename ?? undefined,
                          )
                        }
                      >
                        {asset.originalFilename ?? asset.id}
                      </Button>
                    )),
                  },
                ]}
              />
            ))}
          </div>
        ) : null}
      </DetailDrawer>
      <CreateDesignTaskModal
        open={createTaskOpen}
        listings={createListings.data?.items ?? []}
        templates={createOptions.data?.internalTemplates ?? []}
        saving={createTask.isPending}
        onClose={() => setCreateTaskOpen(false)}
        onSubmit={(draft) => createTask.mutate(draft)}
      />
      <Modal
        open={assignOpen}
        title={t('portal.design.assignDesigner')}
        okText={t('portal.design.assign')}
        confirmLoading={action.isPending}
        okButtonProps={{ disabled: !designerId }}
        onCancel={() => {
          setAssignOpen(false)
          setActiveTask(undefined)
        }}
        onOk={() => activeTask && action.mutate({ type: 'assign', task: activeTask })}
      >
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          value={designerId}
          onChange={setDesignerId}
          options={(assignees.data ?? []).map(({ id, fullName, name }) => ({
            value: id,
            label: fullName ?? name ?? id,
          }))}
        />
      </Modal>
      <Modal
        open={approveOpen}
        title={t('portal.design.approveConfirm')}
        okText={t('portal.design.approve')}
        confirmLoading={action.isPending}
        okButtonProps={{ disabled: !approvedAssetId }}
        onCancel={() => setApproveOpen(false)}
        onOk={() => task && action.mutate({ type: 'approve', task })}
      >
        <Select
          style={{ width: '100%' }}
          placeholder={t('portal.design.chooseApprovedFile')}
          value={approvedAssetId}
          onChange={setApprovedAssetId}
          options={(task?.latestSubmission?.assets ?? []).map(({ id, originalFilename }) => ({
            value: id,
            label: originalFilename ?? id,
          }))}
        />
      </Modal>
      <Modal
        open={submitOpen}
        title={t('portal.design.submitFiles')}
        okText={t('portal.design.submit')}
        confirmLoading={action.isPending}
        okButtonProps={{
          disabled: activeTask?.taskType === 'PSD_TEMPLATE' ? !packageFile : !files.length,
        }}
        onCancel={() => {
          uploadController?.abort()
          setSubmitOpen(false)
          setActiveTask(undefined)
        }}
        onOk={() => activeTask && action.mutate({ type: 'submit', task: activeTask })}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {activeTask?.taskType === 'PSD_TEMPLATE' ? (
            <>
              <label>
                <Typography.Text strong>{t('portal.design.designPackage')}</Typography.Text>
                <input
                  aria-label={t('portal.design.designPackage')}
                  type="file"
                  accept=".psd,.zip"
                  disabled={action.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024 * 1024) {
                      toast('error', t('portal.design.designPackageTooLarge'))
                      event.target.value = ''
                      return
                    }
                    setPackageFile(file)
                  }}
                />
              </label>
              <label>
                <Typography.Text strong>{t('portal.design.previewImage')}</Typography.Text>
                <input
                  aria-label="Preview image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={action.isPending}
                  onChange={(event) => setPreviewFile(event.target.files?.[0])}
                />
              </label>
              {action.isPending ? <Progress percent={uploadProgress} /> : null}
            </>
          ) : (
            <Upload.Dragger
              multiple
              fileList={files}
              beforeUpload={(file) => {
                setFiles((current) => [...current, file])
                return false
              }}
              onRemove={(file) =>
                setFiles((current) => current.filter(({ uid }) => uid !== file.uid))
              }
            >
              <UploadOutlined />
              <p>{t('portal.design.dropFiles')}</p>
            </Upload.Dragger>
          )}
          <Input.TextArea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('portal.design.note')}
          />
        </Space>
      </Modal>
      <Modal
        open={rejectOpen}
        title={t('portal.design.rejectSubmission')}
        okText={t('portal.design.reject')}
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        confirmLoading={action.isPending}
        onCancel={() => setRejectOpen(false)}
        onOk={() => task && action.mutate({ type: 'reject', task })}
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder={t('portal.design.reasonRequired')}
        />
      </Modal>
      <Modal
        open={cancelOpen}
        title={t('portal.design.cancelTask')}
        okText={t('portal.design.cancel')}
        confirmLoading={action.isPending}
        okButtonProps={{ danger: true, disabled: !cancelReason.trim() }}
        onCancel={() => {
          setCancelOpen(false)
          setCancelReason('')
        }}
        onOk={() => task && action.mutate({ type: 'cancel', task })}
      >
        <Input.TextArea
          rows={3}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder={t('portal.design.cancelReason')}
        />
      </Modal>
    </section>
  )
}
