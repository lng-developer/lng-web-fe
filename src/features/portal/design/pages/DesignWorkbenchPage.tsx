import { useState } from 'react'
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType, UploadFile } from 'antd'
import {
  Button,
  Descriptions,
  Dropdown,
  Input,
  Modal,
  Select,
  Space,
  Tooltip,
  Typography,
  Upload,
} from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
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
  bulkCreatePsdTasks,
  type BulkPsdTaskResult,
  cancelDesignTask,
  createPsdTaskFromListing,
  type DesignTask,
  getDesignSummary,
  getDesignTask,
  getDesignWorkload,
  listDesignAssignees,
  listDesignSubmissions,
  listDesignTasks,
  listPsdCandidates,
  rejectDesignTask,
  startDesignTask,
  submitDesignTask,
  uploadDesignAsset,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'
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
  const [submitOpen, setSubmitOpen] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [note, setNote] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveOpen, setApproveOpen] = useState(false)
  const [approvedAssetId, setApprovedAssetId] = useState<string>()
  const [candidateOpen, setCandidateOpen] = useState(false)
  const [candidateIds, setCandidateIds] = useState<string[]>([])
  const [candidateResult, setCandidateResult] = useState<BulkPsdTaskResult>()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const params = { page, limit: PAGE_SIZE, search: search || undefined, status, taskType }
  const tasks = useQuery({
    queryKey: designKeys.list(params),
    queryFn: () => listDesignTasks(params),
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
    enabled: assignOpen,
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
  const candidates = useQuery({
    queryKey: designKeys.candidates({ page: 1, limit: 100 }),
    queryFn: () => listPsdCandidates({ page: 1, limit: 100 }),
    enabled: candidateOpen,
    retry: false,
  })
  const submissions = useQuery({
    queryKey: designKeys.submissions(selectedId ?? ''),
    queryFn: () => listDesignSubmissions(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  })
  const refresh = async () => queryClient.invalidateQueries({ queryKey: designKeys.all })
  const action = useMutation({
    mutationFn: async ({ type, task }: { type: string; task: DesignTask }) => {
      if (type === 'assign') return assignDesignTask(task.id, designerId!)
      if (type === 'start') return startDesignTask(task.id)
      if (type === 'approve') return approveDesignTask(task.id, approvedAssetId!)
      if (type === 'reject') return rejectDesignTask(task.id, rejectReason.trim())
      if (type === 'cancel') return cancelDesignTask(task.id, cancelReason.trim())
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
  const createCandidates = useMutation({
    mutationFn: async () =>
      candidateIds.length === 1
        ? createPsdTaskFromListing(candidateIds[0])
        : bulkCreatePsdTasks({ listingIds: candidateIds }),
    onSuccess: async (result) => {
      setCandidateIds([])
      setCandidateResult('items' in result ? result : undefined)
      await refresh()
      toast('success', t('portal.design.tasksCreated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not create tasks'),
  })
  const canAssign = permissions.has('DESIGN:WRITE')
  const canWork = permissions.has('DESIGN:WRITE') || permissions.has('DESIGN:WORK')
  const canReview = permissions.has('DESIGN:WRITE') || permissions.has('DESIGN:REVIEW')
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
      render: (_, row) => (
        <>
          <Typography.Text strong>{row.listing?.sku ?? '-'}</Typography.Text>
          <br />
          <Typography.Text type="secondary">
            {row.listing?.title ?? row.internalTemplate?.name ?? '-'}
          </Typography.Text>
        </>
      ),
    },
    { title: t('portal.design.type'), dataIndex: 'taskType', width: 130 },
    { title: t('portal.design.shop'), render: (_, row) => row.shop?.name ?? '-' },
    {
      title: t('portal.design.designer'),
      render: (_, row) => row.assignedDesigner?.fullName ?? t('portal.design.unassigned'),
    },
    { title: t('portal.design.priority'), dataIndex: 'priority', width: 100 },
    {
      title: t('portal.design.status'),
      width: 130,
      render: (_, row) => <StatusTag status={tone(row.status)}>{row.status}</StatusTag>,
    },
    {
      title: t('portal.design.updatedAt'),
      dataIndex: 'updatedAt',
      width: 170,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: 'actions',
      title: t('portal.design.actions'),
      width: 150,
      fixed: 'right',
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
            {canAssign ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCandidateOpen(true)}>
                {t('portal.design.createPsdTasks')}
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
              {designer.assignedDesignerId}: <strong>{designer.totalActive}</strong>
            </Typography.Text>
          ))}
        </Space>
      </SectionCard>
      <SectionCard>
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={tasks.data?.items ?? []}
          loading={tasks.isLoading}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: tasks.data?.pagination.total,
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
                  children: `${task.listing?.sku ?? '-'} · ${task.listing?.title ?? '-'}`,
                },
                {
                  key: 'template',
                  label: 'Template',
                  children: task.internalTemplate?.name ?? '-',
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
              <Button key={asset.id} href={asset.downloadUrl ?? undefined} target="_blank">
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
                        href={asset.downloadUrl ?? undefined}
                        target="_blank"
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
        okButtonProps={{ disabled: !files.length }}
        onCancel={() => {
          setSubmitOpen(false)
          setActiveTask(undefined)
        }}
        onOk={() => activeTask && action.mutate({ type: 'submit', task: activeTask })}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
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
        open={candidateOpen}
        title={t('portal.design.createPsdTasks')}
        okText={t('portal.design.create')}
        confirmLoading={createCandidates.isPending}
        okButtonProps={{ disabled: !candidateIds.length }}
        onCancel={() => {
          setCandidateOpen(false)
          setCandidateIds([])
          setCandidateResult(undefined)
        }}
        onOk={() => createCandidates.mutate()}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            value={candidateIds}
            onChange={setCandidateIds}
            placeholder={t('portal.design.selectListings')}
            options={(candidates.data?.items ?? []).map((candidate) => ({
              value: candidate.id,
              label: `${candidate.sku} · ${candidate.title}`,
            }))}
          />
          {candidateResult?.items.map((item) => (
            <Typography.Text key={item.listingId}>
              {item.listingId}: {item.status}
              {item.message ? ` - ${item.message}` : ''}
            </Typography.Text>
          ))}
        </Space>
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
