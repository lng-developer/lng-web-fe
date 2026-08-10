import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  EyeOutlined,
  ProjectOutlined,
  TeamOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { getHrDashboard, getMyHrWorkspace, getTeamHrWorkspace } from '@/features/hr/api/hrTimeApi'
import { getDesignSummary } from '@/features/portal/design/api/designApi'
import { getMappingSummary } from '@/features/portal/mapping/api/mappingApi'
import { getOrderSummary } from '@/features/portal/orders/api/orderApi'
import { summarizeProductionTasks } from '@/features/portal/production/api/productionApi'
import { getPermissions, getRoles } from '@/shared/auth/session'
import { BarChart, FeedbackAlert, MetricCard, PageHeader, SectionCard } from '@/shared/ui'

import { type OperationsDashboardTrendPayload, toTrendSeries } from './api/operationsDashboardApi'
import styles from './FoundationPage.module.scss'

type Scope = 'staff' | 'leader' | 'manager' | 'admin'

const numberOf = (value: number | undefined | null) => Number(value ?? 0)

const asLabel = (value: unknown, defaultValue: string) => {
  if (value === null || value === undefined || value === '') return defaultValue
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  return defaultValue
}

function resolveScope(permissions: Set<string>, roles: Set<string>): Scope {
  const isAdmin =
    roles.has('SUPER_ADMIN') ||
    roles.has('SUPER ADMIN') ||
    roles.has('SYSTEM_ADMIN') ||
    roles.has('ADMIN')
  const hasManagerRole =
    roles.has('MANAGER') ||
    roles.has('DEPARTMENT_MANAGER') ||
    roles.has('DEPT_MANAGER') ||
    roles.has('HR_MANAGER')
  const hasLeaderRole = roles.has('LEADER') || roles.has('TEAM_LEADER') || roles.has('TEAM LEADER')
  const canManageHr =
    permissions.has('HR_EMPLOYEES:READ') ||
    permissions.has('HR_EMPLOYEES:WRITE') ||
    permissions.has('HR_PAYROLL:READ') ||
    permissions.has('HR_PAYROLL:WRITE')
  const canLeadTeam =
    permissions.has('HR_LEAVE:APPROVE') ||
    permissions.has('HR_OVERTIME:APPROVE') ||
    permissions.has('HR_ATTENDANCE:MANAGE') ||
    permissions.has('HR_SCHEDULE:WRITE') ||
    permissions.has('HR_CALENDAR:WRITE')

  if (isAdmin) return 'admin'
  if (canManageHr || hasManagerRole) return 'manager'
  if (canLeadTeam || hasLeaderRole) return 'leader'
  return 'staff'
}

function normalizeDataKey(key: string) {
  return key.replaceAll('_', ' ')
}

type ChartDatum = { label: string; value: number }
type TrendModule = 'orders' | 'mapping' | 'design' | 'production' | 'hr'

type TrendSource = {
  line?: unknown
  trend?: unknown
  series?: unknown
  data?: unknown
  points?: unknown
  donut?: unknown
  composition?: unknown
}

