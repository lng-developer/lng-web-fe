import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloseCircleOutlined, DeleteOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Checkbox, Popconfirm, Radio, Tag, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

import { EmployeeAvatar, SearchInput, useFeedbackToast } from '@/shared/ui'

import {
  addTeamMember,
  loadMemberCandidates,
  loadTeamMembers,
  removeTeamMember,
  type Team,
  type TeamMemberInput,
} from '../api/organizationApi'
import styles from './OrganizationPage.module.scss'

interface TeamStaffBranchProps {
  readonly canManageAccess: boolean
  readonly canManageMembers: boolean
  readonly team: Team
}

export const TeamStaffBranch = memo(function TeamStaffBranch({
  canManageAccess,
  canManageMembers,
  team,
}: TeamStaffBranchProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [staffSearch, setStaffSearch] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [memberType, setMemberType] = useState<TeamMemberInput['memberType']>('member')
  const members = useQuery({
    queryKey: ['organization', 'teams', team.id, 'members'],
    queryFn: () => loadTeamMembers(team.id),
  })
  const candidates = useQuery({
    queryKey: ['organization', 'member-candidates'],
    queryFn: loadMemberCandidates,
    enabled: canManageMembers,
  })
  const refreshOrganization = () => queryClient.invalidateQueries({ queryKey: ['organization'] })
  const addMembersMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        selectedAccounts.map((accountId) => addTeamMember(team.id, { accountId, memberType })),
      ),
    onSuccess: () => {
      setSelectedAccounts([])
      setStaffSearch('')
      showFeedbackToast('success', t('actionFeedback.assigned'))
      void refreshOrganization()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const removeMemberMutation = useMutation({
    mutationFn: (accountId: string) => removeTeamMember(team.id, accountId),
    onSuccess: () => {
      showFeedbackToast('success', t('actionFeedback.removed'))
      void refreshOrganization()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const existingMemberIds = useMemo(
    () =>
      new Set(
        [...(members.data?.leaders ?? []), ...(members.data?.members ?? [])].map(
          ({ accountId }) => accountId,
        ),
      ),
    [members.data],
  )
  const visibleCandidates = useMemo(() => {
    const search = staffSearch.trim().toLowerCase()
    return (candidates.data?.items ?? []).filter((candidate) => {
      const identity = `${candidate.fullName ?? ''} ${candidate.employeeCode ?? ''}`.toLowerCase()
      return !existingMemberIds.has(candidate.accountId) && (!search || identity.includes(search))
    })
  }, [candidates.data, existingMemberIds, staffSearch])

  return (
    <div className={styles.staffBranch} role="group">
      {canManageMembers && (
        <div className={styles.assignmentBox}>
          <div className={styles.assignmentToolbar}>
            <SearchInput
              placeholder={t('organization.searchStaff')}
              value={staffSearch}
              onSearchChange={setStaffSearch}
            />
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={memberType}
              onChange={(event) => setMemberType(event.target.value)}
              options={[
                { label: t('organization.member'), value: 'member' },
                { label: t('organization.leader'), value: 'leader' },
              ]}
            />
            {selectedAccounts.length > 0 && (
              <Button
                type="text"
                aria-label={t('organization.clearSelection')}
                icon={<CloseCircleOutlined />}
                onClick={() => setSelectedAccounts([])}
              >
                {t('organization.clearSelection')}
              </Button>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!selectedAccounts.length}
              loading={addMembersMutation.isPending}
              onClick={() => addMembersMutation.mutate()}
            >
              {t('organization.assignSelected', { count: selectedAccounts.length })}
            </Button>
          </div>
          <Checkbox.Group
            className={styles.candidateGrid}
            value={selectedAccounts}
            onChange={(values) => setSelectedAccounts(values as string[])}
          >
            {visibleCandidates.map((candidate) => {
              const fullName = candidate.fullName || candidate.employeeCode
              const employeeCode = candidate.employeeCode
              const avatarUrl = candidate.id
                ? `/api/hr/employee-profiles/${candidate.id}/avatar`
                : undefined
              const label = `${fullName} ${employeeCode || ''}`.trim()
              return (
                <Checkbox
                  className={styles.candidate}
                  aria-label={label}
                  value={candidate.accountId}
                  key={candidate.accountId}
                >
                  <EmployeeAvatar name={fullName} avatarUrl={avatarUrl} size={28} />
                  <span>
                    <strong>{fullName}</strong>
                    {candidate.fullName && <small>{candidate.employeeCode}</small>}
                  </span>
                </Checkbox>
              )
            })}
          </Checkbox.Group>
          {!candidates.isLoading && visibleCandidates.length === 0 && (
            <Typography.Text type="secondary">{t('organization.noStaffFound')}</Typography.Text>
          )}
        </div>
      )}
      <div className={styles.memberList} role="list">
        {[...(members.data?.leaders ?? []), ...(members.data?.members ?? [])].map((member) => {
          const fullName = member.fullName || member.email
          const avatarUrl = member.profileId
            ? `/api/hr/employee-profiles/${member.profileId}/avatar`
            : undefined

          return (
            <div className={styles.memberRow} role="listitem" key={member.accountId}>
              <div className={styles.memberMain}>
                <EmployeeAvatar name={fullName} avatarUrl={avatarUrl} size={32} />
                <span className={styles.memberIdentity}>
                  <strong>{fullName}</strong>
                  {member.employeeCode && <small>{member.employeeCode}</small>}
                </span>
                <Tag color={member.memberType === 'leader' ? 'gold' : 'default'}>
                  {t(`organization.${member.memberType}`)}
                </Tag>
              </div>
              <div className={styles.memberActions}>
                {canManageMembers && (
                  <Popconfirm
                    title={t('organization.removeMemberTitle')}
                    description={t('organization.removeMemberDescription', {
                      email: fullName,
                    })}
                    okText={t('organization.remove')}
                    cancelText={t('organization.cancel')}
                    onConfirm={() => removeMemberMutation.mutate(member.accountId)}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={t('organization.removeMember', {
                        email: fullName,
                      })}
                    />
                  </Popconfirm>
                )}
                {canManageAccess && (
                  <Button
                    type="text"
                    icon={<KeyOutlined />}
                    aria-label={t('auth.accessExplorer.manageAccess')}
                    onClick={() => navigate(`/auth/accounts/${member.accountId}/access`)}
                  >
                    {t('auth.accessExplorer.manageAccess')}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
