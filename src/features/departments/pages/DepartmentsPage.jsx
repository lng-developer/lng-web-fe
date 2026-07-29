import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AddIcon from '@mui/icons-material/Add'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import DomainIcon from '@mui/icons-material/Domain'
import GroupsIcon from '@mui/icons-material/Groups'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import { StatusBadge } from '@/components/operations'

import {
  buildDepartmentSummary,
  FAKE_DEPARTMENTS,
  getTeamsByDepartmentCode,
} from '../utils/departmentData'

const SELECTED_DEPARTMENT_CODE = 'DEPT-QC'
const INITIAL_DEPARTMENT_FORM = {
  code: '',
  name: '',
  description: '',
  active: true,
}
const INITIAL_TEAM_FORM = {
  code: '',
  name: '',
  departmentCode: SELECTED_DEPARTMENT_CODE,
  leader: '',
  active: true,
}
const FAKE_LEADERS = ['Nguyen Minh Anh', 'Tran Gia Han', 'Le Quoc Bao']

function countLabel(t, value, unitKey) {
  const unitForm = value === 1 ? 'singular' : 'plural'

  return `${value} ${t(`departments.units.${unitKey}.${unitForm}`)}`
}

function StatusChip({ label }) {
  return <StatusBadge tone="success">{label}</StatusBadge>
}

function CodeBadge({ children }) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 20,
        borderRadius: 1.5,
        bgcolor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
        color: 'text.secondary',
        px: 1.25,
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: '11px',
        lineHeight: 1,
        letterSpacing: 0,
      })}
    >
      {children}
    </Box>
  )
}

function OrganizationCard({ children, minWidth, title, badge, action, icon }) {
  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        minWidth,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      })}
    >
      <Box className="flex min-h-[76px] items-center justify-between gap-3 px-5 border-b border-border bg-surface-subtle">
        <Box className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {title}
              </Typography>
              {badge}
            </div>
          </div>
        </Box>
        {action}
      </Box>
      {children}
    </Card>
  )
}

function TableHeader({ columns, templateColumns }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: templateColumns,
        minHeight: 40,
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: 3,
        columnGap: 3,
        bgcolor: theme.palette.mode === 'light' ? '#FAFAFA' : 'rgba(0,0,0,0.2)',
      })}
    >
      {columns.map((column) => (
        <Typography
          key={column}
          variant="caption"
          className="uppercase tracking-wider font-bold"
          color="text.disabled"
        >
          {column}
        </Typography>
      ))}
    </Box>
  )
}

function DataRow({ children, onClick, selected = false, templateColumns }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: templateColumns,
        minHeight: 64,
        alignItems: 'center',
        px: 3,
        columnGap: 3,
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: selected ? 'rgba(0, 100, 255, 0.04)' : 'transparent',
        borderBottom: `1px solid ${theme.palette.divider}`,
        transition: theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.shortest,
        }),
        '&:hover': onClick
          ? {
              bgcolor: selected ? 'rgba(0, 100, 255, 0.06)' : theme.palette.action.hover,
            }
          : undefined,
        '&:last-child': { borderBottom: 0 },
      })}
      onClick={onClick}
      className={selected ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}
    >
      {children}
    </Box>
  )
}

function NameCell({ code, name }) {
  return (
    <Box className="flex min-w-0 flex-col gap-1.5 py-2">
      <Box>
        <CodeBadge>{code}</CodeBadge>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700 }} className="truncate">
        {name}
      </Typography>
    </Box>
  )
}

function MetricCell({ primary, secondary }) {
  return (
    <Box className="flex flex-col gap-0.5">
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {primary}
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 500 }}>
        {secondary}
      </Typography>
    </Box>
  )
}