function LineChart({
  data,
  ariaLabel,
  noData,
}: {
  data: ChartDatum[]
  ariaLabel: string
  noData: string
}) {
  if (!data.length || data.every((item) => item.value <= 0)) {
    return (
      <div className={styles.chartNoData} role="img" aria-label={ariaLabel}>
        <Typography.Text type="secondary">{noData}</Typography.Text>
      </div>
    )
  }

  const values = data.map((item) => ({ label: item.label, value: numberOf(item.value) }))
  const max = Math.max(...values.map((item) => item.value), 1)
  const width = values.length
  const points = values
    .map((item, index) => {
      const x = (index / Math.max(width - 1, 1)) * 100
      const y = 100 - (item.value / max) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className={styles.lineChartWrap} role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 100" className={styles.lineChart} preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="var(--ant-color-primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.map((item, index) => {
          const x = (index / Math.max(width - 1, 1)) * 100
          const y = 100 - (item.value / max) * 100
          return (
            <circle
              key={`${item.label}-${index}`}
              cx={x}
              cy={y}
              r="1"
              fill="var(--ant-color-primary)"
            />
          )
        })}
      </svg>
    </div>
  )
}

const trendPriority = {
  line: ['line', 'trend', 'series', 'data', 'points'] as const,
  donut: ['donut', 'composition', 'line', 'trend', 'series', 'data', 'points'] as const,
}

function getModuleTrendSource(
  payload: OperationsDashboardTrendPayload | undefined,
  module: TrendModule,
): TrendSource | undefined {
  const root = payload?.modules ?? payload
  const fallbackModule = module
  return (root?.[fallbackModule] as TrendSource | undefined) ?? undefined
}

function trendDataOrFallback(
  moduleTrend: TrendSource | undefined,
  fallback: Array<{ label: string; value: number }> = [],
  priorities: ReadonlyArray<
    'line' | 'trend' | 'series' | 'data' | 'points' | 'donut' | 'composition'
  >,
): Array<{ label: string; value: number }> {
  for (const key of priorities) {
    const candidate = toTrendSeries((moduleTrend as Record<string, unknown> | undefined)?.[key])
    if (candidate.length) return candidate
  }

  return fallback
}

function DonutChart({
  data,
  ariaLabel,
  noData,
}: {
  data: ChartDatum[]
  ariaLabel: string
  noData: string
}) {
  const safeData = data.filter((item) => numberOf(item.value) > 0)
  const total = safeData.reduce((sum, item) => sum + numberOf(item.value), 0)

  if (!safeData.length || total <= 0) {
    return (
      <div className={styles.chartNoData} role="img" aria-label={ariaLabel}>
        <Typography.Text type="secondary">{noData}</Typography.Text>
      </div>
    )
  }

  const segments = safeData.reduce<{ from: number; to: number }[]>((acc, item) => {
    const from = acc.length ? acc[acc.length - 1].to : 0
    const to = from + (numberOf(item.value) / total) * 360
    return [...acc, { from, to }]
  }, [])

  const gradient = segments
    .map((segment, index) => {
      const color = `hsl(${205 + index * 22}, 80%, 52%)`
      return `${color} ${segment.from}deg ${segment.to}deg`
    })
    .join(', ')

  return (
    <div className={styles.donutWrap} role="img" aria-label={ariaLabel}>
      <div className={styles.donut} style={{ background: `conic-gradient(${gradient})` }}>
        <div className={styles.donutInner}>
          <Typography.Text>{total}</Typography.Text>
        </div>
      </div>
      <ul className={styles.donutLegend}>
        {safeData.map((item, index) => {
          const pct = ((numberOf(item.value) / total) * 100).toFixed(1)
          const color = `hsl(${205 + index * 22}, 80%, 52%)`
          return (
            <li key={`${item.label}-${index}`}>
              <span style={{ backgroundColor: color }} className={styles.donutLegendDot} />
              <span>{item.label}</span>
              <strong>
                {numberOf(item.value)} ({pct}%)
              </strong>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function OperationsDashboardPage() {
  const { t } = useTranslation()
  const permissionSet = useMemo(
    () => new Set(getPermissions().map((permission) => permission.toUpperCase())),
    [],
  )
  const roleSet = useMemo(() => new Set(getRoles().map((role) => role.toUpperCase())), [])
  const scope: Scope = useMemo(() => resolveScope(permissionSet, roleSet), [permissionSet, roleSet])

  const now = useMemo(() => dayjs(), [])
  const hrParams = useMemo(
    () => ({
      dateKey: now.format('YYYY-MM-DD'),
      month: now.month() + 1,
      year: now.year(),
    }),
    [now],
  )
  const orderSummaryParams = useMemo(() => ({ page: 1, limit: 1 }) as const, [])

  const canStaffHr =
    permissionSet.has('HR_ATTENDANCE:READ') ||
    permissionSet.has('HR_ATTENDANCE:WRITE') ||
    permissionSet.has('HR_LEAVE:READ') ||
    permissionSet.has('HR_OVERTIME:READ')
  const canLeaderHr = permissionSet.has('HR_ATTENDANCE:READ') || permissionSet.has('HR_LEAVE:READ')

  const canAccessHrByScope = useMemo(() => {
    if (scope === 'admin' || scope === 'manager') return true
    if (scope === 'leader') return canLeaderHr
    return canStaffHr
  }, [scope, canLeaderHr, canStaffHr])

  const canPortalOrders = permissionSet.has('ORDERS:READ') || permissionSet.has('ORDERS:WRITE')
  const canPortalMapping = permissionSet.has('MAPPING:READ') || permissionSet.has('MAPPING:WRITE')
  const canPortalDesign =
    permissionSet.has('DESIGN:READ') ||
    permissionSet.has('DESIGN:WORK') ||
    permissionSet.has('DESIGN:REVIEW') ||
    permissionSet.has('DESIGN:WRITE')
  const canPortalProduction =
    permissionSet.has('PRODUCTION:READ') ||
    permissionSet.has('PRODUCTION:WRITE') ||
    permissionSet.has('PRODUCTION:REVIEW')
  const trendParams = useMemo(
    () => ({
      from: now.subtract(6, 'day').format('YYYY-MM-DD'),
      to: now.format('YYYY-MM-DD'),
      windowDays: 7,
      granularity: 'day' as const,
    }),
    [now],
  )

  const trendsQuery = useQuery({
    queryKey: ['foundation', 'trends', scope, trendParams],
    queryFn: async () => undefined as OperationsDashboardTrendPayload | undefined,
    enabled: false,
  })

  const myHrWorkspace = useQuery({
    queryKey: ['foundation', 'hr', 'self', hrParams],
    queryFn: () => getMyHrWorkspace(hrParams),
    enabled: scope === 'staff' && canAccessHrByScope,
  })
  const teamHrWorkspace = useQuery({
    queryKey: ['foundation', 'hr', 'team', hrParams],
    queryFn: () => getTeamHrWorkspace(hrParams),
    enabled: scope === 'leader' && canAccessHrByScope,
  })
  const dashboardHr = useQuery({
    queryKey: ['foundation', 'hr', 'dashboard', hrParams.dateKey],
    queryFn: () => getHrDashboard(hrParams.dateKey),
    enabled: (scope === 'manager' || scope === 'admin') && canAccessHrByScope,
  })

  const orderSummary = useQuery({
    queryKey: ['foundation', 'portal', 'orders', orderSummaryParams],
    queryFn: () => getOrderSummary(orderSummaryParams),
    enabled: canPortalOrders,
  })
  const mappingSummary = useQuery({
    queryKey: ['foundation', 'portal', 'mapping'],
    queryFn: () => getMappingSummary(),
    enabled: canPortalMapping,
  })
  const designSummary = useQuery({
    queryKey: ['foundation', 'portal', 'design'],
    queryFn: () => getDesignSummary({}),
    enabled: canPortalDesign,
  })
  const productionSummary = useQuery({
    queryKey: ['foundation', 'portal', 'production'],
    queryFn: () => summarizeProductionTasks({}),
    enabled: canPortalProduction,
  })

  const scopeDescription = useMemo(() => {
    const label = t(`foundation.scope.${scope}`)
    const description = t(`foundation.scopeDescription.${scope}`)
    const icon =
      scope === 'admin' ? (
        <EyeOutlined />
      ) : scope === 'manager' ? (
        <UserSwitchOutlined />
      ) : scope === 'leader' ? (
        <TeamOutlined />
      ) : (
        <UserOutlined />
      )

    return { label, description, icon }
  }, [scope, t])

  const hrContent = useMemo(() => {
    if (scope === 'staff') {
      if (!myHrWorkspace.data) {
        return { cards: [], chart: [] as Array<{ label: string; value: number }> }
      }

      const presentDays = myHrWorkspace.data.calendar.filter(
        (entry) => entry.attendance?.status === 'PRESENT',
      ).length
      const lateDays = myHrWorkspace.data.calendar.filter(
        (entry) => numberOf(entry.attendance?.lateMinutes) > 0,
      ).length
      const leaves = myHrWorkspace.data.calendar.filter((entry) =>
        (entry.leave ?? []).some((item) => item.status === 'APPROVED'),
      ).length
      const overtime = myHrWorkspace.data.calendar.filter((entry) =>
        (entry.overtime ?? []).some((item) => item.status === 'APPROVED'),
      ).length
      const pending = [
        ...myHrWorkspace.data.leave.requests,
        ...myHrWorkspace.data.overtime.requests,
      ].filter((request) => request.status === 'PENDING').length

      return {
        cards: [
          {
            label: t('foundation.metrics.staff.attendance'),
            value: asLabel(myHrWorkspace.data.today.attendance?.status, '-'),
          },
          {
            label: t('foundation.metrics.staff.shift'),
            value: asLabel(myHrWorkspace.data.today.schedule?.shift?.name, '-'),
          },
          {
            label: t('foundation.metrics.staff.leaveBalance'),
            value: numberOf(myHrWorkspace.data.leave.availableUnits),
          },
          { label: t('foundation.metrics.staff.pendingRequests'), value: pending },
          {
            label: t('foundation.metrics.staff.latestPayroll'),
            value: asLabel(myHrWorkspace.data.latestPayroll?.netIncome, '-'),
          },
        ],
        chart: [
          { label: t('foundation.metrics.staff.presentDays'), value: presentDays },
          { label: t('hrOperations.attendance.late'), value: lateDays },
          { label: t('foundation.metrics.staff.approvedLeave'), value: leaves },
          { label: t('foundation.metrics.staff.approvedOvertime'), value: overtime },
        ],
      }
    }

    if (scope === 'leader' && teamHrWorkspace.data) {
      const members = teamHrWorkspace.data.profiles.items.length
      const pendingLeaves = teamHrWorkspace.data.pendingLeaves.items.length
      const pendingOt = teamHrWorkspace.data.pendingOvertime.items.length
      const present = teamHrWorkspace.data.attendance.items.filter(
        (item) => item.status === 'PRESENT',
      ).length
      const late = teamHrWorkspace.data.attendance.items.filter(
        (item) => numberOf(item.lateMinutes) > 0,
      ).length

      return {
        cards: [
          { label: t('foundation.metrics.leader.members'), value: members },
          { label: t('foundation.metrics.leader.present'), value: present },
          {
            label: t('foundation.metrics.leader.lateToday'),
            value: late,
          },
          {
            label: t('foundation.metrics.leader.pendingApprovals'),
            value: pendingLeaves + pendingOt,
          },
        ],
        chart: [
          { label: t('hrOperations.team.present'), value: present },
          {
            label: t('foundation.metrics.leader.exceptions'),
            value: teamHrWorkspace.data.attendance.items.length - present,
          },
          {
            label: t('foundation.metrics.leader.pendingApprovals'),
            value: pendingLeaves + pendingOt,
          },
        ],
      }
    }

    if ((scope === 'manager' || scope === 'admin') && dashboardHr.data) {
      const total = dashboardHr.data.employees.total
      const active = dashboardHr.data.employees.active
      const present = dashboardHr.data.attendance.present
      const pending = dashboardHr.data.approvals.totalPending

      return {
        cards: [
          { label: t('foundation.metrics.manager.totalEmployees'), value: total },
          { label: t('foundation.metrics.manager.activeEmployees'), value: active },
          { label: t('foundation.metrics.manager.presentToday'), value: present },
          { label: t('foundation.metrics.manager.pendingApprovals'), value: pending },
          {
            label: t('foundation.metrics.manager.coverageRate'),
            value: `${numberOf(dashboardHr.data.attendance.coverageRate)}%`,
          },
        ],
        chart: [
          {
            label: t('foundation.metrics.manager.probation'),
            value: numberOf(dashboardHr.data.employees.probation),
          },
          {
            label: t('foundation.metrics.manager.onLeave'),
            value: numberOf(dashboardHr.data.employees.onLeave),
          },
          {
            label: t('hrOperations.attendance.late'),
            value: numberOf(dashboardHr.data.attendance.late),
          },
          {
            label: t('hrOperations.overview.absent'),
            value: numberOf(dashboardHr.data.attendance.absent),
          },
          {
            label: t('foundation.metrics.manager.approvedOvertime'),
            value: numberOf(dashboardHr.data.approvals.approvedOvertimesToday),
          },
        ],
      }
    }

    return {
      cards: [] as Array<{ label: string; value: number | string }>,
      chart: [] as Array<{ label: string; value: number }>,
    }
  }, [dashboardHr.data, scope, t, teamHrWorkspace.data, myHrWorkspace.data])

  const hrQuery = useMemo(
    () => (scope === 'staff' ? myHrWorkspace : scope === 'leader' ? teamHrWorkspace : dashboardHr),
    [scope, myHrWorkspace, teamHrWorkspace, dashboardHr],
  )

  const orderCard = useMemo(() => {
    if (!orderSummary.data) return [] as Array<{ label: string; value: number }>

    const tabs = Object.entries(orderSummary.data.tabCounts ?? {})
      .map(([key, value]) => ({
        label: t(`orders.tabs.${key}`, { defaultValue: normalizeDataKey(key) }),
        value: numberOf(value),
      }))
      .filter((item) => item.value > 0)
      .slice(0, 5)

    const total = Object.values(orderSummary.data.tabCounts ?? {}).reduce(
      (sum, value) => sum + numberOf(value),
      0,
    )

    return [
      { label: t('foundation.metrics.portal.orderTotal'), value: total },
      ...tabs.map((item) => item),
    ]
  }, [orderSummary.data, t])

  const orderTrendLineData = useMemo(
    () =>
      trendDataOrFallback(getModuleTrendSource(trendsQuery.data, 'orders'), [], trendPriority.line),
    [trendsQuery.data],
  )
  const orderTrendDonutData = useMemo(
    () =>
      trendDataOrFallback(
        getModuleTrendSource(trendsQuery.data, 'orders'),
        [],
        trendPriority.donut,
      ),
    [trendsQuery.data],
  )

  const mappingCard = useMemo(() => {
    if (!mappingSummary.data) return [] as Array<{ label: string; value: number }>
    const data = mappingSummary.data
    const values = [
      {
        label: t('foundation.metrics.portal.mappingTotalPlan'),
        value: numberOf(data.totalPlanCount),
      },
      {
        label: t('foundation.metrics.portal.mappingReadyPlan'),
        value: numberOf(data.readyPlanCount),
      },
      {
        label: t('foundation.metrics.portal.mappingConfirmedPlan'),
        value: numberOf(data.confirmedPlanCount),
      },
      {
        label: t('foundation.metrics.portal.mappingBlockedSample'),
        value: numberOf(data.blockedSampleCount),
      },
      {
        label: t('foundation.metrics.portal.mappingMissingConfig'),
        value: numberOf(data.missingSkuConfigCount + data.missingSemanticRuleCount),
      },
    ]
    return values
  }, [mappingSummary.data, t])

  const mappingTrendSource = useMemo(() => mappingCard.slice(1), [mappingCard])
  const mappingTrendLineData = useMemo(
    () =>
      trendDataOrFallback(
        getModuleTrendSource(trendsQuery.data, 'mapping'),
        [],
        trendPriority.line,
      ),
    [trendsQuery.data],
  )
  const mappingTrendDonutData = useMemo(
    () =>
      trendDataOrFallback(
        getModuleTrendSource(trendsQuery.data, 'mapping'),
        [],
        trendPriority.donut,
      ),
    [trendsQuery.data],
  )

  const designCard = useMemo(() => {
    if (!designSummary.data) return [] as Array<{ label: string; value: number }>
    const data = designSummary.data
    const statusCards = Object.entries(data.byStatus ?? {}).map(([status, count]) => ({
      label: t(`foundation.metrics.portal.designStatus.${normalizeDataKey(status)}`, {
        defaultValue: normalizeDataKey(status),
      }),
      value: numberOf(count as number),
    }))
    const total = numberOf(data.total)
    const unassigned = numberOf(data.unassigned)
    const active = numberOf(data.active)

    return [
      { label: t('foundation.metrics.portal.designTotal'), value: total },
      { label: t('foundation.metrics.portal.designUnassigned'), value: unassigned },
      { label: t('foundation.metrics.portal.designActive'), value: active },
      ...statusCards,
    ]
  }, [designSummary.data, t])

  const designTrendSource = useMemo(() => designCard.slice(2), [designCard])
  const designTrendLineData = useMemo(
    () =>
      trendDataOrFallback(getModuleTrendSource(trendsQuery.data, 'design'), [], trendPriority.line),
    [trendsQuery.data],
  )
  const designTrendDonutData = useMemo(
    () =>
      trendDataOrFallback(
        getModuleTrendSource(trendsQuery.data, 'design'),
        [],
        trendPriority.donut,
      ),
    [trendsQuery.data],
  )

  const productionCard = useMemo(() => {
    if (!productionSummary.data) return [] as Array<{ label: string; value: number }>
    const summary = productionSummary.data
    const fallbackMap: Record<string, string> = {
      total: t('foundation.metrics.portal.productionTotal'),
      blocked: t('foundation.metrics.portal.productionBlocked'),
      needScale: t('foundation.metrics.portal.productionNeedScale'),
      qcPending: t('foundation.metrics.portal.productionQcPending'),
      ready: t('foundation.metrics.portal.productionReady'),
      readyToSendVendor: t('foundation.metrics.portal.productionReady'),
    }

    const entries = Object.entries(summary)
      .map(([status, count]) => ({
        label:
          fallbackMap[status] ??
          t(`foundation.metrics.portal.production.${normalizeDataKey(status)}`, {
            defaultValue: normalizeDataKey(status),
          }),
        value: numberOf(count as number),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    return entries
  }, [productionSummary.data, t])

  const productionTrendLineData = useMemo(
    () =>
      trendDataOrFallback(
        getModuleTrendSource(trendsQuery.data, 'production'),
        [],
        trendPriority.line,
      ),
    [trendsQuery.data],
  )
  const productionTrendDonutData = useMemo(
    () =>
      trendDataOrFallback(
        getModuleTrendSource(trendsQuery.data, 'production'),
        [],
        trendPriority.donut,
      ),
    [trendsQuery.data],
  )

  const hrTrendLineData = useMemo(
    () => trendDataOrFallback(getModuleTrendSource(trendsQuery.data, 'hr'), [], trendPriority.line),
    [trendsQuery.data],
  )
  const noAccessToAll =
    !canPortalOrders && !canPortalMapping && !canPortalDesign && !canPortalProduction

  const hrQueryErrorMessage = hrQuery.error instanceof Error ? hrQuery.error.message : undefined
  const hrQueryError = hrQuery.error ? t('foundation.feedback.loadFailed') : undefined

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('foundation.title')}
        description={t('foundation.description')}
        actions={
          <Tag color="blue" icon={scopeDescription.icon}>
            {scopeDescription.label}
          </Tag>
        }
      />
      <SectionCard title={t('foundation.sections.accessScope')}>
        <Typography.Paragraph>{scopeDescription.description}</Typography.Paragraph>
      </SectionCard>

      <section className={styles.dashboard}>
        <SectionCard title={t('foundation.sections.hr')} extra={<ProjectOutlined />}>
          {canAccessHrByScope ? (
            hrQueryError ? (
              <FeedbackAlert type="error" title={hrQueryError} description={hrQueryErrorMessage} />
            ) : (
              <>
                <div className={styles.metricGrid}>
                  {hrContent.cards.length ? (
                    hrContent.cards.map((metric) => (
                      <MetricCard
                        key={metric.label}
                        label={metric.label}
                        value={metric.value}
                        loading={hrQuery.isLoading}
                      />
                    ))
                  ) : (
                    <Typography.Text type="secondary">{t('foundation.noData')}</Typography.Text>
                  )}
                </div>
                {hrContent.chart.length ? (
                  <>
                    <div className={styles.chartGroup}>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.line')}
                        </Typography.Text>
                        <LineChart
                          ariaLabel={t('foundation.chart.line')}
                          noData={t('foundation.noData')}
                          data={hrTrendLineData}
                        />
                      </article>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.ariaLabel')}
                        </Typography.Text>
                        <BarChart
                          ariaLabel={t('foundation.chart.ariaLabel')}
                          data={hrContent.chart}
                        />
                      </article>
                    </div>
                    <Typography.Text type="secondary" className={styles.chartNote}>
                      {t('foundation.chart.notes.hr')}
                    </Typography.Text>
                  </>
                ) : null}
              </>
            )
          ) : (
            <FeedbackAlert type="info" title={t('foundation.accessDenied')} />
          )}
        </SectionCard>

        <SectionCard title={t('foundation.sections.portal')}>
          {noAccessToAll ? (
            <FeedbackAlert type="info" title={t('foundation.portal.noPermission')} />
          ) : (
            <div className={styles.portalGrid}>
              <article className={styles.module}>
                <Typography.Title level={5}>{t('foundation.portal.orders')}</Typography.Title>
                {canPortalOrders ? (
                  <>
                    <div className={styles.metricGrid}>
                      {orderCard.length ? (
                        orderCard.map((metric) => (
                          <MetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            loading={orderSummary.isLoading}
                          />
                        ))
                      ) : (
                        <Typography.Text type="secondary">{t('foundation.noData')}</Typography.Text>
                      )}
                    </div>
                    <div className={styles.chartGroup}>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.orders')}
                        </Typography.Text>
                        <BarChart
                          ariaLabel={t('foundation.chart.orders')}
                          data={
                            orderSummary.data?.tabCounts
                              ? Object.entries(orderSummary.data.tabCounts).map(([key, value]) => ({
                                  label: t(`orders.tabs.${key}`, {
                                    defaultValue: normalizeDataKey(key),
                                  }),
                                  value: numberOf(value),
                                }))
                              : []
                          }
                        />
                      </article>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.ordersLine')}
                        </Typography.Text>
                        <LineChart
                          ariaLabel={t('foundation.chart.ordersLine')}
                          noData={t('foundation.noData')}
                          data={orderTrendLineData}
                        />
                      </article>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.ordersDonut')}
                        </Typography.Text>
                        <DonutChart
                          ariaLabel={t('foundation.chart.ordersDonut')}
                          noData={t('foundation.noData')}
                          data={orderTrendDonutData}
                        />
                      </article>
                    </div>
                    <Typography.Text type="secondary" className={styles.chartNote}>
                      {t('foundation.chart.notes.orders')}
                    </Typography.Text>
                  </>
                ) : (
                  <FeedbackAlert type="info" title={t('foundation.portal.moduleDenied')} />
                )}
              </article>

              <article className={styles.module}>
                <Typography.Title level={5}>{t('foundation.portal.mapping')}</Typography.Title>
                {canPortalMapping ? (
                  <>
                    <div className={styles.metricGrid}>
                      {mappingCard.length ? (
                        mappingCard.map((metric) => (
                          <MetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            loading={mappingSummary.isLoading}
                          />
                        ))
                      ) : (
                        <Typography.Text type="secondary">{t('foundation.noData')}</Typography.Text>
                      )}
                    </div>
                    <div className={styles.chartGroup}>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.mapping')}
                        </Typography.Text>
                        <BarChart
                          ariaLabel={t('foundation.chart.mapping')}
                          data={mappingTrendSource}
                        />
                      </article>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.mappingLine')}
                        </Typography.Text>
                        <LineChart
                          ariaLabel={t('foundation.chart.mappingLine')}
                          noData={t('foundation.noData')}
                          data={mappingTrendLineData}
                        />
                      </article>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.mappingDonut')}
                        </Typography.Text>
                        <DonutChart
                          ariaLabel={t('foundation.chart.mappingDonut')}
                          noData={t('foundation.noData')}
                          data={mappingTrendDonutData}
                        />
                      </article>
                    </div>
                    <Typography.Text type="secondary" className={styles.chartNote}>
                      {t('foundation.chart.notes.mapping')}
                    </Typography.Text>
                  </>
                ) : (
                  <FeedbackAlert type="info" title={t('foundation.portal.moduleDenied')} />
                )}
              </article>

              <article className={styles.module}>
                <Typography.Title level={5}>{t('foundation.portal.design')}</Typography.Title>
                {canPortalDesign ? (
                  <>
                    <div className={styles.metricGrid}>
                      {designCard.length ? (
                        designCard.map((metric) => (
                          <MetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            loading={designSummary.isLoading}
                          />
                        ))
                      ) : (
                        <Typography.Text type="secondary">{t('foundation.noData')}</Typography.Text>
                      )}
                    </div>
                    <div className={styles.chartGroup}>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.design')}
                        </Typography.Text>
                        <BarChart
                          ariaLabel={t('foundation.chart.design')}
                          data={designTrendSource}
                        />
                      </article>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.designLine')}
                        </Typography.Text>
                        <LineChart
                          ariaLabel={t('foundation.chart.designLine')}
                          noData={t('foundation.noData')}
                          data={designTrendLineData}
                        />
                      </article>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.designDonut')}
                        </Typography.Text>
                        <DonutChart
                          ariaLabel={t('foundation.chart.designDonut')}
                          noData={t('foundation.noData')}
                          data={designTrendDonutData}
                        />
                      </article>
                    </div>
                    <Typography.Text type="secondary" className={styles.chartNote}>
                      {t('foundation.chart.notes.design')}
                    </Typography.Text>
                  </>
                ) : (
                  <FeedbackAlert type="info" title={t('foundation.portal.moduleDenied')} />
                )}
              </article>

              <article className={styles.module}>
                <Typography.Title level={5}>{t('foundation.portal.production')}</Typography.Title>
                {canPortalProduction ? (
                  <>
                    <div className={styles.metricGrid}>
                      {productionCard.length ? (
                        productionCard.map((metric) => (
                          <MetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            loading={productionSummary.isLoading}
                          />
                        ))
                      ) : (
                        <Typography.Text type="secondary">{t('foundation.noData')}</Typography.Text>
                      )}
                    </div>
                    <div className={styles.chartGroup}>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.production')}
                        </Typography.Text>
                        <BarChart
                          ariaLabel={t('foundation.chart.production')}
                          data={productionCard}
                        />
                      </article>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.productionLine')}
                        </Typography.Text>
                        <LineChart
                          ariaLabel={t('foundation.chart.productionLine')}
                          noData={t('foundation.noData')}
                          data={productionTrendLineData}
                        />
                      </article>
                      <article className={styles.chartPanel}>
                        <Typography.Text type="secondary">
                          {t('foundation.chart.productionDonut')}
                        </Typography.Text>
                        <DonutChart
                          ariaLabel={t('foundation.chart.productionDonut')}
                          noData={t('foundation.noData')}
                          data={productionTrendDonutData}
                        />
                      </article>
                    </div>
                    <Typography.Text type="secondary" className={styles.chartNote}>
                      {t('foundation.chart.notes.production')}
                    </Typography.Text>
                  </>
                ) : (
                  <FeedbackAlert type="info" title={t('foundation.portal.moduleDenied')} />
                )}
              </article>
            </div>
          )}
        </SectionCard>
      </section>
    </section>
  )
}
