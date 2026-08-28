import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { DashboardVisual } from '@/features/foundation/DashboardVisual'

import { getMyHrWorkspace } from '../api/hrTimeApi'

export function HrDashboardPage() {
  const workspace = useQuery({ queryKey: ['hr-dashboard'], queryFn: () => getMyHrWorkspace({ dateKey: dayjs().format('YYYY-MM-DD') }) })
  const data = workspace.data
  const pending = [...(data?.leave.requests ?? []), ...(data?.overtime.requests ?? [])].filter((item) => item.status === 'PENDING').length
  const schedule = data?.schedule ?? []
  const queueData = [{ label: 'Pending requests', value: pending }, { label: 'Announcements', value: data?.announcements.length ?? 0 }]
  return <DashboardVisual title="HR dashboard" dateLabel={data?.dateKey ?? ''} cards={[[data?.today.attendance?.status ?? '—', 'Today attendance'], [String(data?.leave.availableUnits ?? 0), 'Leave balance'], [String(pending), 'Pending requests'], [String(data?.announcements.length ?? 0), 'Announcements']]} queueTitle="Action queue" queueData={queueData} summaryTitle="Schedule" summaryData={schedule.map((item) => ({ label: item.workDateKey, value: item.isWorkingDay ? 1 : 0 }))} targetTitle="Attendance" targetPercent={data?.today.attendance ? 100 : 0} targetLabel={data?.today.attendance?.status ?? 'Not checked in'} recentTitle="Recent requests" recentRows={(data?.leave.requests ?? []).slice(0, 4).map((item) => `${item.leaveType} · ${item.status}`)} sideTitle="Upcoming" sideRows={(data?.announcements ?? []).slice(0, 4).map((item) => item.title)} />
}
