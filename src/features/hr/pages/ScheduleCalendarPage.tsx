import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from 'antd'
import dayjs from 'dayjs'

import { loadTeams } from '@/features/organization/api/organizationApi'
import { getPermissions } from '@/shared/auth/session'
import { DateTimePicker, MonthPicker, SectionCard, useFeedbackToast } from '@/shared/ui'

import { loadEmployeeProfiles } from '../api/hrApi'
import {
  createCalendarOverride,
  createHoliday,
  createShift,
  createShiftAssignment,
  createWorkLocation,
  generateSaturdayRotations,
  type Holiday,
  listCalendarOverrides,
  listHolidays,
  listSaturdayRotations,
  listShiftAssignments,
  listShifts,
  listWorkLocations,
  type Shift,
  updateHoliday,
  updateShift,
  updateWorkLocation,
  type WorkLocation,
} from '../api/hrOperationsApi'
import styles from './ScheduleCalendarPage.module.scss'

type Editor = {
  kind: 'location' | 'shift' | 'assignment' | 'override' | 'holiday' | 'rotation'
  item?: WorkLocation | Shift | Holiday
}
type Values = Record<string, string | number | string[] | null | undefined>

export function ScheduleCalendarPage() {
  const { t } = useTranslation()
  const permissions = new Set(getPermissions())
  const canScheduleWrite = permissions.has('HR_SCHEDULE:WRITE')
  const canCalendarWrite = permissions.has('HR_CALENDAR:WRITE')
  const [month, setMonth] = useState(dayjs())
  const [editor, setEditor] = useState<Editor>()
  const [form] = Form.useForm<Values>()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const monthParams = { month: month.month() + 1, year: month.year() }
  const range = {
    dateFrom: month.startOf('month').format('YYYY-MM-DD'),
    dateTo: month.endOf('month').format('YYYY-MM-DD'),
    limit: 100,
  }
  const locations = useQuery({
    queryKey: ['hr-operations', 'locations'],
    queryFn: () => listWorkLocations({ limit: 100 }),
  })
  const shifts = useQuery({
    queryKey: ['hr-operations', 'shifts'],
    queryFn: () => listShifts({ limit: 100 }),
  })
  const assignments = useQuery({
    queryKey: ['hr-operations', 'assignments'],
    queryFn: () => listShiftAssignments({ limit: 100 }),
  })
  const overrides = useQuery({
    queryKey: ['hr-operations', 'overrides', range.dateFrom],
    queryFn: () =>
      listCalendarOverrides({
        effectiveFrom: range.dateFrom,
        effectiveTo: range.dateTo,
        limit: 100,
      }),
  })
  const holidays = useQuery({
    queryKey: ['hr-operations', 'holidays', range.dateFrom],
    queryFn: () => listHolidays(range),
  })
  const rotations = useQuery({
    queryKey: ['hr-operations', 'rotations', monthParams],
    queryFn: () => listSaturdayRotations({ ...monthParams, limit: 100 }),
  })
  const profiles = useQuery({
    queryKey: ['hr', 'employee-profiles', false],
    queryFn: () => loadEmployeeProfiles(false),
    enabled: canScheduleWrite,
  })
  const teams = useQuery({
    queryKey: ['organization', 'teams'],
    queryFn: loadTeams,
    enabled: canCalendarWrite,
  })
  const employeeOptions = useMemo(
    () =>
      (profiles.data?.items ?? []).map((profile) => ({
        value: profile.id,
        label: `${profile.fullName || profile.employeeCode} · ${profile.employeeCode}`,
      })),
    [profiles.data],
  )

  const openEditor = (next: Editor) => {
    form.resetFields()
    if (next.item) form.setFieldsValue(next.item as Values)
    setEditor(next)
  }
  const save = useMutation({
    mutationFn: async (values: Values) => {
      if (!editor) return
      if (editor.kind === 'location')
        return editor.item ? updateWorkLocation(editor.item.id, values) : createWorkLocation(values)
      if (editor.kind === 'shift')
        return editor.item ? updateShift(editor.item.id, values) : createShift(values)
      if (editor.kind === 'assignment') return createShiftAssignment(values)
      if (editor.kind === 'override')
        return createCalendarOverride({
          ...values,
          scopeId: values.scopeType === 'GLOBAL' ? null : String(values.scopeId),
        })
      if (editor.kind === 'holiday')
        return editor.item ? updateHoliday(editor.item.id, values) : createHoliday(values)
      return generateSaturdayRotations({
        teamId: String(values.teamId),
        ...monthParams,
        minPresent: Number(values.minPresent ?? 1),
      })
    },
    onSuccess: () => {
      setEditor(undefined)
      form.resetFields()
      toast('success', t('hrOperations.messages.saved'))
      void queryClient.invalidateQueries({ queryKey: ['hr-operations'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })
  const required = [{ required: true, message: t('hrOperations.common.required') }]
  const title = (kind?: Editor['kind']) =>
    t(
      `hrOperations.schedule.${kind === 'location' ? 'locationEditor' : kind === 'shift' ? 'shiftEditor' : kind === 'assignment' ? 'assignmentEditor' : kind === 'override' ? 'overrideEditor' : kind === 'holiday' ? 'holidayEditor' : 'rotationEditor'}`,
    )

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <MonthPicker value={month} onChange={(value) => value && setMonth(value)} />
      </div>
      <div className={styles.grid}>
        <SectionCard title={t('hrOperations.schedule.workLocations')}>
          {canScheduleWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEditor({ kind: 'location' })}
            >
              {t('hrOperations.schedule.addLocation')}
            </Button>
          )}
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            loading={locations.isLoading}
            dataSource={locations.data?.items}
            columns={[
              { title: t('hrOperations.common.location'), dataIndex: 'name' },
              { title: t('hrOperations.common.timezone'), dataIndex: 'timezone' },
              {
                title: t('hrOperations.common.status'),
                dataIndex: 'status',
                render: (value) => (
                  <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value}</Tag>
                ),
              },
              ...(canScheduleWrite
                ? [
                    {
                      title: '',
                      width: 44,
                      render: (_: unknown, item: WorkLocation) => (
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => openEditor({ kind: 'location', item })}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </SectionCard>
        <SectionCard title={t('hrOperations.schedule.shifts')}>
          {canScheduleWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEditor({ kind: 'shift' })}
            >
              {t('hrOperations.schedule.addShift')}
            </Button>
          )}
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            loading={shifts.isLoading}
            dataSource={shifts.data?.items}
            columns={[
              {
                title: t('hrOperations.schedule.shift'),
                render: (_, item: Shift) => `${item.name} (${item.code})`,
              },
              {
                title: t('hrOperations.schedule.hours'),
                render: (_, item: Shift) => `${item.startTime}-${item.endTime}`,
              },
              {
                title: t('hrOperations.schedule.break'),
                dataIndex: 'breakMinutes',
                render: (value) => `${value}m`,
              },
              ...(canScheduleWrite
                ? [
                    {
                      title: '',
                      width: 44,
                      render: (_: unknown, item: Shift) => (
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => openEditor({ kind: 'shift', item })}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </SectionCard>
      </div>
      <SectionCard title={t('hrOperations.schedule.assignments')}>
        {canScheduleWrite && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEditor({ kind: 'assignment' })}
          >
            {t('hrOperations.schedule.assignShift')}
          </Button>
        )}
        <Table
          size="small"
          pagination={{ pageSize: 8 }}
          rowKey="id"
          loading={assignments.isLoading}
          dataSource={assignments.data?.items}
          columns={[
            {
              title: t('hrOperations.common.employee'),
              render: (_, item) =>
                item.employee?.fullName || item.employee?.employeeCode || item.profileId,
            },
            {
              title: t('hrOperations.schedule.shift'),
              render: (_, item) => item.shift?.name || item.shiftId,
            },
            {
              title: t('hrOperations.common.location'),
              render: (_, item) => item.workLocation?.name || item.workLocationId,
            },
            {
              title: t('hrOperations.schedule.effective'),
              render: (_, item) => `${item.effectiveFrom} → ${item.effectiveTo || '∞'}`,
            },
            { title: t('hrOperations.common.status'), dataIndex: 'status' },
          ]}
        />
      </SectionCard>
      <div className={styles.grid}>
        <SectionCard title={t('hrOperations.schedule.holidays')}>
          {canCalendarWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEditor({ kind: 'holiday' })}
            >
              {t('hrOperations.schedule.addHoliday')}
            </Button>
          )}
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            loading={holidays.isLoading}
            dataSource={holidays.data?.items}
            columns={[
              { title: t('hrOperations.common.date'), dataIndex: 'dateKey' },
              { title: t('hrOperations.common.name'), dataIndex: 'name' },
              { title: t('hrOperations.common.type'), dataIndex: 'holidayType' },
              ...(canCalendarWrite
                ? [
                    {
                      title: '',
                      width: 44,
                      render: (_: unknown, item: Holiday) => (
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => openEditor({ kind: 'holiday', item })}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </SectionCard>
        <SectionCard title={t('hrOperations.schedule.overrides')}>
          {canScheduleWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEditor({ kind: 'override' })}
            >
              {t('hrOperations.schedule.addOverride')}
            </Button>
          )}
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            loading={overrides.isLoading}
            dataSource={overrides.data?.items}
            columns={[
              { title: t('hrOperations.common.date'), dataIndex: 'dateKey' },
              { title: t('hrOperations.common.name'), dataIndex: 'name' },
              { title: t('hrOperations.common.type'), dataIndex: 'kind' },
              { title: t('hrOperations.common.scope'), dataIndex: 'scopeType' },
            ]}
          />
        </SectionCard>
        <SectionCard title={t('hrOperations.schedule.saturday')}>
          {canCalendarWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEditor({ kind: 'rotation' })}
            >
              {t('hrOperations.schedule.generateMonth')}
            </Button>
          )}
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            loading={rotations.isLoading}
            dataSource={rotations.data?.items}
            columns={[
              { title: t('hrOperations.common.date'), dataIndex: 'dateKey' },
              { title: t('hrOperations.common.team'), dataIndex: 'teamId' },
              {
                title: t('hrOperations.schedule.staffCount'),
                render: (_, item) => item.employeeProfileIds.length,
              },
              { title: t('hrOperations.common.source'), dataIndex: 'source' },
            ]}
          />
        </SectionCard>
      </div>
      <Modal
        centered
        open={Boolean(editor)}
        title={title(editor?.kind)}
        footer={null}
        onCancel={() => setEditor(undefined)}
      >
        <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
          {editor?.kind === 'location' && (
            <>
              <Form.Item name="code" label={t('hrOperations.common.code')} rules={required}>
                <Input />
              </Form.Item>
              <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
                <Input />
              </Form.Item>
              <Form.Item
                name="timezone"
                label={t('hrOperations.common.timezone')}
                initialValue="Asia/Ho_Chi_Minh"
                rules={required}
              >
                <Input />
              </Form.Item>
            </>
          )}
          {editor?.kind === 'shift' && (
            <>
              <Form.Item name="code" label={t('hrOperations.common.code')} rules={required}>
                <Input />
              </Form.Item>
              <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
                <Input />
              </Form.Item>
              <Form.Item name="workLocationId" label={t('hrOperations.common.location')}>
                <Select
                  allowClear
                  options={locations.data?.items.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
              </Form.Item>
              <Space>
                <Form.Item
                  name="startTime"
                  label={t('hrOperations.schedule.start')}
                  rules={required}
                >
                  <DateTimePicker mode="time" />
                </Form.Item>
                <Form.Item name="endTime" label={t('hrOperations.schedule.end')} rules={required}>
                  <DateTimePicker mode="time" />
                </Form.Item>
              </Space>
              <Space>
                <Form.Item name="breakMinutes" label={t('hrOperations.schedule.breakMinutes')}>
                  <InputNumber min={0} />
                </Form.Item>
                <Form.Item name="graceMinutes" label={t('hrOperations.schedule.graceMinutes')}>
                  <InputNumber min={0} />
                </Form.Item>
              </Space>
            </>
          )}
          {editor?.kind === 'assignment' && (
            <>
              <Form.Item
                name="profileId"
                label={t('hrOperations.common.employee')}
                rules={required}
              >
                <Select showSearch optionFilterProp="label" options={employeeOptions} />
              </Form.Item>
              <Form.Item name="shiftId" label={t('hrOperations.schedule.shift')} rules={required}>
                <Select
                  options={shifts.data?.items.map((item) => ({ value: item.id, label: item.name }))}
                />
              </Form.Item>
              <Form.Item
                name="workLocationId"
                label={t('hrOperations.common.location')}
                rules={required}
              >
                <Select
                  options={locations.data?.items.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="effectiveFrom"
                label={t('hrOperations.common.from')}
                rules={required}
              >
                <DateTimePicker mode="date" />
              </Form.Item>
              <Form.Item name="effectiveTo" label={t('hrOperations.common.to')}>
                <DateTimePicker mode="date" />
              </Form.Item>
            </>
          )}
          {editor?.kind === 'override' && (
            <>
              <Form.Item name="dateKey" label={t('hrOperations.common.date')} rules={required}>
                <DateTimePicker mode="date" />
              </Form.Item>
              <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
                <Input />
              </Form.Item>
              <Form.Item name="kind" label={t('hrOperations.common.type')} rules={required}>
                <Select
                  options={['HOLIDAY', 'REST_DAY', 'WORKING_DAY'].map((value) => ({ value }))}
                />
              </Form.Item>
              <Form.Item
                name="scopeType"
                label={t('hrOperations.common.scope')}
                initialValue="GLOBAL"
                rules={required}
              >
                <Select
                  options={['GLOBAL', 'WORK_LOCATION', 'DEPARTMENT', 'TEAM', 'PROFILE'].map(
                    (value) => ({ value }),
                  )}
                />
              </Form.Item>
            </>
          )}
          {editor?.kind === 'holiday' && (
            <>
              <Form.Item name="dateKey" label={t('hrOperations.common.date')} rules={required}>
                <DateTimePicker mode="date" />
              </Form.Item>
              <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
                <Input />
              </Form.Item>
              <Form.Item
                name="holidayType"
                label={t('hrOperations.common.type')}
                initialValue="PUBLIC_HOLIDAY"
              >
                <Select
                  options={['PUBLIC_HOLIDAY', 'SUBSTITUTE_WORK_DAY'].map((value) => ({ value }))}
                />
              </Form.Item>
              <Form.Item name="note" label={t('hrOperations.common.note')}>
                <Input />
              </Form.Item>
            </>
          )}
          {editor?.kind === 'rotation' && (
            <>
              <Form.Item name="teamId" label={t('hrOperations.common.team')} rules={required}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={teams.data?.items.map((item) => ({ value: item.id, label: item.name }))}
                />
              </Form.Item>
              <Form.Item
                name="minPresent"
                label={t('hrOperations.schedule.minimumStaff')}
                initialValue={1}
              >
                <InputNumber min={0} />
              </Form.Item>
            </>
          )}
          <Space className={styles.actions}>
            <Button onClick={() => setEditor(undefined)}>{t('hrOperations.common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={save.isPending}>
              {t('hrOperations.common.save')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </section>
  )
}
