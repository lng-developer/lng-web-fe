import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Button, Space, Tag, Tooltip } from 'antd'

import { type EmployeeProfile, loadEmployeeAvatar } from '../api/hrApi'
import styles from './HrWorkspacePage.module.scss'

export interface HrDepartmentGroup {
  name: string
  teams: Map<string, { name: string; staff: EmployeeProfile[] }>
}

interface HrStaffDirectoryProps {
  readonly canWrite: boolean
  readonly departmentGroups: Array<[string, HrDepartmentGroup]>
  readonly onDelete: (profile: EmployeeProfile) => void
  readonly onOpen: (profile: EmployeeProfile) => void
  readonly onPrefetch: (profile: EmployeeProfile) => void
  readonly onRestore: (profileId: string) => void
  readonly restoringId?: string
}

export const HrStaffDirectory = memo(function HrStaffDirectory({
  canWrite,
  departmentGroups,
  onDelete,
  onOpen,
  onPrefetch,
  onRestore,
  restoringId,
}: HrStaffDirectoryProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.tree} role="tree">
      {departmentGroups.map(([departmentId, department]) => (
        <section
          className={styles.department}
          role="treeitem"
          aria-expanded
          aria-selected={false}
          key={departmentId}
        >
          <header>
            <strong>{department.name}</strong>
            <Tag>
              {[...department.teams.values()].reduce((total, team) => total + team.staff.length, 0)}
            </Tag>
          </header>
          {[...department.teams.entries()].map(([teamId, team]) => (
            <div className={styles.team} role="group" key={teamId}>
              <div className={styles.teamTitle}>
                <TeamOutlined />
                <strong>{team.name}</strong>
                <span>{team.staff.length}</span>
              </div>
              {team.staff.map((profile) => (
                <div
                  className={`${styles.staffRow} ${profile.isDeleted ? styles.staffDeleted : ''}`}
                  key={profile.id}
                >
                  <button
                    className={styles.staff}
                    type="button"
                    aria-label={t('hr.openProfile', {
                      name: profile.fullName ?? profile.employeeCode,
                    })}
                    onClick={() => !profile.isDeleted && onOpen(profile)}
                  >
                    <StaffAvatar profile={profile} />
                    <span className={styles.identity}>
                      <strong>{profile.fullName ?? profile.employeeCode}</strong>
                      <small>
                        {profile.employeeCode} · {profile.jobTitle ?? t('hr.noJobTitle')}
                      </small>
                    </span>
                    <Tag
                      color={
                        profile.status === 'ACTIVE'
                          ? 'green'
                          : profile.status === 'PROBATION'
                            ? 'gold'
                            : undefined
                      }
                    >
                      {profile.status}
                    </Tag>
                    <Tag color={profile.onboardingStatus === 'READY' ? 'blue' : 'orange'}>
                      {profile.onboardingStatus}
                    </Tag>
                  </button>
                  {canWrite && (
                    <Space size={2} className={styles.staffActions}>
                      {profile.isDeleted ? (
                        <Tooltip title={t('hr.restore')}>
                          <Button
                            type="text"
                            aria-label={`${t('hr.restore')} ${profile.fullName}`}
                            icon={<ReloadOutlined />}
                            loading={restoringId === profile.id}
                            onClick={() => onRestore(profile.id)}
                          />
                        </Tooltip>
                      ) : (
                        <>
                          <Tooltip title={t('hr.edit')}>
                            <Button
                              type="text"
                              aria-label={`${t('hr.edit')} ${profile.fullName}`}
                              icon={<EditOutlined />}
                              onFocus={() => onPrefetch(profile)}
                              onMouseEnter={() => onPrefetch(profile)}
                              onClick={() => onOpen(profile)}
                            />
                          </Tooltip>
                          <Tooltip title={t('hr.delete')}>
                            <Button
                              type="text"
                              danger
                              aria-label={`${t('hr.delete')} ${profile.fullName}`}
                              icon={<DeleteOutlined />}
                              onClick={() => onDelete(profile)}
                            />
                          </Tooltip>
                        </>
                      )}
                    </Space>
                  )}
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
})

function StaffAvatar({ profile }: { profile: EmployeeProfile }) {
  const avatar = useQuery({
    queryKey: ['hr', 'employee-profiles', profile.id, 'avatar', profile.avatarAssetId],
    queryFn: () => loadEmployeeAvatar(profile.avatarUrl!),
    enabled: Boolean(profile.avatarAssetId && profile.avatarUrl),
    staleTime: Infinity,
  })

  return (
    <Avatar
      src={avatar.data ?? (!profile.avatarAssetId ? profile.avatarUrl : undefined)}
      icon={<UserOutlined />}
    />
  )
}
