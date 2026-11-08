import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DownloadOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { usePermissions } from '@/shared/auth/useAuthStore'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/shared/constants/enum'
import {
  EmployeeAvatar,
  MetricCard,
  MonthPicker,
  PageHeader,
  DetailDrawer,
  SectionCard,
  useFeedbackToast,
} from '@/shared/ui'

import { hrKeys } from '../api/hrKeys'
import {
  createBulkPayrollAdjustments,
  emailPayroll,
  listMyPayrolls,
  exportPayrollResults,
  finalizePayroll,
  markPayrollPaid,
  type PayrollAdjustment,
  type PayrollResult,
  type PayrollRun,
  type PayrollSettings,
  runPayroll,
  updatePayrollSettings,
} from '../api/hrTimeApi'
import {
  useEmployeeProfilesQuery,
  usePayrollAdjustmentsQuery,
  usePayrollResultsQuery,
  usePayrollRunsQuery,
  usePayrollSettingsQuery,
} from '../hooks'
import styles from './HrOperationsPage.module.scss'
import { PayslipStatement } from './PayslipStatement'

export function PayrollEmployeeCell({
  employee,
  fallbackLabel,
}: {
  employee?: PayrollResult['employee']
  fallbackLabel: string
}) {
  return (
    <Space>
      <EmployeeAvatar
        name={employee?.fullName || employee?.employeeCode || fallbackLabel}
        avatarUrl={employee?.avatarUrl}
        size={36}
      />
      <div>
        <Typography.Text strong>
          {employee?.fullName || employee?.employeeCode || fallbackLabel}
        </Typography.Text>
        {employee?.employeeCode && employee?.fullName && (
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            {employee.employeeCode}
          </Typography.Text>
        )}
      </div>
    </Space>
  )
}

