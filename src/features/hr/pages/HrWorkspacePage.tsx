import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarOutlined,
  FieldTimeOutlined,
  IdcardOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Empty, Select, Skeleton, Switch } from 'antd'
import dayjs from 'dayjs'

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

import { type EmployeeProfile, loadEmployeeProfile } from '../api/hrApi'
import { hrKeys } from '../api/hrKeys'
import {
  useDeleteEmployeeProfileMutation,
  useEmployeeProfilesQuery,
  useRestoreEmployeeProfileMutation,
} from '../hooks'
import { type HrDepartmentGroup, HrStaffDirectory } from './HrStaffDirectory'
import styles from './HrWorkspacePage.module.scss'

const loadStaffEditorModal = () => import('./StaffEditorModal')
const StaffEditorModal = lazy(() =>
  loadStaffEditorModal().then(({ StaffEditorModal }) => ({ default: StaffEditorModal })),
)

const statuses = ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED']
const contractTypes = new Set(['CONTRACT', 'INTERNSHIP'])

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

  const permissions = useMemo(() => getPermissions(), [])
  const canWrite = permissions.includes('HR_EMPLOYEES:WRITE')
  const canReadCompensation = useMemo(
    () =>
      permissions.some((permission) =>
        ['HR_COMPENSATION:READ', 'HR_COMPENSATION:WRITE'].includes(permission),
      ),
    [permissions],
  )

  const profiles = useEmployeeProfilesQuery(includeDeleted)

  const refreshProfiles = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: hrKeys.profilesRoot })
  }, [queryClient])

  const deleteMutation = useDeleteEmployeeProfileMutation({
    onSuccess: () => {
      setDeleteTarget(undefined)
      showFeedbackToast('success', t('actionFeedback.deleted'))
      refreshProfiles()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const restoreMutation = useRestoreEmployeeProfileMutation({
    onSuccess: () => {
      showFeedbackToast('success', t('actionFeedback.restored'))
      refreshProfiles()
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
  const restoreProfile = useCallback(
    (profileId: string) => restoreMutation.mutate(profileId),
    [restoreMutation],
  )

  const prefetchProfile = useCallback(
    (profile: EmployeeProfile) => {
      if (profile.isDeleted) return
      void loadStaffEditorModal()
      void queryClient.prefetchQuery({
        queryKey: hrKeys.profile(profile.id, canReadCompensation),
        queryFn: () => loadEmployeeProfile(profile.id, canReadCompensation),
      })
    },
    [canReadCompensation, queryClient],
  )

  const activeCount = useMemo(
    () =>
      (profiles.data?.items ?? []).filter(
        (profile) => profile.status === 'ACTIVE' && !profile.isDeleted,
      ).length,
    [profiles.data],
  )

  const incompleteCount = useMemo(
    () =>
      (profiles.data?.items ?? []).filter(
        (profile) => profile.onboardingStatus === 'PROFILE_INCOMPLETE' && !profile.isDeleted,
      ).length,
    [profiles.data],
  )

  const profileStats = useMemo(() => {
    const today = dayjs()
    const activeProfiles = (profiles.data?.items ?? []).filter((profile) => !profile.isDeleted)
    return {
      fullTime: activeProfiles.filter((profile) => profile.employmentType === 'FULL_TIME').length,
      partTime: activeProfiles.filter((profile) => profile.employmentType === 'PART_TIME').length,
      contract: activeProfiles.filter((profile) => contractTypes.has(profile.employmentType ?? ''))
        .length,
      probation: activeProfiles.filter((profile) => profile.status === 'PROBATION').length,
      newThisMonth: activeProfiles.filter(
        (profile) => profile.startDate && dayjs(profile.startDate).isSame(today, 'month'),
      ).length,
      endingSoon: activeProfiles.filter((profile) => {
        if (!profile.endDate) return false
        const endDate = dayjs(profile.endDate)
        return endDate.isAfter(today.startOf('day')) && endDate.diff(today, 'day') <= 30
      }).length,
    }
  }, [profiles.data])

  const handleOpenCreate = useCallback(() => {
    setEditor('create')
  }, [])

  const handleCloseEditor = useCallback(() => {
    setEditor(undefined)
  }, [])

  const handleEditorSaved = useCallback(() => {
    setEditor(undefined)
    refreshProfiles()
  }, [refreshProfiles])

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteTarget(undefined)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id)
  }, [deleteMutation, deleteTarget])

  return (
    <section className={styles.page}>
      <PageHeader
        actions={
          canWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
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
        <MetricCard
          icon={<FieldTimeOutlined />}
          label={t('hr.probationStaff')}
          value={String(profileStats.probation)}
          variant="warning"
        />
        <MetricCard
          icon={<CalendarOutlined />}
          label={t('hr.newThisMonth')}
          value={String(profileStats.newThisMonth)}
          variant="success"
        />
        <MetricCard
          icon={<CalendarOutlined />}
          label={t('hr.endingSoon')}
          value={String(profileStats.endingSoon)}
          variant="danger"
        />
      </div>
      <SectionCard title={t('hr.employmentMix')}>
        <div className={styles.profileMix}>
          <MetricCard label={t('hr.fullTime')} value={String(profileStats.fullTime)} />
          <MetricCard label={t('hr.partTime')} value={String(profileStats.partTime)} />
          <MetricCard label={t('hr.contractStaff')} value={String(profileStats.contract)} />
        </div>
      </SectionCard>
      <SectionCard title={t('hr.directory')}>
        <div className={styles.toolbar}>
          <SearchInput placeholder={t('hr.search')} value={search} onSearchChange={setSearch} />
          <Select
            allowClear
            placeholder={t('hr.allStatuses')}
            value={status}
            onChange={setStatus}
            options={statuses.map((value) => ({
              label: t(`hr.statuses.${value}`, { defaultValue: value }),
              value,
            }))}
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
            onClose={handleCloseEditor}
            onSaved={handleEditorSaved}
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
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteModal}
      />
    </section>
  )
}

export default HrWorkspacePage
