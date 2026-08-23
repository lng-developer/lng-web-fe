import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BellOutlined,
  CalendarOutlined,
  DeleteOutlined,
  FieldTimeOutlined,
  PlusOutlined,
  PushpinFilled,
  ReadOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
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
import { MetricCard, SectionCard, StatusTag, useFeedbackToast } from '@/shared/ui'

import { loadEmployeeProfiles } from '../api/hrApi'
import {
  type Announcement,
  createAnnouncement,
  deleteAnnouncement,
  getHrDashboard,
  listAnnouncements,
  updateAnnouncement,
} from '../api/hrTimeApi'
import styles from './HrOperationsPage.module.scss'

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
  const permissions = new Set(getPermissions())
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
  const dashboard = useQuery({
    queryKey: ['hr-overview', 'dashboard', rangeDays],
    queryFn: () => getHrDashboard(dayjs().format('YYYY-MM-DD'), rangeDays),
    enabled: view === 'dashboard' && canEmployeeRead,
  })
  const announcements = useQuery({
    queryKey: ['hr-overview', 'announcements'],
    queryFn: () => listAnnouncements({ limit: 100 }),
    enabled: canAnnouncementRead,
  })
  const departments = useQuery({
    queryKey: ['organization', 'departments'],
    queryFn: loadDepartments,
    enabled: open && !sendToAll,
  })
  const profiles = useQuery({
    queryKey: ['hr', 'employee-profiles', false],
    queryFn: () => loadEmployeeProfiles(false),
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
      void queryClient.invalidateQueries({ queryKey: ['hr-overview', 'announcements'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })
  const remove = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      toast('success', t('hrOperations.messages.announcementDeleted'))
      void queryClient.invalidateQueries({ queryKey: ['hr-overview', 'announcements'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })
  const data = dashboard.data
  const attendanceExceptionRows = data
    ? [
        { label: t('hrOperations.attendance.late'), value: data.attendance.late, tone: 'warning' },
        { label: t('hrOperations.overview.absent'), value: data.attendance.absent, tone: 'danger' },
        {
          label: t('hrOperations.attendance.missingCheckout'),
          value: data.attendance.missingCheckOuts,
          tone: 'danger',
        },
      ]
    : []
  const actionRows = data
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
    : []
  const openEditor = (item?: Announcement) => {
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
  }
  const submitAnnouncement = (values: AnnouncementFormValues) =>
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
    })

  return (
    <section className={styles.page}>
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
      <div className={view === 'dashboard' ? styles.overviewGrid : undefined}>
        {view === 'dashboard' && data && (
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
        {view === 'announcements' && canAnnouncementRead && (
          <SectionCard title={t('hrOperations.overview.announcements')}>
            <div className={styles.toolbar} style={{ paddingBottom: 16 }}>
              <span />
              {canWrite && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
                  {t('hrOperations.overview.createAnnouncement')}
                </Button>
              )}
            </div>
            <div>
              {(announcements.data?.items ?? []).map((item: Announcement) => (
                <article className={styles.announcement} key={item.id}>
                  <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
                    <Space>
                      {item.isPinned ? (
                        <PushpinFilled style={{ color: '#faad14' }} />
                      ) : (
                        <BellOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />
                      )}
                      <Button type="link" onClick={() => openEditor(item)}>
                        {item.title}
                      </Button>
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
                          {item.priority}
                        </Tag>
                      )}
                    </Space>
                    <Space>
                      <StatusTag status={announcementTone(item.status)}>
                        {t(`hrOperations.overview.announcementStatuses.${item.status}`, {
                          defaultValue: item.status,
                        })}
                      </StatusTag>
                      {canWrite && (
                        <Tooltip title={t('hrOperations.common.delete')}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation()
                              remove.mutate(item.id)
                            }}
                          />
                        </Tooltip>
                      )}
                    </Space>
                  </Flex>
                  <Typography.Paragraph
                    ellipsis={{ rows: 2 }}
                    type="secondary"
                    style={{ marginBottom: 0 }}
                  >
                    {item.content}
                  </Typography.Paragraph>
                </article>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
      <Modal
        centered
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
