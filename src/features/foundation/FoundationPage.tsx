import { type Key, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoCircleOutlined } from '@ant-design/icons'
import {
  Button,
  Checkbox,
  DatePicker,
  Flex,
  Form,
  Input,
  Segmented,
  Select,
  Space,
  Switch,
  Tag,
  TimePicker,
  Tooltip,
  Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import {
  BarChart,
  BulkActionBar,
  CommandPalette,
  ConfirmDangerModal,
  DataTable,
  DetailDrawer,
  EmptyState,
  FeedbackAlert,
  FileUpload,
  FilterBar,
  FormActions,
  LoadingState,
  MetricCard,
  PageHeader,
  PermissionGate,
  SectionCard,
  StatusTag,
  TableFooter,
} from '@/shared/ui'

import styles from './FoundationPage.module.scss'

const { Paragraph, Text } = Typography

const sampleRows = [
  { key: 'order-2026-001', reference: 'ORD-2026-001', owner: 'Linh Nguyen', priority: 'high' },
  { key: 'order-2026-002', reference: 'ORD-2026-002', owner: 'Minh Tran', priority: 'urgent' },
  { key: 'order-2026-003', reference: 'ORD-2026-003', owner: 'An Pham', priority: 'medium' },
]

const priorityColors = { medium: 'processing', high: 'warning', urgent: 'error' }

function createDateRange(start: Dayjs, end: Dayjs): [Dayjs, Dayjs] {
  return [start, end]
}

export function FoundationPage() {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const datePresets = [
    {
      label: t('foundation.controls.today'),
      value: () => createDateRange(dayjs().startOf('day'), dayjs().endOf('day')),
    },
    {
      label: t('foundation.controls.yesterday'),
      value: () =>
        createDateRange(
          dayjs().subtract(1, 'day').startOf('day'),
          dayjs().subtract(1, 'day').endOf('day'),
        ),
    },
    {
      label: t('foundation.controls.last7Days'),
      value: () => createDateRange(dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')),
    },
    {
      label: t('foundation.controls.last30Days'),
      value: () =>
        createDateRange(dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')),
    },
  ]

  return (
    <Space orientation="vertical" size={24} className={styles.page}>
      <PageHeader
        title={t('foundation.title')}
        description={t('foundation.description')}
        actions={
          <Space>
            <Button>{t('foundation.actions.secondary')}</Button>
            <Button type="primary">{t('foundation.actions.primary')}</Button>
            <Button onClick={() => setCommandPaletteOpen(true)}>
              {t('foundation.command.open')}
            </Button>
          </Space>
        }
      />

      <div className={styles.grid}>
        <section className={styles.controls}>
          <SectionCard title={t('foundation.sections.controls')}>
            <Flex vertical gap={20}>
              <Space>
                <Button type="primary">{t('foundation.actions.primary')}</Button>
                <Button>{t('foundation.actions.secondary')}</Button>
                <Button danger onClick={() => setConfirmOpen(true)}>
                  {t('foundation.actions.deleteRole')}
                </Button>
                <Button loading>{t('foundation.actions.secondary')}</Button>
                <Button disabled>{t('foundation.actions.secondary')}</Button>
                <Tooltip title={t('foundation.input.label')}>
                  <Button icon={<InfoCircleOutlined />} aria-label={t('foundation.input.label')} />
                </Tooltip>
              </Space>
              <Form layout="vertical">
                <Form.Item label={t('foundation.input.label')} className={styles.formItem}>
                  <Input.Search placeholder={t('foundation.input.placeholder')} />
                </Form.Item>
              </Form>
              <Form layout="vertical">
                <FilterBar
                  label={t('foundation.controls.filters')}
                  actions={
                    <Space>
                      <Button>{t('foundation.controls.clear')}</Button>
                      <Button type="primary">{t('foundation.controls.apply')}</Button>
                    </Space>
                  }
                >
                  <Form.Item
                    className={styles.filterField}
                    label={t('foundation.controls.requiredName')}
                    validateStatus="error"
                    help={t('foundation.controls.requiredError')}
                    required
                  >
                    <Input placeholder={t('foundation.controls.requiredName')} />
                  </Form.Item>
                  <Form.Item className={styles.filterField} label={t('foundation.controls.status')}>
                    <Select
                      defaultValue="operational"
                      options={[
                        { value: 'operational', label: t('foundation.status.operational') },
                        { value: 'warning', label: t('foundation.status.warning') },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.dateRange}
                    label={t('foundation.controls.dateRange')}
                  >
                    <DatePicker.RangePicker
                      placeholder={[
                        t('foundation.controls.startDate'),
                        t('foundation.controls.endDate'),
                      ]}
                      presets={datePresets}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.filterField}
                    label={t('foundation.controls.timeRange')}
                  >
                    <TimePicker.RangePicker
                      format="HH:mm"
                      minuteStep={15}
                      needConfirm={false}
                      placeholder={[
                        t('foundation.controls.startTime'),
                        t('foundation.controls.endTime'),
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.filterField}
                    label={t('foundation.controls.reportMonth')}
                  >
                    <DatePicker
                      format={t('foundation.controls.monthFormat')}
                      picker="month"
                      placeholder={t('foundation.controls.selectMonth')}
                    />
                  </Form.Item>
                  <Form.Item className={styles.filterField} label={t('foundation.controls.notify')}>
                    <Checkbox>{t('foundation.controls.notify')}</Checkbox>
                  </Form.Item>
                  <Form.Item
                    className={styles.filterField}
                    label={t('foundation.controls.automation')}
                  >
                    <Switch aria-label={t('foundation.controls.automation')} />
                  </Form.Item>
                  <Form.Item className={styles.filterField} label={t('foundation.controls.daily')}>
                    <Segmented
                      options={[t('foundation.controls.daily'), t('foundation.controls.weekly')]}
                    />
                  </Form.Item>
                </FilterBar>
              </Form>
              <Form
                layout="vertical"
                onFinish={() => setFormDirty(false)}
                onValuesChange={() => setFormDirty(true)}
              >
                <Form.Item label={t('foundation.form.note')} required>
                  <Input placeholder={t('foundation.form.notePlaceholder')} />
                </Form.Item>
                <FormActions
                  dirty={formDirty}
                  submitLabel={t('foundation.form.save')}
                  cancelLabel={t('foundation.actions.cancel')}
                  onCancel={() => setFormDirty(false)}
                />
              </Form>
            </Flex>
          </SectionCard>
        </section>

        <section className={styles.cardStates}>
          <SectionCard title={t('foundation.sections.cards')} selected>
            <Flex vertical gap={12}>
              <Text strong>{t('foundation.card.title')}</Text>
              <Paragraph type="secondary">{t('foundation.card.description')}</Paragraph>
              <Space>
                <StatusTag status="operational">{t('foundation.status.operational')}</StatusTag>
                <StatusTag status="warning">{t('foundation.status.warning')}</StatusTag>
              </Space>
            </Flex>
          </SectionCard>
        </section>

        <section className={styles.feedback}>
          <Space orientation="vertical" size={24} className={styles.fullWidth}>
            <FeedbackAlert
              type="success"
              title={t('foundation.feedback.success')}
              description={t('foundation.feedback.successDescription')}
            />
            <FeedbackAlert type="warning" title={t('foundation.feedback.warning')} />
            <FeedbackAlert
              type="error"
              title={t('foundation.feedback.error')}
              action={<Button type="link">{t('foundation.feedback.retry')}</Button>}
            />
          </Space>
        </section>

        <section className={styles.empty}>
          <SectionCard title={t('foundation.sections.empty')}>
            <EmptyState
              title={t('foundation.empty.title')}
              description={t('foundation.empty.description')}
              action={<Button type="primary">{t('foundation.empty.action')}</Button>}
            />
          </SectionCard>
        </section>

        <section className={styles.loading}>
          <SectionCard title={t('foundation.sections.loading')}>
            <LoadingState variant="card" />
          </SectionCard>
        </section>

        <section className={styles.upload}>
          <SectionCard title={t('foundation.sections.upload')}>
            <FileUpload
              multiple
              maxCount={5}
              title={t('foundation.upload.title')}
              description={t('foundation.upload.description')}
            />
          </SectionCard>
        </section>

        <section className={styles.tableFoundation}>
          <SectionCard title={t('foundation.sections.table')}>
            <DataTable
              columns={[
                { title: t('foundation.table.reference'), dataIndex: 'reference', sorter: true },
                { title: t('foundation.table.owner'), dataIndex: 'owner', sorter: true },
                {
                  title: t('foundation.table.priority'),
                  dataIndex: 'priority',
                  render: (priority: 'medium' | 'high' | 'urgent') => (
                    <Tag color={priorityColors[priority]}>
                      {t(`foundation.priority.${priority}`)}
                    </Tag>
                  ),
                },
                {
                  title: t('foundation.table.actions'),
                  key: 'actions',
                  render: () => (
                    <Button type="link" onClick={() => setDrawerOpen(true)}>
                      {t('foundation.table.viewDetails')}
                    </Button>
                  ),
                },
              ]}
              dataSource={sampleRows}
              pagination={{ pageSize: 2, showSizeChanger: false }}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
              toolbar={
                <Flex vertical gap={12}>
                  <Space>
                    <Input.Search placeholder={t('foundation.table.searchPlaceholder')} />
                    <PermissionGate
                      permissions={['orders.read']}
                      required="orders.export"
                      mode="disable"
                    >
                      <Button>{t('foundation.table.export')}</Button>
                    </PermissionGate>
                  </Space>
                  <BulkActionBar
                    selectedCount={selectedRowKeys.length}
                    onClear={() => setSelectedRowKeys([])}
                  >
                    <Button>{t('foundation.table.archive')}</Button>
                  </BulkActionBar>
                </Flex>
              }
            />
          </SectionCard>
        </section>

        <section className={styles.summary}>
          <SectionCard title={t('foundation.sections.summary')}>
            <div className={styles.metricGrid}>
              <MetricCard label={t('foundation.summary.totalAssets')} value="1,284" />
              <MetricCard label={t('foundation.summary.alerts')} value="09" />
            </div>
            <div className={styles.tableFooter}>
              <TableFooter
                from={21}
                to={40}
                total={126}
                pageSize={20}
                summaryPrefix={t('foundation.summary.showing')}
                rowsPerPageLabel={t('foundation.summary.rowsPerPage')}
              />
            </div>
            <BarChart
              ariaLabel={t('foundation.chart.ariaLabel')}
              data={[
                { label: 'Mon', value: 36 },
                { label: 'Tue', value: 54 },
                { label: 'Wed', value: 42 },
                { label: 'Thu', value: 68 },
                { label: 'Fri', value: 51 },
              ]}
            />
          </SectionCard>
        </section>
      </div>

      <ConfirmDangerModal
        open={confirmOpen}
        title={t('foundation.modal.title')}
        description={t('foundation.modal.description')}
        confirmLabel={t('foundation.actions.deleteRole')}
        cancelLabel={t('foundation.actions.cancel')}
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />
      {drawerOpen ? (
        <DetailDrawer
          open
          title={t('foundation.drawer.title')}
          onClose={() => setDrawerOpen(false)}
          footer={
            <Button onClick={() => setDrawerOpen(false)}>{t('foundation.actions.cancel')}</Button>
          }
        >
          <Space orientation="vertical" size={8}>
            <Text strong>{t('foundation.drawer.reference')}</Text>
            <Text type="secondary">ORD-2026-001</Text>
          </Space>
        </DetailDrawer>
      ) : null}
      {commandPaletteOpen ? (
        <CommandPalette
          open
          onOpenChange={setCommandPaletteOpen}
          placeholder={t('foundation.command.placeholder')}
          commands={[
            {
              key: 'orders',
              label: t('foundation.command.orders'),
              onSelect: () => undefined,
            },
            {
              key: 'create',
              label: t('foundation.command.create'),
              onSelect: () => undefined,
            },
          ]}
        />
      ) : null}
    </Space>
  )
}
