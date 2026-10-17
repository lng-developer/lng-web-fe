import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FieldTimeOutlined,
  GlobalOutlined,
  PlusOutlined,
  PushpinFilled,
  ReadOutlined,
  SearchOutlined,
  TeamOutlined,
  WalletOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { loadDepartments } from '@/features/organization/api/organizationApi'
import { getPermissions } from '@/shared/auth/session'
import { MetricCard, PageHeader, SectionCard, StatusTag, useFeedbackToast } from '@/shared/ui'

import { hrKeys } from '../api/hrKeys'
import {
  type Announcement,
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from '../api/hrTimeApi'
import { useEmployeeProfilesQuery, useHrAnnouncementsQuery, useHrDashboardQuery } from '../hooks'
import wbStyles from './AnnouncementsWorkbench.module.scss'
import styles from './HrOperationsPage.module.scss'

type SignalRow = { label: string; value: number | string; tone: string }

const categoryColor = (cat: string) => {
  switch (cat) {
    case 'NEWS':
      return 'blue'
    case 'POLICY':
      return 'purple'
    case 'EVENT':
      return 'cyan'
    default:
      return 'default'
  }
}

type AnnouncementFormValues = Record<string, unknown> & {
  scheduledAt?: Dayjs | null
  remindAt?: Dayjs | null
  attachmentIds?: string[]
  eventDetails?: {
    startDate?: Dayjs | null
    endDate?: Dayjs | null
    location?: string | null
    isMandatory?: boolean
  } | null
}

const announcementTone = (status: string) =>
  status === 'PUBLISHED'
    ? ('approved' as const)
    : status === 'ARCHIVED'
      ? ('cancelled' as const)
      : ('draft' as const)

const percent = (value?: number) => `${value ?? 0}%`

export function HrOverviewPage({ view = 'dashboard' }: { view?: 'dashboard' | 'announcements' }) {
  const { t } = useTranslation()
  const permissions = useMemo(() => new Set(getPermissions()), [])
  const canEmployeeRead =
    permissions.has('HR_EMPLOYEES:READ') || permissions.has('HR_EMPLOYEES:WRITE')
  const canAnnouncementRead =
    permissions.has('HR_ANNOUNCEMENTS:READ') || permissions.has('HR_ANNOUNCEMENTS:WRITE')
  const canWrite = permissions.has('HR_ANNOUNCEMENTS:WRITE')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Announcement>()
  const [rangeDays, setRangeDays] = useState<1 | 7 | 30>(7)
  const [form] = Form.useForm()
  const sendToAll = Form.useWatch('sendToAll', form)
  const category = Form.useWatch('category', form)
  const announcementStatus = Form.useWatch('status', form)
  const toast = useFeedbackToast()
  const queryClient = useQueryClient()

  const todayDateKey = useMemo(() => dayjs().format('YYYY-MM-DD'), [])

  const dashboard = useHrDashboardQuery(todayDateKey, rangeDays, {
    enabled: view === 'dashboard' && canEmployeeRead,
  })

  const announcements = useHrAnnouncementsQuery({
    enabled: canAnnouncementRead,
  })

  const departments = useQuery({
    queryKey: ['organization', 'departments'],
    queryFn: loadDepartments,
    enabled: open && !sendToAll,
  })

  const profiles = useEmployeeProfilesQuery(false, {
    enabled: open && !sendToAll,
  })

  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      selected ? updateAnnouncement(selected.id, values) : createAnnouncement(values),
    onSuccess: () => {
      setOpen(false)
      setSelected(undefined)
      form.resetFields()
      toast('success', t('hrOperations.messages.announcementPublished'))
      void queryClient.invalidateQueries({ queryKey: hrKeys.overviewAnnouncements() })
    },
    onError: (error) =>
      toast(
        'error',
        t('hrOperations.messages.saveFailed'),
        error instanceof Error ? error.message : String(error),
      ),
  })

  const remove = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      toast('success', t('hrOperations.messages.announcementDeleted'))
      void queryClient.invalidateQueries({ queryKey: hrKeys.overviewAnnouncements() })
    },
    onError: (error) =>
      toast(
        'error',
        t('hrOperations.messages.saveFailed'),
        error instanceof Error ? error.message : String(error),
      ),
  })

  const data = dashboard.data

  const attendanceExceptionRows: SignalRow[] = useMemo(
    () =>
      data
        ? [
            {
              label: t('hrOperations.attendance.late'),
              value: data.attendance.late,
              tone: 'warning',
            },
            {
              label: t('hrOperations.overview.absent'),
              value: data.attendance.absent,
              tone: 'danger',
            },
            {
              label: t('hrOperations.attendance.missingCheckout'),
              value: data.attendance.missingCheckOuts,
              tone: 'danger',
            },
          ]
        : [],
    [data, t],
  )

  const actionRows: SignalRow[] = useMemo(
    () =>
      data
        ? [
            {
              label: t('hrOperations.requests.pendingLeave'),
              value: data.approvals.pendingLeaves,
              tone: 'info',
            },
            {
              label: t('hrOperations.requests.pendingOvertime'),
              value: data.approvals.pendingOvertimes,
              tone: 'warning',
            },
            {
              label: t('hrOperations.overview.payrollAdjustments'),
              value: data.payroll?.pendingAdjustments ?? 0,
              tone: 'primary',
            },
          ]
        : [],
    [data, t],
  )

  const openEditor = useCallback(
    (item?: Announcement) => {
      setSelected(item)
      form.resetFields()
      form.setFieldsValue(
        item
          ? {
              ...item,
              scheduledAt: item.scheduledAt ? dayjs(item.scheduledAt) : null,
              remindAt: item.remindAt ? dayjs(item.remindAt) : null,
              eventDetails: item.eventDetails
                ? {
                    ...item.eventDetails,
                    startDate: item.eventDetails.startDate
                      ? dayjs(item.eventDetails.startDate)
                      : null,
                    endDate: item.eventDetails.endDate ? dayjs(item.eventDetails.endDate) : null,
                  }
                : null,
              attachmentIds: item.attachments?.map(({ mediaId }) => mediaId),
            }
          : {
              category: 'NEWS',
              priority: 'NORMAL',
              status: 'PUBLISHED',
              sendToAll: true,
              isPinned: false,
            },
      )
      setOpen(true)
    },
    [form],
  )

  const submitAnnouncement = useCallback(
    (values: AnnouncementFormValues) =>
      save.mutate({
        ...values,
        scheduledAt: values.scheduledAt?.toISOString?.() || null,
        remindAt: values.remindAt?.toISOString?.() || null,
        eventDetails: values.eventDetails
          ? {
              ...values.eventDetails,
              startDate: values.eventDetails.startDate?.toISOString?.() || null,
              endDate: values.eventDetails.endDate?.toISOString?.() || null,
            }
          : null,
        attachments: (values.attachmentIds || []).map((mediaId: string) => ({ mediaId })),
        attachmentIds: undefined,
      }),
    [save],
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

  const announcementStats = useMemo(() => {
    const items = announcements.data?.items ?? []
    return {
      total: items.length,
      published: items.filter((i) => i.status === 'PUBLISHED').length,
      pinned: items.filter((i) => i.isPinned).length,
      scheduled: items.filter((i) => i.status === 'SCHEDULED').length,
      draft: items.filter((i) => i.status === 'DRAFT').length,
    }
  }, [announcements.data?.items])

  const filteredAnnouncements = useMemo(() => {
    let list = announcements.data?.items ?? []
    if (statusFilter === 'PINNED') {
      list = list.filter((item) => item.isPinned)
    } else if (statusFilter !== 'ALL') {
      list = list.filter((item) => item.status === statusFilter)
    }
    if (categoryFilter !== 'ALL') {
      list = list.filter((item) => item.category === categoryFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (item) => item.title?.toLowerCase().includes(q) || item.content?.toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      const dateA = a.publishedAt || a.scheduledAt || ''
      const dateB = b.publishedAt || b.scheduledAt || ''
      return dateB.localeCompare(dateA)
    })
  }, [announcements.data?.items, statusFilter, categoryFilter, searchQuery])

  const upcomingEvents = useMemo(() => {
    const list = (announcements.data?.items ?? []).filter(
      (item) =>
        item.category === 'EVENT' || (item.status === 'SCHEDULED' && Boolean(item.scheduledAt)),
    )
    return list.slice(0, 5)
  }, [announcements.data?.items])

  return (
    <section className={styles.page}>
      {view === 'announcements' && (
        <PageHeader
          title={t('hrOperations.overview.announcements')}
          description={t('hrOperations.overview.announcementsDesc')}
          actions={
            canWrite && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
                {t('hrOperations.overview.createAnnouncement')}
              </Button>
            )
          }
        />
      )}
      {view === 'announcements' && (
        <div className={styles.metrics}>
          <MetricCard
            icon={<BellOutlined />}
            label={t('hrOperations.overview.totalAnnouncements')}
            value={String(announcementStats.total)}
            variant="primary"
          />
          <MetricCard
            icon={<CheckCircleOutlined />}
            label={t('hrOperations.overview.published')}
            value={String(announcementStats.published)}
            variant="success"
          />
          <MetricCard
            icon={<PushpinFilled />}
            label={t('hrOperations.overview.pinnedShort')}
            value={String(announcementStats.pinned)}
            variant="warning"
          />
          <MetricCard
            icon={<ClockCircleOutlined />}
            label={t('hrOperations.overview.scheduled')}
            value={String(announcementStats.scheduled)}
            variant="info"
          />
        </div>
      )}
      {view === 'dashboard' && data && (
        <section className={styles.overviewCommand}>
          <div>
            <Typography.Text className={styles.payrollEyebrow}>
              {t('hrOperations.overview.title')}
            </Typography.Text>
            <Typography.Title level={2}>{dayjs(data.date).format('DD/MM/YYYY')}</Typography.Title>
            <Space wrap>
              <Tag>{`${t('hrOperations.overview.attendanceExceptions')}: ${data.operations?.attendanceExceptions ?? 0}`}</Tag>
              <Tag>{`${t('hrOperations.overview.pendingActions')}: ${data.operations?.pendingActions ?? data.approvals.totalPending}`}</Tag>
              {data.payroll && (
                <Tag>{`${data.payroll.month}/${data.payroll.year} · ${t(
                  `hrOperations.payroll.statuses.${data.payroll.status}`,
                  { defaultValue: data.payroll.status },
                )}`}</Tag>
              )}
            </Space>
          </div>
          <Segmented
            value={rangeDays}
            options={[1, 7, 30].map((value) => ({
              label: t('hrOperations.overview.days', { count: value }),
              value,
            }))}
            onChange={(value) => setRangeDays(value as 1 | 7 | 30)}
          />
        </section>
      )}
      {view === 'dashboard' && data && (
        <div className={styles.metrics}>
          <MetricCard
            icon={<TeamOutlined />}
            label={t('hrOperations.overview.activeStaff')}
            value={String(data.employees.active)}
            variant="info"
          />
          <MetricCard
            icon={<CalendarOutlined />}
            label={t('hrOperations.overview.presentToday')}
            value={String(data.attendance.present)}
            variant="success"
          />
          <MetricCard
            icon={<FieldTimeOutlined />}
            label={t('hrOperations.overview.coverage')}
            value={percent(data.attendance.coverageRate)}
            variant="primary"
          />
          <MetricCard
            icon={<ReadOutlined />}
            label={t('hrOperations.overview.pendingApproval')}
            value={String(data.approvals.totalPending)}
            variant="warning"
          />
        </div>
      )}
      {view === 'dashboard' && (
        <div className={styles.overviewGrid}>
          {data && (
            <SectionCard title={t('hrOperations.overview.todayOperations')}>
              <div className={styles.overviewRows}>
                <div className={styles.overviewRow}>
                  <span>{t('hrOperations.overview.expectedStaff')}</span>
                  <strong>{data.attendance.expectedEmployees}</strong>
                </div>
                <div className={styles.overviewRow}>
                  <span>{t('hrOperations.attendance.records')}</span>
                  <strong>{data.attendance.records}</strong>
                </div>
                <div className={styles.overviewRow}>
                  <span>{t('hrOperations.overview.onLeave')}</span>
                  <strong>{data.attendance.onLeave}</strong>
                </div>
                <div className={styles.overviewRow}>
                  <span>{t('hrOperations.overview.approvedOt')}</span>
                  <strong>{data.approvals.approvedOvertimesToday}</strong>
                </div>
              </div>
              <div className={styles.overviewSignalList}>
                {attendanceExceptionRows.map((item) => (
                  <div
                    className={`${styles.overviewSignal} ${styles[`overviewSignal${item.tone}`]}`}
                    key={item.label}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {view === 'dashboard' && data && (
            <SectionCard title={t('hrOperations.overview.actionQueue')}>
              <div className={styles.overviewSignalList}>
                {actionRows.map((item) => (
                  <div
                    className={`${styles.overviewSignal} ${styles[`overviewSignal${item.tone}`]}`}
                    key={item.label}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {view === 'dashboard' && data && (
            <SectionCard title={t('hrOperations.overview.payrollSnapshot')}>
              {data.payroll ? (
                <div className={styles.overviewRows}>
                  <div className={styles.overviewRow}>
                    <span>{t('hrOperations.payroll.period')}</span>
                    <strong>{`${data.payroll.month}/${data.payroll.year}`}</strong>
                  </div>
                  <div className={styles.overviewRow}>
                    <span>{t('hrOperations.common.status')}</span>
                    <Tag>
                      {t(`hrOperations.payroll.statuses.${data.payroll.status}`, {
                        defaultValue: data.payroll.status,
                      })}
                    </Tag>
                  </div>
                  <div className={styles.overviewRow}>
                    <span>{t('hrOperations.payroll.results')}</span>
                    <strong>{data.payroll.resultCount}</strong>
                  </div>
                  <div className={styles.overviewRow}>
                    <span>{t('hrOperations.payroll.net')}</span>
                    <strong>{data.payroll.summary.amounts.netIncome.toLocaleString()}</strong>
                  </div>
                </div>
              ) : (
                <Typography.Text type="secondary">
                  {t('hrOperations.overview.noPayroll')}
                </Typography.Text>
              )}
            </SectionCard>
          )}
          {view === 'dashboard' && data && (
            <SectionCard title={t('hrOperations.overview.commsSnapshot')}>
              <div className={styles.overviewMiniGrid}>
                <MetricCard
                  icon={<BellOutlined />}
                  label={t('hrOperations.overview.published')}
                  value={String(data.announcements?.published ?? 0)}
                  variant="info"
                />
                <MetricCard
                  icon={<PushpinFilled />}
                  label={t('hrOperations.overview.pinnedShort')}
                  value={String(data.announcements?.pinned ?? 0)}
                  variant="warning"
                />
                <MetricCard
                  icon={<WalletOutlined />}
                  label={t('hrOperations.overview.scheduled')}
                  value={String(data.announcements?.scheduled ?? 0)}
                  variant="neutral"
                />
              </div>
            </SectionCard>
          )}
          {view === 'dashboard' && data && (
            <SectionCard title={t('hrOperations.overview.attendanceTrend')}>
              <div className={styles.overviewChart}>
                <ResponsiveContainer>
                  <LineChart data={data.attendanceTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value) => dayjs(value).format('DD/MM')} />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="present"
                      stroke="var(--ant-color-success)"
                      name={t('hrOperations.team.present')}
                    />
                    <Line
                      type="monotone"
                      dataKey="late"
                      stroke="var(--ant-color-warning)"
                      name={t('hrOperations.attendance.late')}
                    />
                    <Line
                      type="monotone"
                      dataKey="absent"
                      stroke="var(--ant-color-error)"
                      name={t('hrOperations.overview.absent')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}
        </div>
      )}
      {view === 'announcements' && canAnnouncementRead && (
        <div className={wbStyles.workbench}>
          <div className={wbStyles.mainPanel}>
            <div className={wbStyles.filterBar}>
              <Input
                className={wbStyles.searchInput}
                placeholder={t('hrOperations.overview.searchAnnouncementPlaceholder')}
                prefix={<SearchOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />}
                allowClear
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Segmented
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as string)}
                options={[
                  { label: t('hrOperations.overview.allStatuses'), value: 'ALL' },
                  {
                    label: t('hrOperations.overview.announcementStatuses.PUBLISHED'),
                    value: 'PUBLISHED',
                  },
                  { label: t('hrOperations.overview.pinnedShort'), value: 'PINNED' },
                  {
                    label: t('hrOperations.overview.announcementStatuses.SCHEDULED'),
                    value: 'SCHEDULED',
                  },
                  {
                    label: t('hrOperations.overview.announcementStatuses.DRAFT'),
                    value: 'DRAFT',
                  },
                ]}
              />
              <Select
                style={{ width: 140 }}
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={[
                  { label: t('hrOperations.overview.allCategories'), value: 'ALL' },
                  { label: t('hrOperations.overview.announcementCategories.NEWS'), value: 'NEWS' },
                  {
                    label: t('hrOperations.overview.announcementCategories.POLICY'),
                    value: 'POLICY',
                  },
                  {
                    label: t('hrOperations.overview.announcementCategories.EVENT'),
                    value: 'EVENT',
                  },
                  {
                    label: t('hrOperations.overview.announcementCategories.OTHER'),
                    value: 'OTHER',
                  },
                ]}
              />
            </div>

            {filteredAnnouncements.length === 0 ? (
              <div className={wbStyles.emptyBox}>
                <Empty description={t('hrOperations.overview.noAnnouncementsFound')}>
                  {canWrite && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
                      {t('hrOperations.overview.createAnnouncement')}
                    </Button>
                  )}
                </Empty>
              </div>
            ) : (
              <div className={wbStyles.announcementsList}>
                {filteredAnnouncements.map((item: Announcement) => (
                  <article
                    key={item.id}
                    className={`${wbStyles.announcementCard} ${item.isPinned ? wbStyles.pinnedCard : ''}`}
                  >
                    <div className={wbStyles.cardHeader}>
                      <div className={wbStyles.cardHeaderLeft}>
                        {item.isPinned ? (
                          <PushpinFilled style={{ color: '#faad14', fontSize: 16 }} />
                        ) : (
                          <BellOutlined
                            style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 16 }}
                          />
                        )}
                        <span
                          className={wbStyles.cardTitle}
                          onClick={() => openEditor(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') openEditor(item)
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          {item.title}
                        </span>
                        <Tag color={categoryColor(item.category)}>
                          {t(`hrOperations.overview.announcementCategories.${item.category}`, {
                            defaultValue: item.category,
                          })}
                        </Tag>
                        {item.priority !== 'NORMAL' && (
                          <Tag
                            color={
                              item.priority === 'URGENT'
                                ? 'red'
                                : item.priority === 'HIGH'
                                  ? 'orange'
                                  : 'default'
                            }
                          >
                            {t(`hrOperations.overview.announcementPriorities.${item.priority}`, {
                              defaultValue: item.priority,
                            })}
                          </Tag>
                        )}
                        <StatusTag status={announcementTone(item.status)}>
                          {t(`hrOperations.overview.announcementStatuses.${item.status}`, {
                            defaultValue: item.status,
                          })}
                        </StatusTag>
                        {item.sendToAll ? (
                          <Tag icon={<GlobalOutlined />}>
                            {t('hrOperations.overview.companyWideBadge')}
                          </Tag>
                        ) : (
                          <Tag icon={<TeamOutlined />}>
                            {t('hrOperations.overview.departmentsBadge', {
                              count:
                                (item.targetDepartmentIds?.length || 0) +
                                (item.targetProfileIds?.length || 0),
                            })}
                          </Tag>
                        )}
                      </div>
                      {canWrite && (
                        <Space size={4}>
                          <Tooltip title={t('hrOperations.overview.editAnnouncement')}>
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              size="small"
                              onClick={() => openEditor(item)}
                            />
                          </Tooltip>
                          <Popconfirm
                            title={t('hrOperations.overview.deleteConfirmTitle')}
                            description={t('hrOperations.overview.deleteConfirmDesc')}
                            onConfirm={() => remove.mutate(item.id)}
                            okText={t('hrOperations.common.delete')}
                            cancelText={t('hrOperations.common.cancel')}
                            okButtonProps={{ danger: true }}
                          >
                            <Tooltip title={t('hrOperations.common.delete')}>
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </Tooltip>
                          </Popconfirm>
                        </Space>
                      )}
                    </div>
                    <Typography.Paragraph
                      className={wbStyles.cardContent}
                      ellipsis={{ rows: 3, expandable: true }}
                    >
                      {item.content}
                    </Typography.Paragraph>
                    {item.category === 'EVENT' && item.eventDetails && (
                      <div className={wbStyles.eventDetailsBox}>
                        {item.eventDetails.startDate && (
                          <span>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            {dayjs(item.eventDetails.startDate).format('DD/MM/YYYY HH:mm')}
                            {item.eventDetails.endDate &&
                              ` - ${dayjs(item.eventDetails.endDate).format('DD/MM/YYYY HH:mm')}`}
                          </span>
                        )}
                        {item.eventDetails.location && <span>📍 {item.eventDetails.location}</span>}
                        {item.eventDetails.isMandatory && (
                          <Tag color="error">{t('hrOperations.overview.mandatory')}</Tag>
                        )}
                      </div>
                    )}
                    <div className={wbStyles.cardFooter}>
                      <div className={wbStyles.cardMeta}>
                        <span className={wbStyles.cardMetaItem}>
                          <ClockCircleOutlined />
                          {item.publishedAt
                            ? dayjs(item.publishedAt).format('DD/MM/YYYY HH:mm')
                            : item.scheduledAt
                              ? `${t('hrOperations.overview.scheduledAt')}: ${dayjs(item.scheduledAt).format('DD/MM/YYYY HH:mm')}`
                              : dayjs().format('DD/MM/YYYY')}
                        </span>
                        {item.remindAt && (
                          <span className={wbStyles.cardMetaItem}>
                            <BellOutlined />
                            {`${t('hrOperations.overview.remindAt')}: ${dayjs(item.remindAt).format('DD/MM/YYYY HH:mm')}`}
                          </span>
                        )}
                        {item.attachments && item.attachments.length > 0 && (
                          <span className={wbStyles.cardMetaItem}>
                            📎 {item.attachments.length} file
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className={wbStyles.sidePanel}>
            <SectionCard title={t('hrOperations.overview.guidelinesTitle')}>
              <div className={wbStyles.guidelinesList}>
                <div className={wbStyles.guidelineItem}>
                  <PushpinFilled style={{ color: '#faad14' }} className={wbStyles.guidelineIcon} />
                  <div>
                    <strong>{t('hrOperations.overview.guidelinePinnedTitle')}</strong>
                    <span>{t('hrOperations.overview.guidelinePinnedDesc')}</span>
                  </div>
                </div>
                <div className={wbStyles.guidelineItem}>
                  <WarningOutlined
                    style={{ color: '#f59e0b' }}
                    className={wbStyles.guidelineIcon}
                  />
                  <div>
                    <strong>{t('hrOperations.overview.guidelinePriorityTitle')}</strong>
                    <span>{t('hrOperations.overview.guidelinePriorityDesc')}</span>
                  </div>
                </div>
                <div className={wbStyles.guidelineItem}>
                  <GlobalOutlined style={{ color: '#2563eb' }} className={wbStyles.guidelineIcon} />
                  <div>
                    <strong>{t('hrOperations.overview.guidelineAudienceTitle')}</strong>
                    <span>{t('hrOperations.overview.guidelineAudienceDesc')}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t('hrOperations.overview.upcomingEventsTitle')}>
              {upcomingEvents.length === 0 ? (
                <Typography.Text type="secondary">
                  {t('hrOperations.overview.noUpcomingEvents')}
                </Typography.Text>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className={wbStyles.eventItem}>
                    <div className={wbStyles.eventItemHeader}>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => openEditor(event)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') openEditor(event)
                        }}
                        style={{ cursor: 'pointer', color: 'var(--ant-color-text)' }}
                      >
                        {event.title}
                      </span>
                      <Tag color={event.category === 'EVENT' ? 'cyan' : 'blue'}>
                        {event.category}
                      </Tag>
                    </div>
                    <div className={wbStyles.eventItemTime}>
                      <CalendarOutlined />
                      {event.eventDetails?.startDate
                        ? dayjs(event.eventDetails.startDate).format('DD/MM/YYYY HH:mm')
                        : event.scheduledAt
                          ? dayjs(event.scheduledAt).format('DD/MM/YYYY HH:mm')
                          : ''}
                      {event.eventDetails?.location && ` · ${event.eventDetails.location}`}
                    </div>
                  </div>
                ))
              )}
            </SectionCard>
          </div>
        </div>
      )}
      <Modal
        width={860}
        open={open}
        title={t(
          selected
            ? 'hrOperations.overview.editAnnouncement'
            : 'hrOperations.overview.createAnnouncement',
        )}
        footer={null}
        onCancel={() => {
          setOpen(false)
          setSelected(undefined)
        }}
      >
        <Form
          className={styles.modalForm}
          form={form}
          layout="vertical"
          onFinish={submitAnnouncement}
        >
          <Form.Item
            name="title"
            label={t('hrOperations.overview.announcementTitle')}
            rules={[
              { required: true, message: t('hrOperations.overview.requiredAnnouncementTitle') },
            ]}
          >
            <Input placeholder={t('hrOperations.overview.announcementTitlePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="content"
            label={t('hrOperations.overview.content')}
            rules={[{ required: true, message: t('hrOperations.overview.requiredContent') }]}
          >
            <Input.TextArea rows={6} placeholder={t('hrOperations.overview.contentPlaceholder')} />
          </Form.Item>
          <div className={styles.announcementMetaGrid}>
            <Form.Item name="category" label={t('hrOperations.overview.category')}>
              <Select
                options={['NEWS', 'POLICY', 'EVENT', 'OTHER'].map((value) => ({
                  value,
                  label: t(`hrOperations.overview.announcementCategories.${value}`),
                }))}
              />
            </Form.Item>
            <Form.Item name="priority" label={t('hrOperations.overview.priority')}>
              <Select
                options={['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((value) => ({
                  value,
                  label: t(`hrOperations.overview.announcementPriorities.${value}`),
                }))}
              />
            </Form.Item>
            <Form.Item name="status" label={t('hrOperations.common.status')}>
              <Select
                options={['DRAFT', 'SCHEDULED', 'PUBLISHED'].map((value) => ({
                  value,
                  label: t(`hrOperations.overview.announcementStatuses.${value}`, {
                    defaultValue: value,
                  }),
                }))}
              />
            </Form.Item>
          </div>
          <Form.Item
            name="sendToAll"
            label={t('hrOperations.overview.companyWide')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          {!sendToAll && (
            <>
              <Form.Item
                name="targetDepartmentIds"
                label={t('hrOperations.overview.targetDepartments')}
              >
                <Select
                  mode="multiple"
                  options={departments.data?.items.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
              </Form.Item>
              <Form.Item name="targetProfileIds" label={t('hrOperations.overview.targetEmployees')}>
                <Select
                  mode="multiple"
                  showSearch
                  optionFilterProp="label"
                  options={profiles.data?.items.map((item) => ({
                    value: item.id,
                    label: `${item.fullName} · ${item.employeeCode}`,
                  }))}
                />
              </Form.Item>
            </>
          )}
          <Space wrap align="start">
            <Form.Item
              name="isPinned"
              label={t('hrOperations.overview.pinned')}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            {announcementStatus === 'SCHEDULED' && (
              <Form.Item
                name="scheduledAt"
                label={t('hrOperations.overview.scheduledAt')}
                rules={[
                  { required: true, message: t('hrOperations.overview.requiredScheduledAt') },
                ]}
              >
                <DatePicker showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            )}
            <Form.Item name="remindAt" label={t('hrOperations.overview.remindAt')}>
              <DatePicker showTime format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </Space>
          {category === 'EVENT' && (
            <>
              <Space wrap align="start">
                <Form.Item
                  name={['eventDetails', 'startDate']}
                  label={t('hrOperations.overview.eventStart')}
                >
                  <DatePicker showTime format="DD/MM/YYYY HH:mm" />
                </Form.Item>
                <Form.Item
                  name={['eventDetails', 'endDate']}
                  label={t('hrOperations.overview.eventEnd')}
                >
                  <DatePicker showTime format="DD/MM/YYYY HH:mm" />
                </Form.Item>
              </Space>
              <Form.Item
                name={['eventDetails', 'location']}
                label={t('hrOperations.common.location')}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name={['eventDetails', 'isMandatory']}
                label={t('hrOperations.overview.mandatory')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </>
          )}
          <Form.Item name="attachmentIds" label={t('hrOperations.overview.attachmentIds')}>
            <Select mode="tags" tokenSeparators={[',']} />
          </Form.Item>
          <Space className={styles.actions}>
            <Button onClick={() => setOpen(false)}>{t('hrOperations.common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={save.isPending}>
              {t('hrOperations.overview.publish')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </section>
  )
}
