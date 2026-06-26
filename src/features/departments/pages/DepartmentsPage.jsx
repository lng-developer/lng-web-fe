import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Box,
  Button,
  Card,
  Chip,
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
  return (
    <Chip
      label={label}
      size="small"
      sx={(theme) => ({
        height: 18,
        borderRadius: 9,
        bgcolor: theme.palette.success.light,
        color: theme.palette.success.main,
        fontSize: 11,
        fontWeight: 700,
        '& .MuiChip-label': { px: 1 },
      })}
    />
  )
}

function CodeBadge({ children }) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 19,
        borderRadius: 0.75,
        bgcolor: theme.palette.mode === 'light' ? '#F5F6F8' : theme.palette.tokens.surfaceElevated,
        color: 'text.secondary',
        px: 1,
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: 0,
      })}
    >
      {children}
    </Box>
  )
}

function OrganizationCard({ children, minWidth, title, badge, action }) {
  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        minWidth,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      })}
    >
      <Box className="flex min-h-[72px] items-center justify-between gap-3 px-4">
        <Box className="flex items-center gap-3">
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {badge}
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
        minHeight: 37,
        alignItems: 'center',
        borderTop: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: 3,
        columnGap: 3,
      })}
    >
      {columns.map((column) => (
        <Typography
          key={column}
          variant="caption"
          color="text.disabled"
          sx={{ fontWeight: 800, fontSize: 11 }}
        >
          {column}
        </Typography>
      ))}
    </Box>
  )
}

function DataRow({ children, templateColumns }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: templateColumns,
        minHeight: 60,
        alignItems: 'center',
        px: 3,
        columnGap: 3,
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:last-child': { borderBottom: 0 },
      })}
    >
      {children}
    </Box>
  )
}

function NameCell({ code, name }) {
  return (
    <Box className="flex min-w-0 flex-col gap-1">
      <Box>
        <CodeBadge>{code}</CodeBadge>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {name}
      </Typography>
    </Box>
  )
}

function MetricCell({ primary, secondary }) {
  return (
    <Box className="flex flex-col">
      <Typography variant="body2" sx={{ fontSize: 13 }}>
        {primary}
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ fontSize: 13 }}>
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
          borderRadius: 1.25,
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
          minHeight: 56,
          px: 3,
          py: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
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
            sx={{ mt: '20px' }}
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
          <Box className="flex min-h-6 items-center justify-between gap-4">
            <Typography variant="body2" color="text.disabled">
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
          minHeight: 56,
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
          borderRadius: 1.25,
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
          minHeight: 56,
          px: 3,
          py: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
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
            sx={{ mt: '20px' }}
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
          <Box className="flex min-h-6 items-center justify-between gap-4">
            <Typography variant="body2" color="text.disabled">
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
          minHeight: 56,
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
  const [departmentForm, setDepartmentForm] = useState(INITIAL_DEPARTMENT_FORM)
  const [teamForm, setTeamForm] = useState(INITIAL_TEAM_FORM)
  const summary = buildDepartmentSummary(FAKE_DEPARTMENTS)
  const teams = getTeamsByDepartmentCode(FAKE_DEPARTMENTS, SELECTED_DEPARTMENT_CODE)
  const selectedDepartment = FAKE_DEPARTMENTS.find(
    (department) => department.code === SELECTED_DEPARTMENT_CODE,
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
            borderRadius: 1,
            bgcolor: 'background.paper',
          })}
        >
          <Box className="flex min-h-[99px] items-center justify-between gap-4 px-6 py-5">
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}
              >
                {t('departments.organizationTitle')}
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.75 }}>
                {t('departments.organizationDescription')}
              </Typography>
            </Box>
            <Button variant="text" color="primary" startIcon={<RefreshIcon fontSize="small" />}>
              {t('departments.actions.refresh')}
            </Button>
          </Box>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              xl: 'minmax(480px, 635px) minmax(680px, 1fr)',
            },
            gap: 3,
            alignItems: 'start',
            overflowX: 'auto',
          }}
        >
          <OrganizationCard
            minWidth={560}
            title={t('departments.departmentCardTitle')}
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
              templateColumns="minmax(220px, 1fr) 120px 120px"
            />
            {FAKE_DEPARTMENTS.map((department) => (
              <DataRow key={department.id} templateColumns="minmax(220px, 1fr) 120px 120px">
                <NameCell code={department.code} name={department.name} />
                <Box>
                  <StatusChip label={t(`departments.status.${department.status}`)} />
                </Box>
                <MetricCell
                  primary={countLabel(t, department.teamCount, 'team')}
                  secondary={countLabel(t, department.memberCount, 'member')}
                />
              </DataRow>
            ))}
          </OrganizationCard>

          <OrganizationCard
            minWidth={720}
            title={`Teams: ${selectedDepartment?.name ?? ''}`}
            badge={<CodeBadge>{SELECTED_DEPARTMENT_CODE}</CodeBadge>}
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
            <TableHeader columns={teamColumns} templateColumns="minmax(360px, 1fr) 120px 120px" />
            {teams.map((team) => (
              <DataRow key={team.id} templateColumns="minmax(360px, 1fr) 120px 120px">
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