function CreateDepartmentModal({ formValues, onChange, onClose, onSubmit, open, t }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        component: 'form',
        onSubmit,
        sx: (theme) => ({
          width: 560,
          minHeight: 430,
          maxWidth: 'calc(100% - 32px)',
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: theme.shadows[24],
        }),
      }}
    >
      <DialogTitle
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64,
          px: 3,
          py: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.default',
        })}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {t('departments.modal.createDepartment.title')}
        </Typography>
        <IconButton
          aria-label={t('departments.modal.createDepartment.close')}
          size="small"
          onClick={onClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ minHeight: 318, px: 3, py: 3 }}>
        <Box className="flex h-full flex-col gap-5">
          <TextField
            name="code"
            label={t('departments.modal.createDepartment.fields.code')}
            placeholder={t('departments.modal.createDepartment.placeholders.code')}
            value={formValues.code}
            onChange={onChange}
            fullWidth
            required
            sx={{ mt: '12px' }}
          />
          <TextField
            name="name"
            label={t('departments.modal.createDepartment.fields.name')}
            placeholder={t('departments.modal.createDepartment.placeholders.name')}
            value={formValues.name}
            onChange={onChange}
            fullWidth
            required
          />
          <TextField
            name="description"
            label={t('departments.modal.createDepartment.fields.description')}
            placeholder={t('departments.modal.createDepartment.placeholders.description')}
            value={formValues.description}
            onChange={onChange}
            fullWidth
            multiline
            minRows={3}
          />
          <Box className="flex min-h-6 items-center justify-between gap-4 mt-2 p-3 rounded-lg bg-surface-subtle border border-border">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('departments.modal.createDepartment.fields.status')}
            </Typography>
            <Switch
              checked={formValues.active}
              onChange={(event) =>
                onChange({ target: { name: 'active', value: event.target.checked } })
              }
              color="success"
              inputProps={{ 'aria-label': t('departments.modal.createDepartment.fields.status') }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={(theme) => ({
          minHeight: 64,
          justifyContent: 'space-between',
          px: 3,
          py: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Button variant="outlined" color="inherit" onClick={onClose}>
          {t('departments.modal.createDepartment.actions.cancel')}
        </Button>
        <Button type="submit" variant="contained">
          {t('departments.modal.createDepartment.actions.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function CreateTeamModal({
  departments,
  formValues,
  leaders,
  onChange,
  onClose,
  onSubmit,
  open,
  t,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        component: 'form',
        onSubmit,
        sx: (theme) => ({
          width: 560,
          minHeight: 456,
          maxWidth: 'calc(100% - 32px)',
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: theme.shadows[24],
        }),
      }}
    >
      <DialogTitle
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64,
          px: 3,
          py: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.default',
        })}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {t('departments.modal.createTeam.title')}
        </Typography>
        <IconButton
          aria-label={t('departments.modal.createTeam.close')}
          size="small"
          onClick={onClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ minHeight: 342, px: 3, py: 3 }}>
        <Box className="flex h-full flex-col gap-5">
          <TextField
            name="code"
            label={t('departments.modal.createTeam.fields.code')}
            placeholder={t('departments.modal.createTeam.placeholders.code')}
            value={formValues.code}
            onChange={onChange}
            fullWidth
            required
            sx={{ mt: '12px' }}
          />
          <TextField
            name="name"
            label={t('departments.modal.createTeam.fields.name')}
            placeholder={t('departments.modal.createTeam.placeholders.name')}
            value={formValues.name}
            onChange={onChange}
            fullWidth
            required
          />
          <TextField
            name="departmentCode"
            label={t('departments.modal.createTeam.fields.department')}
            value={formValues.departmentCode}
            onChange={onChange}
            select
            fullWidth
            required
          >
            {departments.map((department) => (
              <MenuItem key={department.code} value={department.code}>
                {department.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            name="leader"
            label={t('departments.modal.createTeam.fields.leader')}
            value={formValues.leader}
            onChange={onChange}
            select
            fullWidth
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">
              <Typography color="text.disabled">
                {t('departments.modal.createTeam.placeholders.leader')}
              </Typography>
            </MenuItem>
            {leaders.map((leader) => (
              <MenuItem key={leader} value={leader}>
                {leader}
              </MenuItem>
            ))}
          </TextField>
          <Box className="flex min-h-6 items-center justify-between gap-4 mt-2 p-3 rounded-lg bg-surface-subtle border border-border">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('departments.modal.createTeam.fields.status')}
            </Typography>
            <Switch
              checked={formValues.active}
              onChange={(event) =>
                onChange({ target: { name: 'active', value: event.target.checked } })
              }
              color="success"
              inputProps={{ 'aria-label': t('departments.modal.createTeam.fields.status') }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={(theme) => ({
          minHeight: 64,
          justifyContent: 'space-between',
          px: 3,
          py: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Button variant="outlined" color="inherit" onClick={onClose}>
          {t('departments.modal.createTeam.actions.cancel')}
        </Button>
        <Button type="submit" variant="contained">
          {t('departments.modal.createTeam.actions.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function DepartmentsPage() {
  const { t } = useTranslation()
  const [isCreateDepartmentOpen, setIsCreateDepartmentOpen] = useState(false)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const [selectedDepartmentCode, setSelectedDepartmentCode] = useState(SELECTED_DEPARTMENT_CODE)
  const [departmentForm, setDepartmentForm] = useState(INITIAL_DEPARTMENT_FORM)
  const [teamForm, setTeamForm] = useState(INITIAL_TEAM_FORM)
  const summary = buildDepartmentSummary(FAKE_DEPARTMENTS)
  const teams = getTeamsByDepartmentCode(FAKE_DEPARTMENTS, selectedDepartmentCode)
  const selectedDepartment = FAKE_DEPARTMENTS.find(
    (department) => department.code === selectedDepartmentCode,
  )
  const departmentColumns = t('departments.columns.department', { returnObjects: true })
  const teamColumns = t('departments.columns.team', { returnObjects: true })
  const handleCloseCreateDepartment = () => {
    setIsCreateDepartmentOpen(false)
    setDepartmentForm(INITIAL_DEPARTMENT_FORM)
  }
  const handleChangeDepartmentForm = (event) => {
    const { name, value } = event.target

    setDepartmentForm((currentForm) => ({ ...currentForm, [name]: value }))
  }
  const handleSubmitDepartmentForm = (event) => {
    event.preventDefault()
    handleCloseCreateDepartment()
  }
  const handleCloseCreateTeam = () => {
    setIsCreateTeamOpen(false)
    setTeamForm(INITIAL_TEAM_FORM)
  }
  const handleChangeTeamForm = (event) => {
    const { name, value } = event.target

    setTeamForm((currentForm) => ({ ...currentForm, [name]: value }))
  }
  const handleSubmitTeamForm = (event) => {
    event.preventDefault()
    handleCloseCreateTeam()
  }

  return (
    <>
      <Box className="flex flex-col gap-6">
        <Card
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
            bgcolor: 'background.paper',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          })}
        >
          <Box className="flex min-h-[100px] items-center justify-between gap-4 px-6 py-5">
            <Box className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600">
                <AccountTreeIcon fontSize="medium" />
              </div>
              <div>
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{ fontWeight: 800, fontSize: '1.5rem' }}
                >
                  {t('departments.organizationTitle')}
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                  {t('departments.organizationDescription')}
                </Typography>
              </div>
            </Box>
            <Button variant="outlined" color="primary" startIcon={<RefreshIcon fontSize="small" />}>
              {t('departments.actions.refresh')}
            </Button>
          </Box>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              xl: 'minmax(480px, 580px) minmax(680px, 1fr)',
            },
            gap: 4,
            alignItems: 'start',
            overflowX: 'auto',
          }}
        >
          <OrganizationCard
            minWidth={480}
            title={t('departments.departmentCardTitle')}
            icon={<DomainIcon />}
            badge={<CodeBadge>{`${summary.totalDepartments} ${t('departments.total')}`}</CodeBadge>}
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon fontSize="small" />}
                onClick={() => setIsCreateDepartmentOpen(true)}
              >
                {t('departments.actions.addDepartment')}
              </Button>
            }
          >
            <TableHeader
              columns={departmentColumns}
              templateColumns="minmax(200px, 1fr) 110px 110px 24px"
            />
            {FAKE_DEPARTMENTS.map((department) => (
              <DataRow
                key={department.id}
                selected={department.code === selectedDepartmentCode}
                templateColumns="minmax(200px, 1fr) 110px 110px 24px"
                onClick={() => {
                  setSelectedDepartmentCode(department.code)
                  setTeamForm((currentForm) => ({
                    ...currentForm,
                    departmentCode: department.code,
                  }))
                }}
              >
                <NameCell code={department.code} name={department.name} />
                <Box>
                  <StatusChip label={t(`departments.status.${department.status}`)} />
                </Box>
                <MetricCell
                  primary={countLabel(t, department.teamCount, 'team')}
                  secondary={countLabel(t, department.memberCount, 'member')}
                />
                <Box className="flex justify-end">
                  <ChevronRightIcon
                    className={`transition-colors ${department.code === selectedDepartmentCode ? 'text-primary-600' : 'text-transparent group-hover:text-ink-muted'}`}
                    fontSize="small"
                  />
                </Box>
              </DataRow>
            ))}
          </OrganizationCard>

          <OrganizationCard
            minWidth={680}
            title={`Teams: ${selectedDepartment?.name ?? ''}`}
            icon={<GroupsIcon />}
            badge={<CodeBadge>{selectedDepartmentCode}</CodeBadge>}
            action={
              <Button
                variant="outlined"
                startIcon={<AddIcon fontSize="small" />}
                onClick={() => setIsCreateTeamOpen(true)}
              >
                {t('departments.actions.addTeam')}
              </Button>
            }
          >
            <TableHeader columns={teamColumns} templateColumns="minmax(320px, 1fr) 120px 120px" />
            {teams.map((team) => (
              <DataRow key={team.id} templateColumns="minmax(320px, 1fr) 120px 120px">
                <NameCell code={team.code} name={team.name} />
                <Box>
                  <StatusChip label={t(`departments.status.${team.status}`)} />
                </Box>
                <MetricCell
                  primary={countLabel(t, team.leaderCount, 'leader')}
                  secondary={countLabel(t, team.staffCount, 'staff')}
                />
              </DataRow>
            ))}
          </OrganizationCard>
        </Box>
      </Box>
      <CreateDepartmentModal
        formValues={departmentForm}
        onChange={handleChangeDepartmentForm}
        onClose={handleCloseCreateDepartment}
        onSubmit={handleSubmitDepartmentForm}
        open={isCreateDepartmentOpen}
        t={t}
      />
      <CreateTeamModal
        departments={FAKE_DEPARTMENTS}
        formValues={teamForm}
        leaders={FAKE_LEADERS}
        onChange={handleChangeTeamForm}
        onClose={handleCloseCreateTeam}
        onSubmit={handleSubmitTeamForm}
        open={isCreateTeamOpen}
        t={t}
      />
    </>
  )
}
