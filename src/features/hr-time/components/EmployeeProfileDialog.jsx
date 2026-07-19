import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'

import { buildEmployeeProfilePayload } from '../utils/hrTimeApi.js'

const initialValues = {
  accountId: '',
  employeeCode: '',
  fullName: '',
  departmentId: '',
  teamId: '',
  jobTitle: '',
  jobLevel: '',
  employmentType: 'FULL_TIME',
  workMode: 'ONSITE',
  startDate: '',
  status: 'ACTIVE',
}

export default function EmployeeProfileDialog({
  open,
  profile,
  accounts = [],
  departments = [],
  teams = [],
  loading = false,
  error = '',
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation()
  const create = !profile
  const [values, setValues] = useState(() =>
    profile
      ? Object.fromEntries(
          Object.keys(initialValues).map((key) => [key, profile[key] ?? initialValues[key]]),
        )
      : initialValues,
  )

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const fieldText = (field, part, fallback) =>
    t(`hrTime.fields.${field}.${part}`, { defaultValue: fallback })

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(buildEmployeeProfilePayload(values, { create }))
        }}
      >
        <DialogTitle>
          {create
            ? t('hrTime.people.addTitle', { defaultValue: 'Add employee profile' })
            : t('hrTime.people.editTitle', { defaultValue: 'Edit employee profile' })}
        </DialogTitle>
        <DialogContent className="space-y-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          {create ? (
            <TextField
              select
              fullWidth
              required
              label={fieldText('account', 'label', 'User account')}
              helperText={fieldText(
                'account',
                'helperText',
                'Choose the sign-in account this employee profile belongs to.',
              )}
              value={values.accountId}
              onChange={(event) => setField('accountId', event.target.value)}
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.fullName || account.profile?.fullName || account.email} ({account.email})
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              required
              label={fieldText('employeeCode', 'label', 'Employee code')}
              helperText={fieldText(
                'employeeCode',
                'helperText',
                'Stable code used on internal HR records.',
              )}
              value={values.employeeCode}
              onChange={(event) => setField('employeeCode', event.target.value)}
            />
            <TextField
              required
              label={fieldText('fullName', 'label', 'Full name')}
              helperText={fieldText(
                'fullName',
                'helperText',
                'Use the employee name shown across operations.',
              )}
              value={values.fullName}
              onChange={(event) => setField('fullName', event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              select
              label={fieldText('department', 'label', 'Department')}
              helperText={fieldText(
                'department',
                'helperText',
                'Primary department used for reporting and access scope.',
              )}
              value={values.departmentId}
              onChange={(event) => setField('departmentId', event.target.value)}
            >
              <MenuItem value="">{t('common.none', { defaultValue: 'None' })}</MenuItem>
              {departments.map((department) => (
                <MenuItem key={department.id} value={department.id}>
                  {department.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={fieldText('team', 'label', 'Team')}
              helperText={fieldText(
                'team',
                'helperText',
                'Operational team inside the selected department.',
              )}
              value={values.teamId}
              onChange={(event) => setField('teamId', event.target.value)}
            >
              <MenuItem value="">{t('common.none', { defaultValue: 'None' })}</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label={fieldText('jobTitle', 'label', 'Job title')}
              helperText={fieldText(
                'jobTitle',
                'helperText',
                'Readable role title for the directory.',
              )}
              value={values.jobTitle}
              onChange={(event) => setField('jobTitle', event.target.value)}
            />
            <TextField
              label={fieldText('jobLevel', 'label', 'Job level')}
              helperText={fieldText(
                'jobLevel',
                'helperText',
                'Internal level or grade, when used.',
              )}
              value={values.jobLevel}
              onChange={(event) => setField('jobLevel', event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              select
              label={fieldText('employmentType', 'label', 'Employment type')}
              helperText={fieldText(
                'employmentType',
                'helperText',
                'Contracted working arrangement.',
              )}
              value={values.employmentType}
              onChange={(event) => setField('employmentType', event.target.value)}
            >
              {['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'].map((value) => (
                <MenuItem key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={fieldText('workMode', 'label', 'Work mode')}
              helperText={fieldText('workMode', 'helperText', 'Normal place-of-work arrangement.')}
              value={values.workMode}
              onChange={(event) => setField('workMode', event.target.value)}
            >
              {['ONSITE', 'REMOTE', 'HYBRID'].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label={fieldText('startDate', 'label', 'Start date')}
              helperText={fieldText('startDate', 'helperText', 'Official employment start date.')}
              value={values.startDate ? String(values.startDate).slice(0, 10) : ''}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(event) => setField('startDate', event.target.value)}
            />
          </div>
          <TextField
            select
            fullWidth
            label={fieldText('employeeStatus', 'label', 'Employment status')}
            helperText={fieldText(
              'employeeStatus',
              'helperText',
              'Use the status that controls active HR operations.',
            )}
            value={values.status}
            onChange={(event) => setField('status', event.target.value)}
          >
            {['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED'].map((value) => (
              <MenuItem key={value} value={value}>
                {value.replaceAll('_', ' ')}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
