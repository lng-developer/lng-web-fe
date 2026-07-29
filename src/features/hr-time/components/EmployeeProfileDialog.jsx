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

import DatePicker from '@/components/form/DatePicker'

import { buildEmployeeProfilePayload, buildStaffProvisioningPayload } from '../utils/hrTimeApi.js'

const initialValues = {
  employeeCode: '',
  workEmail: '',
  fullName: '',
  departmentId: '',
  teamId: '',
  jobTitle: '',
  jobLevel: '',
  employmentType: 'FULL_TIME',
  workMode: 'ONSITE',
  startDate: '',
  probationEndDate: '',
  status: 'ACTIVE',
  roleId: '',
  scopeType: 'global',
  scopeId: '',
}

export default function EmployeeProfileDialog({
  open,
  profile,
  roles = [],
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
  const scopeItems = values.scopeType === 'department' ? departments : teams

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(
            create ? buildStaffProvisioningPayload(values) : buildEmployeeProfilePayload(values),
          )
        }}
      >
        <DialogTitle>
          {create
            ? t('hrTime.people.addTitle', { defaultValue: 'Create staff' })
            : t('hrTime.people.editTitle', { defaultValue: 'Edit employee profile' })}
        </DialogTitle>
        <DialogContent className="space-y-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          {create ? (
            <TextField
              required
              fullWidth
              type="email"
              label={fieldText('workEmail', 'label', 'Work email')}
              helperText={fieldText(
                'workEmail',
                'helperText',
                'This address is used for the staff sign-in account.',
              )}
              value={values.workEmail}
              onChange={(event) => setField('workEmail', event.target.value)}
            />
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
            <DatePicker
              label={fieldText('startDate', 'label', 'Start date')}
              helperText={fieldText('startDate', 'helperText', 'Official employment start date.')}
              value={values.startDate ? String(values.startDate).slice(0, 10) : ''}
              onChange={(val) => setField('startDate', val)}
            />
          </div>
          {create ? (
            <DatePicker
              label={fieldText('probationEndDate', 'label', 'Probation end date')}
              helperText={fieldText(
                'probationEndDate',
                'helperText',
                'Leave blank when no probation end date is set.',
              )}
              value={values.probationEndDate ? String(values.probationEndDate).slice(0, 10) : ''}
              onChange={(value) => setField('probationEndDate', value)}
            />
          ) : null}
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
          {create ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                select
                required
                label={fieldText('role', 'label', 'Access role')}
                value={values.roleId}
                onChange={(event) => setField('roleId', event.target.value)}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name || role.code}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                required
                label={fieldText('scopeType', 'label', 'Access scope')}
                value={values.scopeType}
                onChange={(event) => {
                  setField('scopeType', event.target.value)
                  setField('scopeId', '')
                }}
              >
                <MenuItem value="global">
                  {t('hrTime.people.scopes.global', { defaultValue: 'Global' })}
                </MenuItem>
                <MenuItem value="department">
                  {t('hrTime.people.scopes.department', { defaultValue: 'Department' })}
                </MenuItem>
                <MenuItem value="team">
                  {t('hrTime.people.scopes.team', { defaultValue: 'Team' })}
                </MenuItem>
              </TextField>
              {values.scopeType === 'global' ? null : (
                <TextField
                  select
                  required
                  label={fieldText('scope', 'label', 'Scope target')}
                  value={values.scopeId}
                  onChange={(event) => setField('scopeId', event.target.value)}
                >
                  {scopeItems.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {create
              ? t('hrTime.people.createAction', { defaultValue: 'Create staff' })
              : t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
