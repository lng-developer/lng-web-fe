import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { loadTeams } from '@/features/organization/api/organizationApi'
import { getPermissions } from '@/shared/auth/session'
import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import {
  DateTimePicker,
  FormActions,
  MetricCard,
  MonthPicker,
  PageHeader,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import { loadEmployeeProfiles } from '../api/hrApi'
import {
  createCalendarOverride,
  createHoliday,
  createSaturdayRotation,
  createShift,
  createShiftAssignment,
  createWorkLocation,
  deleteSaturdayRotation,
  deleteTeamSaturdayRotations,
  generateSaturdayRotations,
  type Holiday,
  listCalendarOverrides,
  listHolidays,
  listSaturdayRotations,
  listShiftAssignments,
  listShifts,
  listWorkLocations,
  type SaturdayRotation,
  type Shift,
  updateHoliday,
  updateSaturdayRotation,
  updateShift,
  updateWorkLocation,
  type WorkLocation,
} from '../api/hrOperationsApi'
import styles from './ScheduleCalendarPage.module.scss'

type Editor = {
  kind: 'location' | 'shift' | 'assignment' | 'override' | 'holiday' | 'rotation' | 'rotationManual'
  item?: WorkLocation | Shift | Holiday | SaturdayRotation
}
type RotationOffByDate = Record<string, string[]>
type Values = Record<
  string,
  string | number | string[] | RotationOffByDate | dayjs.Dayjs | null | undefined
>

export function ScheduleCalendarPage() {
  const { t } = useTranslation()
  const permissions = new Set(getPermissions())
  const canScheduleWrite = permissions.has('HR_SCHEDULE:WRITE')
  const canCalendarWrite = permissions.has('HR_CALENDAR:WRITE')
  const canCalendarRead = permissions.has('HR_CALENDAR:READ') || canCalendarWrite
  const canManageRotation = canScheduleWrite || canCalendarWrite
  const canRotationRead = canCalendarRead || canScheduleWrite
  const [rotationTeamId, setRotationTeamId] = useState<string>()
  const [month, setMonth] = useState(dayjs())
  const [editor, setEditor] = useState<Editor>()
  const [form] = Form.useForm<Values>()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const manualTeamId = Form.useWatch('teamId', form)
  const manualMonth = Form.useWatch('month', form)

  const monthParams = useMemo(() => ({ month: month.month() + 1, year: month.year() }), [month])
  const range = useMemo(
    () => ({
      dateFrom: month.startOf('month').format('YYYY-MM-DD'),
      dateTo: month.endOf('month').format('YYYY-MM-DD'),
      limit: 100,
    }),
    [month],
  )

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
    queryKey: ['hr-operations', 'rotations', monthParams, rotationTeamId],
    queryFn: () =>
      listSaturdayRotations({
        ...monthParams,
        ...(rotationTeamId ? { teamId: rotationTeamId } : {}),
        limit: 100,
      }),
    enabled: canRotationRead,
  })
  const profiles = useQuery({
    queryKey: ['hr', 'employee-profiles', false],
    queryFn: () => loadEmployeeProfiles(false),
    enabled: canScheduleWrite || canCalendarWrite,
  })
  const teams = useQuery({
    queryKey: ['organization', 'teams'],
    queryFn: loadTeams,
    enabled: canRotationRead,
  })

  const employeeOptions = useMemo(
    () =>
      (profiles.data?.items ?? []).map((profile) => ({
        value: profile.id,
        label: `${profile.fullName || profile.employeeCode} · ${profile.employeeCode}`,
      })),
    [profiles.data],
  )

  const teamOptions = useMemo(
    () => (teams.data?.items ?? []).map((team) => ({ value: team.id, label: team.name })),
    [teams.data],
  )
  const teamById = useMemo(() => {
    const map = new Map<string, string>()
    ;(teams.data?.items ?? []).forEach((team) => {
      map.set(team.id, team.name)
    })
    return map
  }, [teams.data])
  const teamName = (teamId: string) => teamById.get(teamId) ?? teamId
  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>()
    ;(profiles.data?.items ?? []).forEach((profile) => {
      map.set(profile.id, `${profile.fullName || profile.employeeCode}`)
    })
    return map
  }, [profiles.data])
  const manualTeamEmployees = useMemo(
    () =>
      (profiles.data?.items ?? [])
        .filter((profile) => profile.teamId === manualTeamId)
        .map((profile) => ({
          value: profile.id,
          label: `${profile.fullName || profile.employeeCode} · ${profile.employeeCode}`,
        })),
    [manualTeamId, profiles.data],
  )
  const manualTeamEmployeeIds = useMemo(
    () =>
      (profiles.data?.items ?? [])
        .filter((profile) => profile.teamId === manualTeamId)
        .map((profile) => profile.id),
    [manualTeamId, profiles.data],
  )
  const saturdaysOfMonth = useCallback(
    (monthValue: Values[string]) => {
      const monthDate = dayjs.isDayjs(monthValue) ? monthValue : month
      if (!monthDate.isValid()) return []
      const dates: string[] = []
      let current = monthDate.startOf('month')
      const endOfMonth = monthDate.endOf('month')
      while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'day')) {
        if (current.day() === 6) dates.push(current.format('YYYY-MM-DD'))
        current = current.add(1, 'day')
      }
      return dates
    },
    [month],
  )
  const manualSaturdays = useMemo(
    () => saturdaysOfMonth(manualMonth || month),
    [manualMonth, month, saturdaysOfMonth],
  )
  const manualDefaultOffByDate = useMemo(
    () => Object.fromEntries(manualSaturdays.map((dateKey) => [dateKey, []])) as RotationOffByDate,
    [manualSaturdays],
  )
  const saturdayWeekLabel = (dateKey: string) =>
    `${t('hrOperations.schedule.weekLabel')} ${
      Math.floor(dayjs(dateKey).startOf('day').diff(dayjs(dateKey).startOf('month'), 'day') / 7) + 1
    } (${dayjs(dateKey).format('DD/MM/YYYY')})`
  const statusLabel = (value: string) =>
    t(`hrOperations.schedule.statuses.${value}`, { defaultValue: value })
  const rotationSourceLabel = (value: string) =>
    t(`hrOperations.schedule.rotationSources.${value}`, { defaultValue: value })
  const overrideKindLabel = (value: string) =>
    t(`hrOperations.schedule.overrideKinds.${value}`, { defaultValue: value })
  const scopeTypeLabel = (value: string) =>
    t(`hrOperations.schedule.scopeTypes.${value}`, { defaultValue: value })
  const holidayTypeLabel = (value: string) =>
    t(`hrOperations.schedule.holidayTypes.${value}`, { defaultValue: value })

  const openEditor = (next: Editor) => {
    form.resetFields()
    if (next.item) {
      form.setFieldsValue({
        ...(next.item as Values),
        ...(next.kind === 'rotationManual'
          ? {
              dateKey: dayjs((next.item as SaturdayRotation).dateKey),
              month: month,
            }
          : {}),
      })
    } else if (next.kind === 'rotationManual') {
      form.setFieldsValue({ month, employeeProfileIdsByDate: manualDefaultOffByDate })
    }
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
      if (editor.kind === 'rotationManual') {
        if (editor.item) {
          return updateSaturdayRotation(
            editor.item.id,
            (values.employeeProfileIds as string[]) ?? [],
          )
        }
        const teamId = String(values.teamId)
        const byDate = (values.employeeProfileIdsByDate as RotationOffByDate) || {}
        const targetDates = saturdaysOfMonth(values.month)
        const teamEmployeeIds = manualTeamEmployeeIds.length
          ? manualTeamEmployeeIds
          : (profiles.data?.items ?? [])
              .filter((profile) => profile.teamId === teamId)
              .map((profile) => profile.id)
        const createPayloads = targetDates.map((dateKey) => {
          const offEmployeeProfileIds = Array.isArray(byDate[dateKey]) ? byDate[dateKey] : []
          const employeeProfileIds = teamEmployeeIds.filter(
            (id) => !offEmployeeProfileIds.includes(id),
          )
          return createSaturdayRotation({
            teamId,
            dateKey,
            employeeProfileIds,
          })
        })
        return Promise.all(createPayloads)
      }
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
  const removeRotation = useMutation({
    mutationFn: async (id: string) => deleteSaturdayRotation(id),
    onSuccess: () => {
      toast('success', t('hrOperations.messages.saved'))
      void queryClient.invalidateQueries({ queryKey: ['hr-operations'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })
  const resetMonthRotation = useMutation({
    mutationFn: async () => {
      if (!rotationTeamId) return Promise.resolve()
      return deleteTeamSaturdayRotations(rotationTeamId, month.month() + 1, month.year())
    },
    onSuccess: () => {
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

  const locationCount = locations.data?.items.length ?? 0
  const shiftCount = shifts.data?.items.length ?? 0
  const assignmentCount = assignments.data?.items.length ?? 0
  const holidayCount = (holidays.data?.items.length ?? 0) + (overrides.data?.items.length ?? 0)

  const tabItems = [
    {
      key: 'assignments',
      label: (
        <span>
          <UserSwitchOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.schedule.tabs.assignments', { count: assignmentCount })}
        </span>
      ),
      children: (
        <SectionCard title={t('hrOperations.schedule.assignments')}>
          {canScheduleWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEditor({ kind: 'assignment' })}
              style={{ marginBottom: 16 }}
            >
              {t('hrOperations.schedule.assignShift')}
            </Button>
          )}
          <CoreDataTable
            size="small"
            scroll={{ y: 'calc(100vh - 360px)' }}
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={assignments.isLoading}
            dataSource={assignments.data?.items}
            columns={[
              {
                title: t('hrOperations.common.employee'),
                render: (_, item) => (
                  <Typography.Text strong>
                    {item.employee?.fullName || item.employee?.employeeCode || item.profileId}
                  </Typography.Text>
                ),
              },
              {
                title: t('hrOperations.schedule.shift'),
                render: (_, item) => <Tag color="blue">{item.shift?.name || item.shiftId}</Tag>,
              },
              {
                title: t('hrOperations.common.location'),
                render: (_, item) => (
                  <Tag color="purple">{item.workLocation?.name || item.workLocationId}</Tag>
                ),
              },
              {
                title: t('hrOperations.schedule.effective'),
                render: (_, item) => (
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {dayjs(item.effectiveFrom).format('DD/MM/YYYY')} →{' '}
                    {item.effectiveTo ? dayjs(item.effectiveTo).format('DD/MM/YYYY') : '∞'}
                  </Typography.Text>
                ),
              },
              {
                title: t('hrOperations.common.status'),
                dataIndex: 'status',
                render: (value) => (
                  <StatusTag status={value === 'ACTIVE' ? 'approved' : 'cancelled'}>
                    {statusLabel(value)}
                  </StatusTag>
                ),
              },
            ]}
          />
        </SectionCard>
      ),
    },
    {
      key: 'locations-shifts',
      label: (
        <span>
          <CompassOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.schedule.tabs.locationsShifts')}
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <SectionCard title={t('hrOperations.schedule.workLocations')}>
              {canScheduleWrite && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openEditor({ kind: 'location' })}
                  style={{ marginBottom: 16 }}
                >
                  {t('hrOperations.schedule.addLocation')}
                </Button>
              )}
              <CoreDataTable
                size="small"
                scroll={{ y: 'calc(100vh - 360px)' }}
                pagination={DEFAULT_TABLE_PAGINATION}
                rowKey="id"
                loading={locations.isLoading}
                dataSource={locations.data?.items}
                columns={[
                  {
                    title: t('hrOperations.common.location'),
                    dataIndex: 'name',
                    render: (val) => <Typography.Text strong>{val}</Typography.Text>,
                  },
                  {
                    title: t('hrOperations.common.timezone'),
                    dataIndex: 'timezone',
                    render: (val) => <Tag color="geekblue">{val}</Tag>,
                  },
                  {
                    title: t('hrOperations.common.status'),
                    dataIndex: 'status',
                    render: (value) => (
                      <StatusTag status={value === 'ACTIVE' ? 'operational' : 'cancelled'}>
                        {statusLabel(value)}
                      </StatusTag>
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
          </Col>

          <Col xs={24} lg={12}>
            <SectionCard title={t('hrOperations.schedule.shifts')}>
              {canScheduleWrite && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openEditor({ kind: 'shift' })}
                  style={{ marginBottom: 16 }}
                >
                  {t('hrOperations.schedule.addShift')}
                </Button>
              )}
              <CoreDataTable
                size="small"
                scroll={{ y: 'calc(100vh - 360px)' }}
                pagination={DEFAULT_TABLE_PAGINATION}
                rowKey="id"
                loading={shifts.isLoading}
                dataSource={shifts.data?.items}
                columns={[
                  {
                    title: t('hrOperations.schedule.shift'),
                    render: (_, item: Shift) => (
                      <Space>
                        <Typography.Text strong>{item.name}</Typography.Text>
                        <Tag color="default" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                          {item.code}
                        </Tag>
                      </Space>
                    ),
                  },
                  {
                    title: t('hrOperations.schedule.hours'),
                    render: (_, item: Shift) => (
                      <Tag color="cyan">
                        {item.startTime} - {item.endTime}
                      </Tag>
                    ),
                  },
                  {
                    title: t('hrOperations.schedule.break'),
                    dataIndex: 'breakMinutes',
                    render: (value) => t('hrOperations.schedule.minutes', { count: value }),
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
          </Col>
        </Row>
      ),
    },
    {
      key: 'holidays-overrides',
      label: (
        <span>
          <CalendarOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.schedule.tabs.holidaysOverrides')}
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <SectionCard title={t('hrOperations.schedule.holidays')}>
              {canCalendarWrite && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openEditor({ kind: 'holiday' })}
                  style={{ marginBottom: 16 }}
                >
                  {t('hrOperations.schedule.addHoliday')}
                </Button>
              )}
              <CoreDataTable
                size="small"
                scroll={{ y: 'calc(100vh - 360px)' }}
                pagination={DEFAULT_TABLE_PAGINATION}
                rowKey="id"
                loading={holidays.isLoading}
                dataSource={holidays.data?.items}
                columns={[
                  {
                    title: t('hrOperations.common.date'),
                    dataIndex: 'dateKey',
                    render: (v: string) => <Tag color="gold">{dayjs(v).format('DD/MM/YYYY')}</Tag>,
                  },
                  { title: t('hrOperations.common.name'), dataIndex: 'name' },
                  {
                    title: t('hrOperations.common.type'),
                    dataIndex: 'holidayType',
                    render: (v: string) => holidayTypeLabel(v),
                  },
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
          </Col>

          <Col xs={24} lg={12}>
            <SectionCard title={t('hrOperations.schedule.overrides')}>
              {canScheduleWrite && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openEditor({ kind: 'override' })}
                  style={{ marginBottom: 16 }}
                >
                  {t('hrOperations.schedule.addOverride')}
                </Button>
              )}
              <CoreDataTable
                size="small"
                scroll={{ y: 'calc(100vh - 360px)' }}
                pagination={DEFAULT_TABLE_PAGINATION}
                rowKey="id"
                loading={overrides.isLoading}
                dataSource={overrides.data?.items}
                columns={[
                  {
                    title: t('hrOperations.common.date'),
                    dataIndex: 'dateKey',
                    render: (v: string) => (
                      <Tag color="orange">{dayjs(v).format('DD/MM/YYYY')}</Tag>
                    ),
                  },
                  { title: t('hrOperations.common.name'), dataIndex: 'name' },
                  {
                    title: t('hrOperations.common.type'),
                    dataIndex: 'kind',
                    render: (v: string) => overrideKindLabel(v),
                  },
                  {
                    title: t('hrOperations.common.scope'),
                    dataIndex: 'scopeType',
                    render: (v: string) => scopeTypeLabel(v),
                  },
                ]}
              />
            </SectionCard>
          </Col>
        </Row>
      ),
    },
    {
      key: 'saturday-rotation',
      label: (
        <span>
          <CalendarOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.schedule.saturday')}
        </span>
      ),
      children: (
        <SectionCard title={t('hrOperations.schedule.saturday')}>
          <div className={styles.rotationCommand}>
            <div>
              <Typography.Text className={styles.rotationEyebrow}>
                {t('hrOperations.schedule.rotationPlanner')}
              </Typography.Text>
              <Typography.Paragraph type="secondary" className={styles.rotationHint}>
                {t('hrOperations.schedule.saturdayRotationHint')}
              </Typography.Paragraph>
            </div>
            {canRotationRead && (
              <Select
                allowClear
                showSearch
                className={styles.rotationTeamFilter}
                value={rotationTeamId}
                onChange={setRotationTeamId}
                options={teamOptions}
                placeholder={t('hrOperations.schedule.filterTeam')}
              />
            )}
          </div>
          <Space size={8} className={styles.rotationActions} wrap>
            {canManageRotation && (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openEditor({ kind: 'rotation' })}
                >
                  {t('hrOperations.schedule.generateMonth')}
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => openEditor({ kind: 'rotationManual' })}
                >
                  {t('hrOperations.schedule.addRotation')}
                </Button>
                <Popconfirm
                  title={t('hrOperations.schedule.resetMonthRotationConfirm')}
                  onConfirm={() => resetMonthRotation.mutate()}
                  okText={t('hrOperations.common.yes')}
                  cancelText={t('hrOperations.common.no')}
                >
                  <Button danger loading={resetMonthRotation.isPending} disabled={!rotationTeamId}>
                    {t('hrOperations.schedule.resetMonthRotation')}
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
          <CoreDataTable
            size="small"
            scroll={{ y: 'calc(100vh - 360px)' }}
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={rotations.isLoading}
            dataSource={rotations.data?.items}
            columns={[
              {
                title: t('hrOperations.common.date'),
                dataIndex: 'dateKey',
                render: (v) => <Tag color="blue">{dayjs(v).format('DD/MM/YYYY')}</Tag>,
              },
              {
                title: t('hrOperations.common.team'),
                dataIndex: 'teamId',
                render: (teamId: string) => teamName(teamId),
              },
              {
                title: t('hrOperations.schedule.staffCount'),
                render: (_: unknown, item: SaturdayRotation) => (
                  <Tag color="orange">{item.employeeProfileIds.length}</Tag>
                ),
              },
              {
                title: t('hrOperations.schedule.sourceLabel'),
                dataIndex: 'source',
                render: (source: string) => (
                  <Tag color={source === 'MANUAL' ? 'gold' : 'blue'}>
                    {rotationSourceLabel(source)}
                  </Tag>
                ),
              },
              {
                title: t('hrOperations.schedule.minPresent'),
                dataIndex: 'minPresent',
                render: (value: number) => <Tag color="purple">{value}</Tag>,
              },
              {
                title: t('hrOperations.schedule.restingStaff'),
                render: (_, item: SaturdayRotation) => {
                  const visible = item.employeeProfileIds.slice(0, 3)
                  const rest = item.employeeProfileIds.length - visible.length
                  return (
                    <Space size={4} wrap>
                      {visible.map((id) => (
                        <Tag key={id} color="default">
                          {employeeNameById.get(id) ?? id}
                        </Tag>
                      ))}
                      {rest > 0 && <Tag color="processing">+{rest}</Tag>}
                    </Space>
                  )
                },
              },
              ...(canManageRotation
                ? [
                    {
                      title: t('hrOperations.common.action'),
                      width: 120,
                      render: (_: unknown, item: SaturdayRotation) => (
                        <Space size={6}>
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openEditor({ kind: 'rotationManual', item })}
                          />
                          <Popconfirm
                            title={t('hrOperations.schedule.deleteRotation')}
                            onConfirm={() => removeRotation.mutate(item.id)}
                            okText={t('hrOperations.common.yes')}
                            cancelText={t('hrOperations.common.no')}
                          >
                            <Button
                              type="text"
                              icon={<DeleteOutlined />}
                              danger
                              loading={removeRotation.isPending}
                            />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </SectionCard>
      ),
    },
  ]

  return (
    <section className={styles.page}>
      <PageHeader
        actions={<MonthPicker value={month} onChange={(value) => value && setMonth(value)} />}
      />

      {/* Summary Metric Cards */}
      <div className={styles.metrics}>
        <MetricCard
          icon={<CompassOutlined />}
          variant="neutral"
          label={t('hrOperations.schedule.metrics.locations')}
          value={locationCount}
          loading={locations.isLoading}
        />
        <MetricCard
          icon={<ClockCircleOutlined />}
          variant="info"
          label={t('hrOperations.schedule.metrics.shifts')}
          value={shiftCount}
          loading={shifts.isLoading}
        />
        <MetricCard
          icon={<TeamOutlined />}
          variant="success"
          label={t('hrOperations.schedule.metrics.assignments')}
          value={assignmentCount}
          loading={assignments.isLoading}
        />
        <MetricCard
          icon={<CalendarOutlined />}
          variant="warning"
          label={t('hrOperations.schedule.metrics.holidays')}
          value={holidayCount}
          loading={holidays.isLoading}
        />
      </div>

      <Tabs items={tabItems} defaultActiveKey="assignments" />

      {/* Editor Modal */}
      <Modal
        destroyOnHidden
        open={Boolean(editor)}
        title={title(editor?.kind)}
        footer={null}
        width="80%"
        style={{ maxWidth: 1200 }}
        onCancel={() => setEditor(undefined)}
      >
        <Form
          className={styles.modalForm}
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
          {editor?.kind === 'location' && (
            <>
              <Divider plain className={styles.modalSection}>
                {t('hrOperations.schedule.sections.locationIdentity')}
              </Divider>
              <Form.Item name="code" label={t('hrOperations.common.code')} rules={required}>
                <Input placeholder={t('hrOperations.schedule.placeholders.locationCode')} />
              </Form.Item>
              <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
                <Input placeholder={t('hrOperations.schedule.placeholders.locationName')} />
              </Form.Item>
              <Form.Item
                name="timezone"
                label={t('hrOperations.common.timezone')}
                initialValue="Asia/Ho_Chi_Minh"
                rules={required}
              >
                <Input placeholder="Asia/Ho_Chi_Minh" />
              </Form.Item>
            </>
          )}

          {editor?.kind === 'shift' && (
            <>
              <Divider plain className={styles.modalSection}>
                {t('hrOperations.schedule.sections.shiftDetails')}
              </Divider>
              <Form.Item name="code" label={t('hrOperations.common.code')} rules={required}>
                <Input placeholder={t('hrOperations.schedule.placeholders.shiftCode')} />
              </Form.Item>
              <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
                <Input placeholder={t('hrOperations.schedule.placeholders.shiftName')} />
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
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="startTime"
                    label={t('hrOperations.schedule.start')}
                    rules={required}
                  >
                    <DateTimePicker mode="time" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="endTime" label={t('hrOperations.schedule.end')} rules={required}>
                    <DateTimePicker mode="time" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="breakMinutes" label={t('hrOperations.schedule.breakMinutes')}>
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="60" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="graceMinutes" label={t('hrOperations.schedule.graceMinutes')}>
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="15" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {editor?.kind === 'assignment' && (
            <>
              <Divider plain className={styles.modalSection}>
                {t('hrOperations.schedule.sections.shiftAssignment')}
              </Divider>
              <Form.Item
                name="profileId"
                label={t('hrOperations.common.employee')}
                rules={required}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={employeeOptions}
                  placeholder={t('hrOperations.schedule.placeholders.searchEmployee')}
                />
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
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="effectiveFrom"
                    label={t('hrOperations.common.from')}
                    rules={required}
                  >
                    <DateTimePicker mode="date" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="effectiveTo" label={t('hrOperations.common.to')}>
                    <DateTimePicker mode="date" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {editor?.kind === 'override' && (
            <>
              <Divider plain className={styles.modalSection}>
                {t('hrOperations.schedule.sections.calendarOverride')}
              </Divider>
              <Form.Item name="dateKey" label={t('hrOperations.common.date')} rules={required}>
                <DateTimePicker mode="date" />
              </Form.Item>
              <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
                <Input placeholder={t('hrOperations.schedule.placeholders.overrideName')} />
              </Form.Item>
              <Form.Item name="kind" label={t('hrOperations.common.type')} rules={required}>
                <Select
                  options={['HOLIDAY', 'REST_DAY', 'WORKING_DAY'].map((value) => ({
                    value,
                    label: overrideKindLabel(value),
                  }))}
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
                    (value) => ({ value, label: scopeTypeLabel(value) }),
                  )}
                />
              </Form.Item>
            </>
          )}

          {editor?.kind === 'holiday' && (
            <>
              <Divider plain className={styles.modalSection}>
                {t('hrOperations.schedule.sections.holidayInfo')}
              </Divider>
              <Form.Item name="dateKey" label={t('hrOperations.common.date')} rules={required}>
                <DateTimePicker mode="date" />
              </Form.Item>
              <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
                <Input placeholder={t('hrOperations.schedule.placeholders.holidayName')} />
              </Form.Item>
              <Form.Item
                name="holidayType"
                label={t('hrOperations.common.type')}
                initialValue="PUBLIC_HOLIDAY"
              >
                <Select
                  options={['PUBLIC_HOLIDAY', 'SUBSTITUTE_WORK_DAY'].map((value) => ({
                    value,
                    label: holidayTypeLabel(value),
                  }))}
                />
              </Form.Item>
              <Form.Item name="note" label={t('hrOperations.common.note')}>
                <Input placeholder={t('hrOperations.schedule.placeholders.optionalNote')} />
              </Form.Item>
            </>
          )}

          {editor?.kind === 'rotation' && (
            <>
              <Divider plain className={styles.modalSection}>
                {t('hrOperations.schedule.rotationGenerator')}
              </Divider>
              <Form.Item name="teamId" label={t('hrOperations.common.team')} rules={required}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={teams.data?.items.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder={t('hrOperations.schedule.placeholders.selectTeam')}
                />
              </Form.Item>
              <Form.Item
                name="minPresent"
                label={t('hrOperations.schedule.minimumStaff')}
                initialValue={1}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
          {editor?.kind === 'rotationManual' && (
            <>
              <Divider plain className={styles.modalSection}>
                {t('hrOperations.schedule.rotationDetail')}
              </Divider>
              <Form.Item name="teamId" label={t('hrOperations.common.team')} rules={required}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={teamOptions}
                  placeholder={t('hrOperations.schedule.placeholders.selectTeam')}
                  disabled={Boolean(editor.item)}
                  onChange={() => {
                    form.setFieldsValue({ employeeProfileIdsByDate: manualDefaultOffByDate })
                  }}
                />
              </Form.Item>
              {editor.item ? (
                <Form.Item name="dateKey" label={t('hrOperations.common.date')} rules={required}>
                  <DateTimePicker mode="date" disabled={Boolean(editor.item)} />
                </Form.Item>
              ) : (
                <Form.Item name="month" label={t('hrOperations.common.month')} rules={required}>
                  <MonthPicker
                    onChange={(value) => {
                      if (!value) return
                      form.setFieldsValue({
                        employeeProfileIdsByDate: Object.fromEntries(
                          saturdaysOfMonth(value).map((dateKey) => [dateKey, []]),
                        ),
                      })
                    }}
                  />
                </Form.Item>
              )}
              {editor.item ? (
                <Form.Item
                  name="employeeProfileIds"
                  label={t('hrOperations.schedule.staff')}
                  rules={required}
                >
                  <Select
                    mode="multiple"
                    showSearch
                    optionFilterProp="label"
                    options={manualTeamEmployees}
                    placeholder={t('hrOperations.schedule.placeholders.selectStaff')}
                  />
                </Form.Item>
              ) : (
                <div className={styles.modalStack}>
                  {manualSaturdays.map((dateKey) => (
                    <Form.Item
                      key={dateKey}
                      name={['employeeProfileIdsByDate', dateKey]}
                      label={`${saturdayWeekLabel(dateKey)} ${t('hrOperations.schedule.restingStaff')}`}
                    >
                      <Checkbox.Group
                        options={manualTeamEmployees}
                        className={styles.checkboxGroup}
                        disabled={!manualTeamId || !manualSaturdays.length}
                      />
                    </Form.Item>
                  ))}
                </div>
              )}
            </>
          )}

          <Form.Item shouldUpdate noStyle>
            {() => (
              <FormActions
                cancelLabel={t('hrOperations.common.cancel')}
                dirty={form.isFieldsTouched()}
                onCancel={() => setEditor(undefined)}
                saving={save.isPending}
                submitLabel={t('hrOperations.common.save')}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

export default ScheduleCalendarPage