export function PayrollPage({ workspace = 'personal' }: { workspace?: 'personal' | 'management' }) {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetId = searchParams.get('resourceId')
  const target = useQuery({
    queryKey: ['hr-payroll', 'notification-target', targetId],
    queryFn: () => listMyPayrolls({ resultId: targetId!, limit: 1 }),
    enabled: Boolean(targetId) && workspace === 'personal',
    retry: false,
  })
  const permissionsList = usePermissions()
  const permissions = useMemo(() => new Set(permissionsList), [permissionsList])
  const isManagement = workspace === 'management'
  const canRead = isManagement && permissions.has('HR_PAYROLL:READ')
  const canWrite = isManagement && permissions.has('HR_PAYROLL:WRITE')
  const canFinalize = isManagement && permissions.has('HR_PAYROLL:FINALIZE')
  const canPay = isManagement && permissions.has('HR_PAYROLL:PAY')
  const [month, setMonth] = useState(dayjs())
  const [editor, setEditor] = useState<'run' | 'adjustment' | 'settings'>()
  const [selectedResult, setSelectedResult] = useState<PayrollResult | null>(null)
  const [activeTab, setActiveTab] = useState<string>('staff')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINALIZED' | 'PAID'>('ALL')
  const [form] = Form.useForm()
  const [settingsForm] = Form.useForm()
  const toast = useFeedbackToast()
  const queryClient = useQueryClient()

  const params = useMemo(
    () => ({ month: month.month() + 1, year: month.year(), limit: 100 }),
    [month],
  )

  const runs = usePayrollRunsQuery(params, { enabled: canRead })
  const results = usePayrollResultsQuery(params, canRead)
  const adjustments = usePayrollAdjustmentsQuery(params, { enabled: canRead })
  const profiles = useEmployeeProfilesQuery(false, { enabled: canWrite })
  const settings = usePayrollSettingsQuery({ enabled: canRead })

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: hrKeys.payrollRoot }),
    [queryClient],
  )

  const run = useMutation({
    mutationFn: (values: object) =>
      runPayroll({ ...values, month: params.month, year: params.year }),
    onSuccess: () => {
      setEditor(undefined)
      toast('success', t('hrOperations.messages.payrollStarted'))
      void refresh()
    },
    onError: (error) =>
      toast(
        'error',
        t('hrOperations.messages.requestFailed'),
        error instanceof Error ? error.message : String(error),
      ),
  })

  const adjust = useMutation({
    mutationFn: (values: object) =>
      createBulkPayrollAdjustments({ ...values, month: params.month, year: params.year }),
    onSuccess: () => {
      setEditor(undefined)
      form.resetFields()
      toast('success', t('hrOperations.messages.adjustmentSaved'))
      void refresh()
    },
    onError: (error) =>
      toast(
        'error',
        t('hrOperations.messages.saveFailed'),
        error instanceof Error ? error.message : String(error),
      ),
  })

  const saveSettings = useMutation({
    mutationFn: (values: Partial<PayrollSettings>) =>
      updatePayrollSettings({
        ...values,
        expectedVersion: settings.data?.version || 0,
      }),
    onSuccess: () => {
      setEditor(undefined)
      toast('success', t('hrOperations.messages.payrollSettingsSaved'))
      void refresh()
    },
    onError: (error) =>
      toast(
        'error',
        t('hrOperations.messages.saveFailed'),
        error instanceof Error ? error.message : String(error),
      ),
  })

  const openSettings = useCallback(() => {
    settingsForm.setFieldsValue(settings.data)
    setEditor('settings')
  }, [settings.data, settingsForm])

  const openAdjustment = useCallback(() => {
    form.resetFields()
    form.setFieldsValue({ amount: 0 })
    setEditor('adjustment')
  }, [form])

  const lifecycle = useMutation({
    mutationFn: async ({
      action,
      item,
    }: {
      action: 'finalize' | 'pay' | 'email'
      item: PayrollRun
    }) => {
      if (action === 'finalize') return finalizePayroll(item.id, item.version)
      if (action === 'email') return emailPayroll(item.id)
      const page = await exportPayrollResults({ month: params.month, year: params.year })
      void page
      return markPayrollPaid(item.id, [], item.version)
    },
    onSuccess: () => {
      toast('success', t('hrOperations.messages.payrollUpdated'))
      void refresh()
    },
    onError: (error) =>
      toast(
        'error',
        t('hrOperations.messages.saveFailed'),
        error instanceof Error ? error.message : String(error),
      ),
  })

  const download = useCallback(async () => {
    const blob = (await exportPayrollResults({
      month: params.month,
      year: params.year,
    })) as unknown as Blob
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payroll-${params.year}-${params.month}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [params.month, params.year])

  const money = useCallback(
    (value?: number) =>
      new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US').format(value || 0),
    [i18n.language],
  )

  const payrollStatus = useCallback(
    (value?: string | null) =>
      value
        ? t(`hrOperations.payroll.statuses.${value}`, { defaultValue: value })
        : t('hrOperations.common.status'),
    [t],
  )

  const resultItems = useMemo(() => results.data?.items ?? [], [results.data?.items])
  const myPayslip = !canRead ? (targetId ? target.data?.items[0] : resultItems[0]) : null
  const payrollSummary = results.data?.summary

  const payrollTotals = useMemo(
    () => ({
      gross:
        payrollSummary?.amounts.grossIncome ??
        resultItems.reduce((sum, item) => sum + item.grossIncome, 0),
      deductions:
        payrollSummary?.amounts.totalDeductions ??
        resultItems.reduce((sum, item) => sum + item.totalDeductions, 0),
      net:
        payrollSummary?.amounts.netIncome ??
        resultItems.reduce((sum, item) => sum + item.netIncome, 0),
    }),
    [payrollSummary?.amounts, resultItems],
  )

  const filteredResultItems = useMemo(() => {
    let list = resultItems
    if (statusFilter !== 'ALL') {
      list = list.filter((item) => item.status === statusFilter)
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter((item) => {
        const name = (item.employee?.fullName || '').toLowerCase()
        const code = (item.employee?.employeeCode || '').toLowerCase()
        const dept = (item.employee?.departmentName || '').toLowerCase()
        const team = (item.employee?.teamName || '').toLowerCase()
        return name.includes(q) || code.includes(q) || dept.includes(q) || team.includes(q)
      })
    }
    return list
  }, [resultItems, statusFilter, searchText])

  const latestRun = runs.data?.items?.[0]

  const columns: TableColumnsType<PayrollResult> = useMemo(
    () => [
      {
        title: t('hrOperations.common.employee'),
        render: (_, item) => (
          <PayrollEmployeeCell
            employee={item.employee}
            fallbackLabel={t('hrOperations.common.me')}
          />
        ),
      },
      { title: t('hrOperations.payroll.workdays'), dataIndex: 'workDays' },
      {
        title: t('hrOperations.payroll.baseSalary'),
        dataIndex: 'baseSalary',
        render: (value) => <span className={styles.money}>{money(value)}</span>,
      },
      {
        title: t('hrOperations.payroll.gross'),
        dataIndex: 'grossIncome',
        render: (value) => <span className={styles.money}>{money(value)}</span>,
      },
      {
        title: t('hrOperations.payroll.deductions'),
        dataIndex: 'totalDeductions',
        render: (value) => money(value),
      },
      {
        title: t('hrOperations.payroll.net'),
        dataIndex: 'netIncome',
        render: (value) => <span className={styles.payrollNetCell}>{money(value)}</span>,
      },
      {
        title: t('hrOperations.common.status'),
        dataIndex: 'status',
        render: (value) => <Tag>{payrollStatus(value)}</Tag>,
      },
    ],
    [money, payrollStatus, t],
  )

  const periodColumns = useMemo(
    () => [
      {
        title: t('hrOperations.payroll.period'),
        render: (_: unknown, item: PayrollRun) => `${item.month}/${item.year}`,
      },
      {
        title: t('hrOperations.common.status'),
        dataIndex: 'status',
        render: (value: string) => <Tag>{payrollStatus(value)}</Tag>,
      },
      {
        title: '',
        render: (_: unknown, item: PayrollRun) => (
          <Space size={4}>
            {canFinalize && item.capabilities?.finalize && (
              <Button size="small" onClick={() => lifecycle.mutate({ action: 'finalize', item })}>
                {t('hrOperations.payroll.finalize')}
              </Button>
            )}
            {canPay && item.capabilities?.markPaid && (
              <Button
                size="small"
                type="primary"
                onClick={() => lifecycle.mutate({ action: 'pay', item })}
              >
                {t('hrOperations.payroll.paid')}
              </Button>
            )}
            {canWrite && (
              <Tooltip title={t('hrOperations.payroll.sendPayslips')}>
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  aria-label={t('hrOperations.payroll.sendPayslips')}
                  onClick={() => lifecycle.mutate({ action: 'email', item })}
                />
              </Tooltip>
            )}
          </Space>
        ),
      },
    ],
    [canFinalize, canPay, canWrite, lifecycle, payrollStatus, t],
  )

  const adjustmentColumns: TableColumnsType<PayrollAdjustment> = useMemo(
    () => [
      { title: t('hrOperations.common.name'), dataIndex: 'name' },
      {
        title: t('hrOperations.payroll.amount'),
        dataIndex: 'amount',
        render: (value) => money(value),
      },
      {
        title: t('hrOperations.common.status'),
        dataIndex: 'status',
        render: (value) => <Tag>{payrollStatus(value)}</Tag>,
      },
    ],
    [money, payrollStatus, t],
  )

  if (!canRead) {
    return (
      <section className={styles.page}>
        <PageHeader
          title={t('hrOperations.payroll.myTitle')}
          description={t('hrOperations.payroll.myDescription')}
          actions={
            <MonthPicker
              value={month}
              onChange={(value) => {
                if (!value) return
                setMonth(value)
                const next = new URLSearchParams(searchParams)
                next.delete('resourceId')
                setSearchParams(next, { replace: true })
              }}
            />
          }
        />
        {myPayslip ? (
          <PayslipStatement
            result={myPayslip}
            periodLabel={
              targetId
                ? myPayslip.inputSnapshot?.period
                  ? `${myPayslip.inputSnapshot.period.month}/${myPayslip.inputSnapshot.period.year}`
                  : '—'
                : month.format('MM/YYYY')
            }
            formatMoney={money}
          />
        ) : (
          <div style={{ maxWidth: 1080, marginInline: 'auto', width: '100%' }}>
            <SectionCard title={t('hrOperations.payroll.myPayroll')}>
              <Typography.Text type="secondary">
                {targetId
                  ? t('notifications.resourceUnavailable')
                  : t('hrOperations.payroll.emptyPayslip', { period: month.format('MM/YYYY') })}
              </Typography.Text>
            </SectionCard>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <section className={styles.payrollCommand}>
        <div className={styles.payrollCommandMain}>
          <Typography.Text className={styles.payrollEyebrow}>
            {t('hrOperations.payroll.period')}
          </Typography.Text>
          <Typography.Title level={2}>{month.format('MM/YYYY')}</Typography.Title>
          <Space wrap>
            <Tag>{payrollStatus(latestRun?.status)}</Tag>
            <Tag>{`${t('hrOperations.payroll.version')}: ${latestRun?.version ?? '-'}`}</Tag>
            <Tag>{`${t('hrOperations.payroll.results')}: ${payrollSummary?.total ?? resultItems.length}`}</Tag>
          </Space>
        </div>
        <div className={styles.payrollCommandActions}>
          <MonthPicker value={month} onChange={(value) => value && setMonth(value)} />
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={() => void download()}>
              {t('hrOperations.payroll.export')}
            </Button>
            {canWrite && (
              <>
                <Button
                  onClick={openSettings}
                  loading={settings.isLoading}
                  disabled={!settings.data}
                >
                  {t('hrOperations.payroll.settings')}
                </Button>
                <Button onClick={openAdjustment}>
                  {t('hrOperations.payroll.addBulkAdjustment')}
                </Button>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => setEditor('run')}
                >
                  {t('hrOperations.payroll.run')}
                </Button>
              </>
            )}
          </Space>
        </div>
      </section>

      <div className={styles.payrollSummaryGrid}>
        <MetricCard
          className={styles.payrollMetricPeople}
          label={t('hrOperations.payroll.employees')}
          value={String(payrollSummary?.total ?? resultItems.length)}
          variant="info"
        />
        <MetricCard
          className={styles.payrollMetricGross}
          label={t('hrOperations.payroll.gross')}
          value={money(payrollTotals.gross)}
          variant="success"
        />
        <MetricCard
          className={styles.payrollMetricDeductions}
          label={t('hrOperations.payroll.deductions')}
          value={money(payrollTotals.deductions)}
          variant="warning"
        />
        <MetricCard
          className={styles.payrollMetricNet}
          label={t('hrOperations.payroll.net')}
          value={money(payrollTotals.net)}
          variant="primary"
        />
      </div>

      <div className={styles.payrollWorkspace}>
        <div className={styles.payrollTabsContainer}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'staff',
                label: (
                  <span>
                    {t('hrOperations.payroll.staffPayroll')} ({filteredResultItems.length})
                  </span>
                ),
                children: (
                  <div>
                    <div className={styles.payrollSubToolbar}>
                      <div className={styles.payrollFilters}>
                        <Input
                          placeholder={t('hrOperations.payroll.searchPlaceholder', {
                            defaultValue: 'Tìm kiếm nhân viên, mã NV, phòng ban...',
                          })}
                          prefix={
                            <SearchOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />
                          }
                          allowClear
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          style={{ width: 280 }}
                        />
                        <Select
                          value={statusFilter}
                          onChange={setStatusFilter}
                          style={{ width: 170 }}
                          options={[
                            {
                              value: 'ALL',
                              label: `${t('hrOperations.common.all', { defaultValue: 'Tất cả' })} (${resultItems.length})`,
                            },
                            {
                              value: 'DRAFT',
                              label: `${payrollStatus('DRAFT')} (${payrollSummary?.statusCounts?.DRAFT ?? resultItems.filter((r) => r.status === 'DRAFT').length})`,
                            },
                            {
                              value: 'FINALIZED',
                              label: `${payrollStatus('FINALIZED')} (${payrollSummary?.statusCounts?.FINALIZED ?? resultItems.filter((r) => r.status === 'FINALIZED').length})`,
                            },
                            {
                              value: 'PAID',
                              label: `${payrollStatus('PAID')} (${payrollSummary?.statusCounts?.PAID ?? resultItems.filter((r) => r.status === 'PAID').length})`,
                            },
                          ]}
                        />
                      </div>
                      <div className={styles.payrollStatChips}>
                        <div
                          className={`${styles.payrollStatChip} ${styles.payrollStatChipSuccess}`}
                        >
                          <span>
                            {t('hrOperations.payroll.paidNet', { defaultValue: 'Đã chi trả' })}:
                          </span>
                          <strong>{money(payrollSummary?.amounts.paidNetIncome)}</strong>
                        </div>
                        <div
                          className={`${styles.payrollStatChip} ${styles.payrollStatChipWarning}`}
                        >
                          <span>
                            {t('hrOperations.payroll.unpaidNet', { defaultValue: 'Chưa chi trả' })}:
                          </span>
                          <strong>{money(payrollSummary?.amounts.unpaidNetIncome)}</strong>
                        </div>
                      </div>
                    </div>

                    <CoreDataTable
                      size="middle"
                      rowKey="id"
                      loading={results.isLoading}
                      dataSource={filteredResultItems}
                      scroll={{ x: 'max-content', y: 'calc(100vh - 430px)' }}
                      onRow={(record) => ({
                        onClick: () => setSelectedResult(record),
                        className: styles.payrollTableRowClickable,
                      })}
                      pagination={{
                        defaultPageSize: DEFAULT_PAGE_SIZE,
                        pageSizeOptions: PAGE_SIZE_OPTIONS,
                        hideOnSinglePage: false,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
                      }}
                      columns={columns}
                    />
                  </div>
                ),
              },
              {
                key: 'periods',
                label: (
                  <span>
                    {t('hrOperations.payroll.periods')} ({runs.data?.items?.length ?? 0})
                  </span>
                ),
                children: (
                  <CoreDataTable
                    size="middle"
                    rowKey="id"
                    loading={runs.isLoading}
                    dataSource={runs.data?.items}
                    pagination={false}
                    columns={periodColumns}
                  />
                ),
              },
              {
                key: 'adjustments',
                label: (
                  <span>
                    {t('hrOperations.payroll.adjustments')} ({adjustments.data?.items?.length ?? 0})
                  </span>
                ),
                children: (
                  <div>
                    <div className={styles.payrollSubToolbar}>
                      <Typography.Text type="secondary">
                        {t('hrOperations.payroll.adjustmentsSubLabel', {
                          defaultValue:
                            'Các khoản phụ cấp, thưởng và giảm trừ được áp dụng trong kỳ lương này.',
                        })}
                      </Typography.Text>
                      {canWrite && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={openAdjustment}>
                          {t('hrOperations.payroll.addBulkAdjustment')}
                        </Button>
                      )}
                    </div>
                    <CoreDataTable
                      size="middle"
                      rowKey="id"
                      loading={adjustments.isLoading}
                      dataSource={adjustments.data?.items}
                      scroll={{ x: 'max-content', y: 'calc(100vh - 430px)' }}
                      pagination={{
                        defaultPageSize: DEFAULT_PAGE_SIZE,
                        pageSizeOptions: PAGE_SIZE_OPTIONS,
                        hideOnSinglePage: false,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
                      }}
                      columns={adjustmentColumns}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
      <Modal
        width={editor === 'adjustment' ? 760 : 520}
        open={editor === 'run' || editor === 'adjustment'}
        title={t(
          editor === 'run' ? 'hrOperations.payroll.run' : 'hrOperations.payroll.addBulkAdjustment',
        )}
        footer={null}
        onCancel={() => setEditor(undefined)}
      >
        <Form
          className={styles.modalForm}
          form={form}
          layout="vertical"
          onFinish={(values) => (editor === 'run' ? run.mutate(values) : adjust.mutate(values))}
        >
          {editor === 'run' ? (
            <>
              <Typography.Title level={5} className={styles.modalSection}>
                {month.format('MM/YYYY')}
              </Typography.Title>
              <Form.Item name="shadow" label={t('hrOperations.payroll.mode')} initialValue={false}>
                <Select
                  options={[
                    { value: false, label: t('hrOperations.payroll.live') },
                    { value: true, label: t('hrOperations.payroll.shadow') },
                  ]}
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Alert showIcon type="info" message={t('hrOperations.payroll.bulkAdjustmentHelp')} />
              <Card size="small" title={t('hrOperations.payroll.employees')}>
                <Form.Item
                  name="profileIds"
                  label={t('hrOperations.common.employee')}
                  rules={[{ required: true }]}
                >
                  <Select
                    mode="multiple"
                    showSearch
                    maxTagCount="responsive"
                    optionFilterProp="label"
                    placeholder={t('hrOperations.payroll.selectEmployees')}
                    loading={profiles.isLoading}
                    options={profiles.data?.items.map((item) => ({
                      value: item.id,
                      label: `${item.fullName || item.employeeCode} · ${item.employeeCode}`,
                    }))}
                  />
                </Form.Item>
              </Card>
              <Card size="small" title={t('hrOperations.payroll.adjustmentDetails')}>
                <div className={styles.modalGrid}>
                  <Form.Item
                    name="type"
                    label={t('hrOperations.common.type')}
                    rules={[{ required: true }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={settings.data?.adjustmentTypes.map((value) => ({
                        value,
                        label: t(`hrOperations.payroll.adjustmentTypeValues.${value}`, {
                          defaultValue: value,
                        }),
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="code"
                    label={t('hrOperations.common.code')}
                    rules={[{ required: true }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={settings.data?.adjustmentCodes.map((value) => ({
                        value,
                        label: t(`hrOperations.payroll.adjustmentCodeValues.${value}`, {
                          defaultValue: value,
                        }),
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="name"
                    label={t('hrOperations.common.name')}
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="amount"
                    label={t('hrOperations.payroll.amount')}
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={0} className={styles.money} />
                  </Form.Item>
                  <Form.Item
                    className={styles.modalGridWide}
                    name="note"
                    label={t('hrOperations.common.note')}
                  >
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                </div>
              </Card>
            </>
          )}
          <Space className={styles.actions}>
            <Button onClick={() => setEditor(undefined)}>{t('hrOperations.common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={run.isPending || adjust.isPending}>
              {t('hrOperations.payroll.confirm')}
            </Button>
          </Space>
        </Form>
      </Modal>
      <Modal
        width={980}
        open={editor === 'settings'}
        title={t('hrOperations.payroll.settings')}
        footer={null}
        onCancel={() => setEditor(undefined)}
      >
        <Form
          className={styles.modalForm}
          form={settingsForm}
          layout="vertical"
          onFinish={(values) => saveSettings.mutate(values)}
        >
          <Tabs
            items={[
              {
                key: 'company',
                label: t('hrOperations.payroll.company'),
                children: (
                  <Card size="small">
                    <div className={styles.modalGrid}>
                      <Form.Item
                        className={styles.modalGridWide}
                        name={['company', 'name']}
                        label={t('hrOperations.payroll.companyName')}
                        rules={[{ required: true }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={['company', 'logoUrl']}
                        label={t('hrOperations.payroll.logoUrl')}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={['company', 'taxCode']}
                        label={t('hrOperations.payroll.taxCode')}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        className={styles.modalGridWide}
                        name={['company', 'address']}
                        label={t('hrOperations.payroll.companyAddress')}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={['company', 'payrollEmail']}
                        label={t('hrOperations.payroll.payrollEmail')}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={['company', 'payrollPhone']}
                        label={t('hrOperations.payroll.payrollPhone')}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={['company', 'currency']}
                        label={t('hrOperations.payroll.currency')}
                      >
                        <Input maxLength={3} />
                      </Form.Item>
                    </div>
                  </Card>
                ),
              },
              {
                key: 'calculation',
                label: t('hrOperations.payroll.calculationSettings'),
                children: (
                  <Card size="small">
                    <div className={styles.modalGrid}>
                      <Form.Item
                        name="workHoursPerDay"
                        label={t('hrOperations.payroll.workHoursPerDay')}
                      >
                        <InputNumber min={1} max={24} className={styles.money} />
                      </Form.Item>
                      <Form.Item
                        name="probationRateBasisPoints"
                        label={t('hrOperations.payroll.probationRate')}
                      >
                        <InputNumber min={0} className={styles.money} />
                      </Form.Item>
                      <Form.Item name="insuranceCap" label={t('hrOperations.payroll.insuranceCap')}>
                        <InputNumber min={0} className={styles.money} />
                      </Form.Item>
                      <Form.Item
                        name="personalDeduction"
                        label={t('hrOperations.payroll.personalDeduction')}
                      >
                        <InputNumber min={0} className={styles.money} />
                      </Form.Item>
                      <Form.Item
                        name="dependantDeduction"
                        label={t('hrOperations.payroll.dependantDeduction')}
                      >
                        <InputNumber min={0} className={styles.money} />
                      </Form.Item>
                    </div>
                  </Card>
                ),
              },
              {
                key: 'insurance',
                label: t('hrOperations.payroll.insuranceRates'),
                children: (
                  <Card size="small">
                    <div className={styles.modalGrid}>
                      {['social', 'health', 'unemployment'].map((key) => (
                        <Form.Item
                          key={key}
                          name={['insuranceRates', key]}
                          label={t(`hrOperations.payroll.insurance.${key}`)}
                        >
                          <InputNumber min={0} className={styles.money} />
                        </Form.Item>
                      ))}
                    </div>
                  </Card>
                ),
              },
              {
                key: 'overtime',
                label: t('hrOperations.payroll.overtimeRates'),
                children: (
                  <Card size="small">
                    <div className={styles.modalGrid}>
                      {[
                        'weekday',
                        'weekend',
                        'holiday',
                        'weekday_night',
                        'weekend_night',
                        'holiday_night',
                      ].map((key) => (
                        <Form.Item
                          key={key}
                          name={['otRateBasisPoints', key]}
                          label={t(`hrOperations.payroll.otRate.${key}`)}
                        >
                          <InputNumber min={0} className={styles.money} />
                        </Form.Item>
                      ))}
                    </div>
                  </Card>
                ),
              },
              {
                key: 'adjustments',
                label: t('hrOperations.payroll.adjustmentCatalog'),
                children: (
                  <Card size="small">
                    <div className={styles.modalGrid}>
                      <Form.Item
                        name="adjustmentTypes"
                        label={t('hrOperations.payroll.adjustmentTypes')}
                      >
                        <Select
                          mode="tags"
                          tokenSeparators={[',']}
                          options={settings.data?.adjustmentTypes.map((value) => ({
                            value,
                            label: t(`hrOperations.payroll.adjustmentTypeValues.${value}`, {
                              defaultValue: value,
                            }),
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        name="adjustmentCodes"
                        label={t('hrOperations.payroll.adjustmentCodes')}
                      >
                        <Select
                          mode="tags"
                          tokenSeparators={[',']}
                          options={settings.data?.adjustmentCodes.map((value) => ({
                            value,
                            label: t(`hrOperations.payroll.adjustmentCodeValues.${value}`, {
                              defaultValue: value,
                            }),
                          }))}
                        />
                      </Form.Item>
                    </div>
                  </Card>
                ),
              },
            ]}
          />
          <Space className={styles.actions}>
            <Button onClick={() => setEditor(undefined)}>{t('hrOperations.common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={saveSettings.isPending}>
              {t('hrOperations.common.save')}
            </Button>
          </Space>
        </Form>
      </Modal>
      <DetailDrawer
        title={
          <Space>
            <span>
              {t('hrOperations.payroll.payslipDetail', { defaultValue: 'Phiếu lương chi tiết' })}
            </span>
            {selectedResult?.employee?.fullName && (
              <Tag color="blue">{selectedResult.employee.fullName}</Tag>
            )}
            {selectedResult?.employee?.employeeCode && (
              <Tag>{selectedResult.employee.employeeCode}</Tag>
            )}
          </Space>
        }
        width="min(1280px, 92vw)"
        drawerWidth={760}
        open={Boolean(selectedResult)}
        onClose={() => setSelectedResult(null)}
        destroyOnClose
        allowModeToggle
        allowMaximize
      >
        {selectedResult && (
          <PayslipStatement
            result={selectedResult}
            periodLabel={month.format('MM/YYYY')}
            formatMoney={money}
          />
        )}
      </DetailDrawer>
    </section>
  )
}

export default PayrollPage
