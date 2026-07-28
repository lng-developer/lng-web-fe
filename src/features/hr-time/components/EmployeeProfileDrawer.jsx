import { useTranslation } from 'react-i18next'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Alert, Avatar, Button, Drawer, IconButton, Skeleton, Typography } from '@mui/material'

import { useAuthStore } from '@/store/useAuthStore'

import { useEmployeeProfileQuery } from '../api/hrTime.queries.js'
import { getEmployeeProfileSections } from '../utils/hrTimeApi.js'
import LeaveBalancePanel from './LeaveBalancePanel.jsx'

function displayValue(value, language) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return new Intl.NumberFormat(language).format(value)
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat(language).format(date)
    }
    return value.replaceAll('_', ' ')
  }
  if (Array.isArray(value)) return value.map((item) => displayValue(item, language)).join(', ')
  if (typeof value === 'object') {
    return (
      value.name ||
      value.fullName ||
      value.label ||
      Object.values(value)
        .filter((item) => typeof item === 'string' || typeof item === 'number')
        .join(' / ') ||
      '-'
    )
  }
  return String(value)
}

function fieldLabel(field) {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}

function hasGlobalCompensationPermission(user) {
  const compensationPermissions = new Set(['HR_COMPENSATION:READ', 'HR_COMPENSATION:WRITE'])
  const hasCompensationPermission = (permissions = []) =>
    permissions.some((permission) =>
      compensationPermissions.has(typeof permission === 'string' ? permission : permission?.code),
    )

  return (
    hasCompensationPermission(user?.permissions) ||
    (user?.scopes || []).some(
      (scope) =>
        String(scope?.scopeType || '').toLowerCase() === 'global' &&
        hasCompensationPermission(scope?.permissions),
    )
  )
}

export default function EmployeeProfileDrawer({
  open,
  profileId,
  canEdit = false,
  canManageLeaveBalances = false,
  onClose,
  onEdit,
}) {
  const { t, i18n } = useTranslation()
  const currentUser = useAuthStore((state) => state.currentUser)
  const canReadCompensation = hasGlobalCompensationPermission(currentUser)
  const profileQuery = useEmployeeProfileQuery(
    profileId,
    canReadCompensation ? { includeSensitive: true } : undefined,
    {
      enabled: open && Boolean(profileId),
    },
  )
  const profile = profileQuery.data
  const sections = getEmployeeProfileSections(profile)
  const error = profileQuery.error?.response?.data?.message || profileQuery.error?.message

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: 'w-full sm:w-[520px]' }}
    >
      <div className="flex h-full flex-col bg-surface">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={profile?.avatarUrl || undefined} alt={profile?.fullName || ''}>
              {profile?.fullName?.slice(0, 1)}
            </Avatar>
            <div className="min-w-0">
              <Typography variant="h6" className="truncate text-ink-strong">
                {profile?.fullName ||
                  t('hrTime.people.profile', { defaultValue: 'Employee profile' })}
              </Typography>
              <Typography variant="body2" className="text-ink-muted">
                {profile?.employeeCode || '-'}
              </Typography>
            </div>
          </div>
          <IconButton aria-label={t('common.close', { defaultValue: 'Close' })} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {profileQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} height={42} />
              ))}
            </div>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <div className="divide-y divide-border">
              {sections.map((section) => (
                <section key={section.key} className="py-4 first:pt-0">
                  <Typography variant="subtitle2" className="mb-3 uppercase text-ink-muted">
                    {t(`hrTime.people.sections.${section.key}`, {
                      defaultValue: fieldLabel(section.key),
                    })}
                  </Typography>
                  <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                    {section.fields.map((field) => (
                      <div key={field.key} className="min-w-0">
                        <dt className="text-xs text-ink-muted">
                          {t(`hrTime.people.fields.${field.key}`, {
                            defaultValue: fieldLabel(field.key),
                          })}
                        </dt>
                        <dd className="mt-0.5 break-words text-sm text-ink-strong">
                          {displayValue(field.value, i18n.language)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
              {profile ? (
                <LeaveBalancePanel
                  profileId={profile.id || profileId}
                  canManage={canManageLeaveBalances}
                />
              ) : null}
            </div>
          )}
        </div>

        {canEdit && profile ? (
          <div className="border-t border-border px-5 py-3">
            <Button
              fullWidth
              variant="contained"
              startIcon={<EditOutlinedIcon />}
              onClick={() => onEdit(profile)}
            >
              {t('hrTime.people.editAction', { defaultValue: 'Edit employee profile' })}
            </Button>
          </div>
        ) : null}
      </div>
    </Drawer>
  )
}
