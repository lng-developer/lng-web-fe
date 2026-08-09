import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { IdcardOutlined, PlusOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Empty, Select, Skeleton, Switch } from 'antd'

import { getPermissions } from '@/shared/auth/session'
import {
  ConfirmDangerModal,
  FeedbackAlert,
  MetricCard,
  PageHeader,
  SearchInput,
  SectionCard,
  useFeedbackToast,
} from '@/shared/ui'

import {
  deleteEmployeeProfile,
  type EmployeeProfile,
  loadEmployeeProfile,
  loadEmployeeProfiles,
  restoreEmployeeProfile,
} from '../api/hrApi'
import { type HrDepartmentGroup, HrStaffDirectory } from './HrStaffDirectory'
import styles from './HrWorkspacePage.module.scss'

const loadStaffEditorModal = () => import('./StaffEditorModal')
const StaffEditorModal = lazy(() =>
  loadStaffEditorModal().then(({ StaffEditorModal }) => ({ default: StaffEditorModal })),
)

const statuses = ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED']

export function HrWorkspacePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>()
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [editor, setEditor] = useState<EmployeeProfile | 'create'>()
  const [deleteTarget, setDeleteTarget] = useState<EmployeeProfile>()
  const permissions = getPermissions()
  const canWrite = permissions.includes('HR_EMPLOYEES:WRITE')
  const canReadCompensation = permissions.some((permission) =>
    ['HR_COMPENSATION:READ', 'HR_COMPENSATION:WRITE'].includes(permission),
  )

  const profiles = useQuery({
    queryKey: ['hr', 'employee-profiles', includeDeleted],
    queryFn: () => loadEmployeeProfiles(includeDeleted),
  })
  const refreshProfiles = () =>
    queryClient.invalidateQueries({ queryKey: ['hr', 'employee-profiles'] })
  const deleteMutation = useMutation({
    mutationFn: () => deleteEmployeeProfile(deleteTarget!.id),
    onSuccess: () => {
      setDeleteTarget(undefined)
      showFeedbackToast('success', t('actionFeedback.deleted'))
      void refreshProfiles()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const restoreMutation = useMutation({
    mutationFn: restoreEmployeeProfile,
    onSuccess: () => {
      showFeedbackToast('success', t('actionFeedback.restored'))
      void refreshProfiles()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  useEffect(() => {
    if (!canWrite || searchParams.get('openCreate') !== '1' || editor === 'create') return
    const timer = window.setTimeout(() => {
      setEditor('create')
      const next = new URLSearchParams(searchParams)
      next.delete('openCreate')
      setSearchParams(next, { replace: true })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [canWrite, editor, searchParams, setSearchParams])

  const visibleProfiles = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (profiles.data?.items ?? []).filter((profile) => {
      const identity =
        `${profile.fullName ?? ''} ${profile.employeeCode ?? ''} ${profile.jobTitle ?? ''}`.toLowerCase()
      return (!term || identity.includes(term)) && (!status || profile.status === status)
    })
  }, [profiles.data, search, status])
  const departmentGroups = useMemo(() => {
    const groups = new Map<string, HrDepartmentGroup>()
    visibleProfiles.forEach((profile) => {
      const departmentKey = profile.departmentId ?? 'unassigned'
      const teamKey = profile.teamId ?? 'unassigned'
      const department = groups.get(departmentKey) ?? {
        name: profile.department?.name ?? t('hr.unassigned'),
        teams: new Map(),
      }
      const team = department.teams.get(teamKey) ?? {
        name: profile.team?.name ?? t('hr.unassigned'),
        staff: [],
      }
      team.staff.push(profile)
      department.teams.set(teamKey, team)
      groups.set(departmentKey, department)
    })
    return [...groups.entries()]
  }, [t, visibleProfiles])
  const openEditor = useCallback((profile: EmployeeProfile) => setEditor(profile), [])
  const deleteProfile = useCallback((profile: EmployeeProfile) => setDeleteTarget(profile), [])
  const restoreProfile = restoreMutation.mutate
  const prefetchProfile = useCallback(
    (profile: EmployeeProfile) => {
      if (profile.isDeleted) return
      void loadStaffEditorModal()
      void queryClient.prefetchQuery({
        queryKey: ['hr', 'employee-profiles', profile.id, canReadCompensation],
        queryFn: () => loadEmployeeProfile(profile.id, canReadCompensation),
      })
    },
    [canReadCompensation, queryClient],
  )
  const activeCount = (profiles.data?.items ?? []).filter(
    (profile) => profile.status === 'ACTIVE' && !profile.isDeleted,
  ).length
  const incompleteCount = (profiles.data?.items ?? []).filter(
    (profile) => profile.onboardingStatus === 'PROFILE_INCOMPLETE' && !profile.isDeleted,
  ).length

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('hr.title')}
        description={t('hr.description')}
        actions={
          canWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setEditor('create')}
              onFocus={() => void loadStaffEditorModal()}
              onMouseEnter={() => void loadStaffEditorModal()}
            >
              {t('hr.addStaff')}
            </Button>
          )
        }
      />
      {profiles.error && (
        <FeedbackAlert
          type="error"
          title={t('hr.unavailable')}
          action={
            <Button type="link" onClick={() => void profiles.refetch()}>
              {t('organization.retry')}
            </Button>
          }
        />
      )}
      <div className={styles.metrics}>
        <MetricCard
          icon={<UserOutlined />}
          label={t('hr.totalStaff')}
          value={String(profiles.data?.pagination.total ?? 0)}
        />
        <MetricCard
          icon={<TeamOutlined />}
          label={t('hr.activeStaff')}
          value={String(activeCount)}
        />
        <MetricCard
          icon={<IdcardOutlined />}
          label={t('hr.incompleteProfiles')}
          value={String(incompleteCount)}
        />
      </div>
      <SectionCard title={t('hr.directory')}>
        <div className={styles.toolbar}>
          <SearchInput placeholder={t('hr.search')} value={search} onSearchChange={setSearch} />
          <Select
            allowClear
            placeholder={t('hr.allStatuses')}
            value={status}
            onChange={setStatus}
            options={statuses.map((value) => ({ label: value, value }))}
          />
          {canWrite && (
            <label className={styles.archivedToggle}>
              <Switch checked={includeDeleted} onChange={setIncludeDeleted} />
              {t('hr.showArchived')}
            </label>
          )}
        </div>
        {profiles.isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : departmentGroups.length === 0 ? (
          <Empty description={t('hr.noStaff')} />
        ) : (
          <HrStaffDirectory
            canWrite={canWrite}
            departmentGroups={departmentGroups}
            restoringId={restoreMutation.isPending ? restoreMutation.variables : undefined}
            onDelete={deleteProfile}
            onOpen={openEditor}
            onPrefetch={prefetchProfile}
            onRestore={restoreProfile}
          />
        )}
      </SectionCard>

      {editor && (
        <Suspense fallback={null}>
          <StaffEditorModal
            editor={editor}
            readOnly={!canWrite}
            onClose={() => setEditor(undefined)}
            onSaved={() => {
              setEditor(undefined)
              void refreshProfiles()
            }}
          />
        </Suspense>
      )}
      <ConfirmDangerModal
        open={Boolean(deleteTarget)}
        title={t('hr.deleteTitle')}
        description={t('hr.deleteDescription', { name: deleteTarget?.fullName })}
        confirmLabel={t('hr.delete')}
        cancelLabel={t('hr.cancel')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteTarget(undefined)}
      />
    </section>
  )
}
