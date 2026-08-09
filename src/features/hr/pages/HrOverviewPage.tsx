import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BellOutlined,
  DeleteOutlined,
  PlusOutlined,
  PushpinFilled,
  TeamOutlined,
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
  Bar,
  BarChart,
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
        <div className={styles.metrics}>
          <MetricCard
            icon={<TeamOutlined />}
            label={t('hrOperations.overview.activeStaff')}
            value={String(data.employees.active)}
          />
          <MetricCard
            label={t('hrOperations.overview.presentToday')}
            value={String(data.attendance.present)}
          />
          <MetricCard
            label={t('hrOperations.overview.coverage')}
            value={`${data.attendance.coverageRate}%`}
          />
          <MetricCard
            label={t('hrOperations.overview.pendingApproval')}
            value={String(data.approvals.totalPending)}
          />
        </div>
      )}
      <div className={view === 'dashboard' ? styles.split : undefined}>
        {view === 'dashboard' && data && (
          <SectionCard title={t('hrOperations.overview.today')}>
            <div style={{ height: 260, width: '100%', marginTop: 24 }}>
              <ResponsiveContainer>
                <BarChart
                  data={[
                    {
                      name: t('hrOperations.overview.probation'),
                      count: data.employees.probation,
                      fill: '#8884d8',
                    },
                    {
                      name: t('hrOperations.overview.onLeave'),
                      count: data.attendance.onLeave,
                      fill: '#ffc658',
                    },
                    {
                      name: t('hrOperations.attendance.late'),
                      count: data.attendance.late,
                      fill: '#faad14',
                    },
                    {
                      name: t('hrOperations.overview.absent'),
                      count: data.attendance.absent,
                      fill: '#ff4d4f',
                    },
                    {
                      name: t('hrOperations.attendance.missingCheckout'),
                      count: data.attendance.missingCheckOuts,
                      fill: '#cf1322',
                    },
                    {
                      name: t('hrOperations.overview.approvedOt'),
                      count: data.approvals.approvedOvertimesToday,
                      fill: '#52c41a',
                    },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}
        {view === 'dashboard' && data && (
          <SectionCard title={t('hrOperations.overview.attendanceTrend')}>
            <Flex justify="flex-end">
              <Segmented
                value={rangeDays}
                options={[1, 7, 30].map((value) => ({
                  label: t('hrOperations.overview.days', { count: value }),
                  value,
                }))}
                onChange={(value) => setRangeDays(value as 1 | 7 | 30)}
              />
            </Flex>
            <div style={{ height: 260, width: '100%', marginTop: 16 }}>
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
                    stroke="#52c41a"
                    name={t('hrOperations.team.present')}
                  />
                  <Line
                    type="monotone"
                    dataKey="late"
                    stroke="#faad14"
                    name={t('hrOperations.attendance.late')}
                  />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    stroke="#ff4d4f"
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
                      <StatusTag status={announcementTone(item.status)}>{item.status}</StatusTag>
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
        <Form form={form} layout="vertical" onFinish={submitAnnouncement}>
          <Form.Item
            name="title"
            label={t('hrOperations.overview.announcementTitle')}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="content"
            label={t('hrOperations.overview.content')}
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={6} />
          </Form.Item>
          <Space>
            <Form.Item name="category" label={t('hrOperations.overview.category')}>
              <Select options={['NEWS', 'POLICY', 'EVENT', 'OTHER'].map((value) => ({ value }))} />
            </Form.Item>
            <Form.Item name="priority" label={t('hrOperations.overview.priority')}>
              <Select options={['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((value) => ({ value }))} />
            </Form.Item>
            <Form.Item name="status" label={t('hrOperations.common.status')}>
              <Select options={['DRAFT', 'SCHEDULED', 'PUBLISHED'].map((value) => ({ value }))} />
            </Form.Item>
          </Space>
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
                rules={[{ required: true }]}
              >
                <DatePicker showTime />
              </Form.Item>
            )}
            <Form.Item name="remindAt" label={t('hrOperations.overview.remindAt')}>
              <DatePicker showTime />
            </Form.Item>
          </Space>
          {category === 'EVENT' && (
            <>
              <Space wrap align="start">
                <Form.Item
                  name={['eventDetails', 'startDate']}
                  label={t('hrOperations.overview.eventStart')}
                >
                  <DatePicker showTime />
                </Form.Item>
                <Form.Item
                  name={['eventDetails', 'endDate']}
                  label={t('hrOperations.overview.eventEnd')}
                >
                  <DatePicker showTime />
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
