import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadOutlined, MailOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'
import {
  EmployeeAvatar,
  MetricCard,
  MonthPicker,
  PageHeader,
  SectionCard,
  useFeedbackToast,
} from '@/shared/ui'

import { loadEmployeeProfiles } from '../api/hrApi'
import {
  createBulkPayrollAdjustments,
  emailPayroll,
  exportPayrollResults,
  finalizePayroll,
  getPayrollSettings,
  listMyPayrolls,
  listPayrollAdjustments,
  listPayrollResults,
  listPayrolls,
  markPayrollPaid,
  type PayrollResult,
  type PayrollRun,
  type PayrollSettings,
  runPayroll,
  updatePayrollSettings,
} from '../api/hrTimeApi'
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
        name={employee?.fullName || employee?.employeeCode}
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

export function PayrollPage() {
  const { t, i18n } = useTranslation()
  const permissions = new Set(getPermissions())
  const canRead = permissions.has('HR_PAYROLL:READ')
  const canWrite = permissions.has('HR_PAYROLL:WRITE')
  const canFinalize = permissions.has('HR_PAYROLL:FINALIZE')
  const canPay = permissions.has('HR_PAYROLL:PAY')
  const [month, setMonth] = useState(dayjs())
  const [editor, setEditor] = useState<'run' | 'adjustment' | 'settings'>()
  const [form] = Form.useForm()
  const [settingsForm] = Form.useForm()
  const toast = useFeedbackToast()
  const queryClient = useQueryClient()
  const params = { month: month.month() + 1, year: month.year(), limit: 100 }
  const runs = useQuery({
    queryKey: ['hr-payroll', 'runs', params.month, params.year],
    queryFn: () => listPayrolls(params),
    enabled: canRead,
  })
  const results = useQuery({
    queryKey: ['hr-payroll', 'results', params.month, params.year],
    queryFn: () => (canRead ? listPayrollResults(params) : listMyPayrolls(params)),
  })
  const adjustments = useQuery({
    queryKey: ['hr-payroll', 'adjustments', params.month, params.year],
    queryFn: () => listPayrollAdjustments(params),
    enabled: canRead,
  })
  const profiles = useQuery({
    queryKey: ['hr', 'employee-profiles', false],
    queryFn: () => loadEmployeeProfiles(false),
    enabled: canWrite,
  })
  const settings = useQuery({
    queryKey: ['hr-payroll', 'settings'],
    queryFn: getPayrollSettings,
    enabled: canRead,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hr-payroll'] })
  const run = useMutation({
    mutationFn: (values: object) =>
      runPayroll({ ...values, month: params.month, year: params.year }),
    onSuccess: () => {
      setEditor(undefined)
      toast('success', t('hrOperations.messages.payrollStarted'))
      void refresh()
    },
    onError: (error) => toast('error', t('hrOperations.messages.requestFailed'), error.message),
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
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
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
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })
  const openSettings = () => {
    settingsForm.setFieldsValue(settings.data)
    setEditor('settings')
  }
  const openAdjustment = () => {
    form.resetFields()
    form.setFieldsValue({ amount: 0 })
    setEditor('adjustment')
  }
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
      const page = await listPayrollResults({ payrollRunId: item.id, limit: 100 })
      return markPayrollPaid(
        item.id,
        page.items.map(({ id }) => id),
        item.version,
      )
    },
    onSuccess: () => {
      toast('success', t('hrOperations.messages.payrollUpdated'))
      void refresh()
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })
  const download = async () => {
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
  }
  const money = (value?: number) =>
    new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US').format(value || 0)
  const resultItems = results.data?.items ?? []
  const myPayslip = !canRead ? resultItems[0] : null
  const payrollSummary = results.data?.summary
  const payrollTotals = {
    gross:
      payrollSummary?.amounts.grossIncome ??
      resultItems.reduce((sum, item) => sum + item.grossIncome, 0),
    deductions:
      payrollSummary?.amounts.totalDeductions ??
      resultItems.reduce((sum, item) => sum + item.totalDeductions, 0),
    net:
      payrollSummary?.amounts.netIncome ??
      resultItems.reduce((sum, item) => sum + item.netIncome, 0),
  }
  const statusCounts = payrollSummary?.statusCounts ?? {}
  const statusRows = ['DRAFT', 'FINALIZED', 'PAID'].map((status) => ({
    status,
    count: statusCounts[status] ?? resultItems.filter((item) => item.status === status).length,
  }))
  const latestRun = runs.data?.items?.[0]

  if (!canRead) {
    return (
      <section className={styles.page}>
        <PageHeader
          title={t('hrOperations.payroll.myTitle')}
          description={t('hrOperations.payroll.myDescription')}
          actions={<MonthPicker value={month} onChange={(value) => value && setMonth(value)} />}
        />
        {myPayslip ? (
          <PayslipStatement
            result={myPayslip}
            periodLabel={month.format('MM/YYYY')}
            formatMoney={money}
          />
        ) : (
          <SectionCard title={t('hrOperations.payroll.myPayroll')}>
            <Typography.Text type="secondary">
              {t('hrOperations.payroll.emptyPayslip', { period: month.format('MM/YYYY') })}
            </Typography.Text>
          </SectionCard>
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
            <Tag>{latestRun?.status ?? t('hrOperations.common.status')}</Tag>
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
        <div className={styles.payrollPrimary}>
          <SectionCard
            title={t(
              canRead ? 'hrOperations.payroll.staffPayroll' : 'hrOperations.payroll.myPayroll',
            )}
          >
            <Table
              size="small"
              rowKey="id"
              loading={results.isLoading}
              dataSource={resultItems}
              pagination={{ pageSize: 12 }}
              columns={[
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
                { title: t('hrOperations.common.status'), dataIndex: 'status' },
              ]}
            />
          </SectionCard>
        </div>

        <aside className={styles.payrollSide}>
          <SectionCard title={t('hrOperations.payroll.resultSummary')}>
            <div className={styles.payrollBreakdown}>
              {statusRows.map((item) => (
                <div
                  className={`${styles.payrollBreakdownRow} ${styles[`payrollStatus${item.status}`]}`}
                  key={item.status}
                >
                  <span>
                    <Tag>{item.status}</Tag>
                  </span>
                  <strong>{item.count}</strong>
                </div>
              ))}
              <div className={styles.payrollBreakdownMoney}>
                <span>{t('hrOperations.payroll.paidNet')}</span>
                <strong>{money(payrollSummary?.amounts.paidNetIncome)}</strong>
              </div>
              <div className={styles.payrollBreakdownMoney}>
                <span>{t('hrOperations.payroll.unpaidNet')}</span>
                <strong>{money(payrollSummary?.amounts.unpaidNetIncome)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('hrOperations.payroll.periods')}>
            <Table
              size="small"
              rowKey="id"
              loading={runs.isLoading}
              dataSource={runs.data?.items}
              pagination={false}
              columns={[
                {
                  title: t('hrOperations.payroll.period'),
                  render: (_, item: PayrollRun) => `${item.month}/${item.year}`,
                },
                {
                  title: t('hrOperations.common.status'),
                  dataIndex: 'status',
                  render: (value) => <Tag>{value}</Tag>,
                },
                {
                  title: '',
                  render: (_, item: PayrollRun) => (
                    <Space size={4}>
                      {canFinalize && item.capabilities?.finalize && (
                        <Button
                          size="small"
                          onClick={() => lifecycle.mutate({ action: 'finalize', item })}
                        >
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
                        <Button
                          type="text"
                          icon={<MailOutlined />}
                          onClick={() => lifecycle.mutate({ action: 'email', item })}
                        />
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </SectionCard>

          <SectionCard title={t('hrOperations.payroll.adjustments')}>
            <Table
              size="small"
              rowKey="id"
              loading={adjustments.isLoading}
              dataSource={adjustments.data?.items}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: t('hrOperations.common.name'), dataIndex: 'name' },
                {
                  title: t('hrOperations.payroll.amount'),
                  dataIndex: 'amount',
                  render: (value) => money(value),
                },
                { title: t('hrOperations.common.status'), dataIndex: 'status' },
              ]}
            />
          </SectionCard>
        </aside>
      </div>
      <Modal
        centered
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
              <Alert
                showIcon
                type="info"
                message={t('hrOperations.payroll.bulkAdjustmentHelp', {
                  defaultValue:
                    'Create the same payroll adjustment for every selected employee in this period.',
                })}
              />
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
                    placeholder={t('hrOperations.payroll.selectEmployees', {
                      defaultValue: 'Select employees',
                    })}
                    loading={profiles.isLoading}
                    options={profiles.data?.items.map((item) => ({
                      value: item.id,
                      label: `${item.fullName || item.employeeCode} · ${item.employeeCode}`,
                    }))}
                  />
                </Form.Item>
              </Card>
              <Card
                size="small"
                title={t('hrOperations.payroll.adjustmentDetails', {
                  defaultValue: 'Adjustment details',
                })}
              >
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
                        label: value,
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
                        label: value,
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
        centered
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
                label: t('hrOperations.payroll.insuranceRates', {
                  defaultValue: 'Insurance rates',
                }),
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
                label: t('hrOperations.payroll.overtimeRates', {
                  defaultValue: 'Overtime rates',
                }),
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
                label: t('hrOperations.payroll.adjustmentCatalog', {
                  defaultValue: 'Adjustment catalog',
                }),
                children: (
                  <Card size="small">
                    <div className={styles.modalGrid}>
                      <Form.Item
                        name="adjustmentTypes"
                        label={t('hrOperations.payroll.adjustmentTypes')}
                      >
                        <Select mode="tags" tokenSeparators={[',']} />
                      </Form.Item>
                      <Form.Item
                        name="adjustmentCodes"
                        label={t('hrOperations.payroll.adjustmentCodes')}
                      >
                        <Select mode="tags" tokenSeparators={[',']} />
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
    </section>
  )
}
