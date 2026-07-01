import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  TextField,
  Typography,
} from '@mui/material'

import { getRoleMeta } from '@/layouts/sidebarNavigation'

import { buildProfileDetails } from '../utils/profileUser'

const FAKE_PROFILE_USER = {
  account: {
    username: 'AdminUser@LNG.co',
    email: 'AdminUser@LNG.co',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'Hệ thống',
  },
  profile: {
    fullName: 'Admin User',
    birthday: '1996-08-15',
    phone: '0909 123 456',
    email: 'admin@lng.co',
    citizenId: '079096012345',
    address: '123 Nguyen Hue, Ben Nghe Ward, District 1, Ho Chi Minh City',
  },
  department: 'All system',
  roles: ['ADMIN'],
}

function formatDateValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN').format(date)
}

function toDateInputValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toISOString().slice(0, 10)
}

function ProfileInputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  fullWidth = false,
}) {
  return (
    <Box className={fullWidth ? 'sm:col-span-2' : undefined}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', fontWeight: 600, mb: 0.75 }}
      >
        {label}
      </Typography>
      <TextField
        fullWidth
        hiddenLabel
        size="small"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        slotProps={{
          htmlInput: {
            'aria-label': label,
          },
        }}
        sx={(theme) => ({
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
            borderRadius: theme.spacing(0.75),
            minHeight: theme.spacing(5),
            '& fieldset': {
              borderColor: theme.palette.divider,
            },
            '&:hover fieldset': {
              borderColor: theme.palette.tokens.borderStrong,
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.primary.main,
            },
          },
          '& .MuiInputBase-input': {
            py: 1.25,
            typography: 'body2',
          },
        })}
      />
    </Box>
  )
}

function AdminInfoItem({ label, value, children }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ display: 'block', fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase' }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: 0.75 }}>
        {children || (
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
            {value || '-'}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const profileDetails = buildProfileDetails(FAKE_PROFILE_USER)
  const [profileForm, setProfileForm] = useState(() => ({
    fullName: profileDetails.displayName,
    birthday: toDateInputValue(profileDetails.birthday),
    phone: profileDetails.phone,
    email: profileDetails.personalEmail,
    citizenId: profileDetails.citizenId,
    address: profileDetails.address,
  }))
  const roleMeta = getRoleMeta(profileDetails.role)
  const roleLabel = roleMeta
    ? t(roleMeta.labelKey)
    : profileDetails.role
      ? profileDetails.role.toUpperCase()
      : ''
  const statusLabel = profileDetails.status ? t(`profile.status.${profileDetails.status}`) : ''
  const displayName = profileForm.fullName || profileDetails.displayName || t('auth.userFallback')
  const displayEmail = profileForm.email || profileDetails.email
  const department = profileDetails.department || t('profile.defaults.department')
  const createdBy = profileDetails.createdBy || t('profile.defaults.createdBy')
  const handleProfileFormChange = (field) => (event) => {
    setProfileForm((currentForm) => ({
      ...currentForm,
      [field]: event.target.value,
    }))
  }
  const handleProfileSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <Box className="flex flex-col gap-6">
      <Box className="flex min-h-10 items-center justify-between">
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          {t('profile.title')}
        </Typography>
      </Box>

      <Typography variant="caption" color="text.secondary">
        {t('profile.breadcrumb')}
      </Typography>

      <Card
        elevation={0}
        sx={(theme) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.spacing(1),
        })}
      >
        <CardContent sx={{ alignItems: 'center', display: 'flex', gap: 2, minHeight: 104, px: 3 }}>
          <Avatar
            sx={(theme) => ({
              bgcolor: 'primary.light',
              color: 'primary.main',
              fontSize: theme.typography.subtitle2.fontSize,
              fontWeight: 700,
              height: theme.spacing(8),
              width: theme.spacing(8),
            })}
          >
            {profileDetails.initials}
          </Avatar>
          <Box className="min-w-0">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {displayName}
            </Typography>
            <Box className="mt-1 flex flex-wrap items-center gap-2">
              {roleLabel && <Chip label={roleLabel} color="primary" size="small" />}
              <Typography variant="body2" color="text.secondary">
                {displayEmail || '-'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
        <Card
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.spacing(1),
          })}
        >
          <CardContent component="form" onSubmit={handleProfileSubmit} sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('profile.selfCard.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('profile.selfCard.description')}
            </Typography>

            <Box className="mt-8 grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <ProfileInputField
                fullWidth
                label={t('profile.fields.fullName')}
                value={profileForm.fullName}
                onChange={handleProfileFormChange('fullName')}
                placeholder={t('profile.placeholders.fullName')}
              />
              <ProfileInputField
                label={t('profile.fields.birthday')}
                type="date"
                value={profileForm.birthday}
                onChange={handleProfileFormChange('birthday')}
                placeholder={t('profile.placeholders.birthday')}
              />
              <ProfileInputField
                label={t('profile.fields.phone')}
                value={profileForm.phone}
                onChange={handleProfileFormChange('phone')}
                placeholder={t('profile.placeholders.phone')}
              />
              <ProfileInputField
                label={t('profile.fields.email')}
                value={profileForm.email}
                onChange={handleProfileFormChange('email')}
                placeholder={t('profile.placeholders.email')}
              />
              <ProfileInputField
                label={t('profile.fields.citizenId')}
                value={profileForm.citizenId}
                onChange={handleProfileFormChange('citizenId')}
                placeholder={t('profile.placeholders.citizenId')}
              />
              <ProfileInputField
                fullWidth
                label={t('profile.fields.address')}
                value={profileForm.address}
                onChange={handleProfileFormChange('address')}
                placeholder={t('profile.placeholders.address')}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box className="flex justify-end">
              <Button type="submit" variant="contained">
                {t('profile.actions.update')}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.spacing(1),
          })}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('profile.adminCard.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('profile.adminCard.description')}
            </Typography>

            <Box className="mt-6 flex flex-col">
              <AdminInfoItem
                label={t('profile.adminFields.username')}
                value={profileDetails.username}
              />
              <Divider sx={{ my: 1.5 }} />
              <AdminInfoItem label={t('profile.adminFields.role')}>
                {roleLabel ? <Chip label={roleLabel} color="primary" size="small" /> : '-'}
              </AdminInfoItem>
              <Divider sx={{ my: 1.5 }} />
              <AdminInfoItem label={t('profile.adminFields.department')} value={department} />
              <Divider sx={{ my: 1.5 }} />
              <AdminInfoItem label={t('profile.adminFields.status')}>
                {statusLabel ? <Chip label={statusLabel} color="success" size="small" /> : '-'}
              </AdminInfoItem>
              <Divider sx={{ my: 1.5 }} />
              <AdminInfoItem
                label={t('profile.adminFields.createdAt')}
                value={formatDateValue(profileDetails.createdAt)}
              />
              <Divider sx={{ my: 1.5 }} />
              <AdminInfoItem label={t('profile.adminFields.createdBy')} value={createdBy} />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
