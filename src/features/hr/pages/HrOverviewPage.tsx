import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Modal, Select, Space, Switch, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'
import { MetricCard, SectionCard, useFeedbackToast } from '@/shared/ui'

import {
  type Announcement,
  createAnnouncement,
  deleteAnnouncement,
  getHrDashboard,
  listAnnouncements,
} from '../api/hrTimeApi'
import styles from './HrOperationsPage.module.scss'

export function HrOverviewPage({ view = 'dashboard' }: { view?: 'dashboard' | 'announcements' }) {
  const { t } = useTranslation()
  const permissions = new Set(getPermissions())
  const canEmployeeRead =
    permissions.has('HR_EMPLOYEES:READ') || permissions.has('HR_EMPLOYEES:WRITE')
  const canAnnouncementRead =
    permissions.has('HR_ANNOUNCEMENTS:READ') || permissions.has('HR_ANNOUNCEMENTS:WRITE')
  const canWrite = permissions.has('HR_ANNOUNCEMENTS:WRITE')
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const toast = useFeedbackToast()
  const queryClient = useQueryClient()
  const dashboard = useQuery({
    queryKey: ['hr-overview', 'dashboard'],
    queryFn: () => getHrDashboard(dayjs().format('YYYY-MM-DD')),
    enabled: view === 'dashboard' && canEmployeeRead,
  })
  const announcements = useQuery({
    queryKey: ['hr-overview', 'announcements'],
    queryFn: () => listAnnouncements({ limit: 100 }),
    enabled: canAnnouncementRead,
  })
  const save = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      setOpen(false)
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
      <div className={styles.split}>
        {view === 'dashboard' && data && (
          <SectionCard title={t('hrOperations.overview.today')}>
            <div className={styles.compactList}>
              <Typography.Text>
                {t('hrOperations.overview.probation')}: <strong>{data.employees.probation}</strong>
              </Typography.Text>
              <Typography.Text>
                {t('hrOperations.overview.onLeave')}: <strong>{data.attendance.onLeave}</strong>
              </Typography.Text>
              <Typography.Text>
                {t('hrOperations.attendance.late')}: <strong>{data.attendance.late}</strong>
              </Typography.Text>
              <Typography.Text>
                {t('hrOperations.overview.absent')}: <strong>{data.attendance.absent}</strong>
              </Typography.Text>
              <Typography.Text>
                {t('hrOperations.attendance.missingCheckout')}:{' '}
                <strong>{data.attendance.missingCheckOuts}</strong>
              </Typography.Text>
              <Typography.Text>
                {t('hrOperations.overview.approvedOt')}:{' '}
                <strong>{data.approvals.approvedOvertimesToday}</strong>
              </Typography.Text>
            </div>
          </SectionCard>
        )}
        {canAnnouncementRead && (
          <SectionCard title={t('hrOperations.overview.announcements')}>
            <div className={styles.toolbar}>
              <span />
              {canWrite && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
                  {t('hrOperations.overview.createAnnouncement')}
                </Button>
              )}
            </div>
            <div>
              {(announcements.data?.items ?? []).map((item: Announcement) => (
                <article className={styles.announcement} key={item.id}>
                  <Space>
                    <BellOutlined />
                    <Typography.Text strong>{item.title}</Typography.Text>
                    {item.isPinned && <Tag color="gold">PIN</Tag>}
                    <Tag>{item.priority}</Tag>
                  </Space>
                  <Typography.Paragraph ellipsis={{ rows: 2 }}>{item.content}</Typography.Paragraph>
                  <Space>
                    <Typography.Text type="secondary">
                      {item.category} · {item.status}
                    </Typography.Text>
                    {canWrite && (
                      <Button type="link" danger onClick={() => remove.mutate(item.id)}>
                        {t('hrOperations.common.delete')}
                      </Button>
                    )}
                  </Space>
                </article>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
      <Modal
        centered
        open={open}
        title={t('hrOperations.overview.createAnnouncement')}
        footer={null}
        onCancel={() => setOpen(false)}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            category: 'NEWS',
            priority: 'NORMAL',
            status: 'PUBLISHED',
            sendToAll: true,
          }}
          onFinish={(values) => save.mutate(values)}
        >
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
