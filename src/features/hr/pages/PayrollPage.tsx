import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadOutlined, MailOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from 'antd'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'
import { MetricCard, MonthPicker, SectionCard, useFeedbackToast } from '@/shared/ui'

import { loadEmployeeProfiles } from '../api/hrApi'
import {
  createPayrollAdjustment,
  emailPayroll,
  exportPayrollResults,
  finalizePayroll,
  listMyPayrolls,
  listPayrollAdjustments,
  listPayrollResults,
  listPayrolls,
  markPayrollPaid,
  type PayrollRun,
  runPayroll,
} from '../api/hrTimeApi'
import styles from './HrOperationsPage.module.scss'

export function PayrollPage() {
  const { t, i18n } = useTranslation()
  const permissions = new Set(getPermissions())
  const canRead = permissions.has('HR_PAYROLL:READ')
  const canWrite = permissions.has('HR_PAYROLL:WRITE')
  const canFinalize = permissions.has('HR_PAYROLL:FINALIZE')
  const canPay = permissions.has('HR_PAYROLL:PAY')
  const [month, setMonth] = useState(dayjs())
  const [editor, setEditor] = useState<'run' | 'adjustment'>()
  const [form] = Form.useForm()
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
      createPayrollAdjustment({ ...values, month: params.month, year: params.year }),
    onSuccess: () => {
      setEditor(undefined)
      form.resetFields()
      toast('success', t('hrOperations.messages.adjustmentSaved'))
      void refresh()
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })
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
  const money = (value: number) =>
    new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US').format(value || 0)
  const resultItems = results.data?.items ?? []

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <MonthPicker value={month} onChange={(value) => value && setMonth(value)} />
        <Space>
          {canRead && (
            <Button icon={<DownloadOutlined />} onClick={() => void download()}>
              {t('hrOperations.payroll.export')}
            </Button>
          )}
          {canWrite && (
            <>
              <Button onClick={() => setEditor('adjustment')}>
                {t('hrOperations.payroll.addAdjustment')}
              </Button>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setEditor('run')}>
                {t('hrOperations.payroll.run')}
              </Button>
            </>
          )}
        </Space>
      </div>
      <div className={styles.metrics}>
        <MetricCard
          label={t('hrOperations.payroll.employees')}
          value={String(resultItems.length)}
        />
        <MetricCard
          label={t('hrOperations.payroll.gross')}
          value={money(resultItems.reduce((sum, item) => sum + item.grossIncome, 0))}
        />
        <MetricCard
          label={t('hrOperations.payroll.deductions')}
          value={money(resultItems.reduce((sum, item) => sum + item.totalDeductions, 0))}
        />
        <MetricCard
          label={t('hrOperations.payroll.net')}
          value={money(resultItems.reduce((sum, item) => sum + item.netIncome, 0))}
        />
      </div>
      {canRead && (
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
              { title: t('hrOperations.payroll.results'), dataIndex: 'resultCount' },
              { title: t('hrOperations.payroll.version'), dataIndex: 'version' },
              {
                title: '',
                render: (_, item: PayrollRun) => (
                  <Space>
                    {canFinalize && item.capabilities?.finalize && (
                      <Button onClick={() => lifecycle.mutate({ action: 'finalize', item })}>
                        {t('hrOperations.payroll.finalize')}
                      </Button>
                    )}
                    {canPay && item.capabilities?.markPaid && (
                      <Button
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
      )}
      <SectionCard
        title={t(canRead ? 'hrOperations.payroll.staffPayroll' : 'hrOperations.payroll.myPayroll')}
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
              render: (_, item) =>
                item.employee?.fullName ||
                item.employee?.employeeCode ||
                t('hrOperations.common.me'),
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
              render: (value) => <span className={styles.money}>{money(value)}</span>,
            },
            { title: t('hrOperations.common.status'), dataIndex: 'status' },
          ]}
        />
      </SectionCard>
      {canRead && (
        <SectionCard title={t('hrOperations.payroll.adjustments')}>
          <Table
            size="small"
            rowKey="id"
            loading={adjustments.isLoading}
            dataSource={adjustments.data?.items}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: t('hrOperations.common.employee'), dataIndex: 'profileId' },
              { title: t('hrOperations.common.type'), dataIndex: 'type' },
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
      )}
      <Modal
        centered
        open={Boolean(editor)}
        title={t(
          editor === 'run' ? 'hrOperations.payroll.run' : 'hrOperations.payroll.addAdjustment',
        )}
        footer={null}
        onCancel={() => setEditor(undefined)}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => (editor === 'run' ? run.mutate(values) : adjust.mutate(values))}
        >
          {editor === 'run' ? (
            <Form.Item name="shadow" label={t('hrOperations.payroll.mode')} initialValue={false}>
              <Select
                options={[
                  { value: false, label: t('hrOperations.payroll.live') },
                  { value: true, label: t('hrOperations.payroll.shadow') },
                ]}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="profileId"
                label={t('hrOperations.common.employee')}
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={profiles.data?.items.map((item) => ({
                    value: item.id,
                    label: `${item.fullName} · ${item.employeeCode}`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="type"
                label={t('hrOperations.common.type')}
                rules={[{ required: true }]}
              >
                <Select
                  options={['EARNING', 'ALLOWANCE', 'DEDUCTION'].map((value) => ({ value }))}
                />
              </Form.Item>
              <Form.Item
                name="code"
                label={t('hrOperations.common.code')}
                rules={[{ required: true }]}
              >
                <Select
                  options={['BONUS', 'PENALTY', 'ADVANCE', 'ARREARS', 'OTHER'].map((value) => ({
                    value,
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
              <Form.Item name="note" label={t('hrOperations.common.note')}>
                <Input />
              </Form.Item>
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
    </section>
  )
}
