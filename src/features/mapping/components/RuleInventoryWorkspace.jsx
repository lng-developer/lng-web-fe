import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import EditIcon from '@mui/icons-material/Edit'
import HistoryIcon from '@mui/icons-material/History'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useListingProductTypesQuery,
  useListingShopsQuery,
} from '@/features/listings/api/listings.queries'
import {
  useMappingRuleConflictsMutation,
  useMappingRulePreviewMutation,
  useMappingSaveRuleMutation,
  useMappingToggleRuleStatusMutation,
} from '@/features/mapping/api/mapping.mutations'
import {
  mappingRuleTypes,
  useMappingInternalTemplatesQuery,
  useMappingRulesQuery,
} from '@/features/mapping/api/mapping.queries'
import {
  buildMappingRuleInitialValues,
  buildMappingRulePayload,
  buildMappingRulePreview,
  MAPPING_RULE_FORM_CONFIG,
  STATIC_OPTIONS,
  TAB_GUIDES,
} from '@/features/mapping/data/mappingUxConfig'
import { mapMappingRuleRows } from '@/features/mapping/utils/mappingMappers'
import { useVendorsQuery } from '@/features/vendors/api/vendors.queries'

import MappingRuleDialog from './MappingRuleDialog'
import RuleHistoryDialog from './RuleHistoryDialog'

const defaultRowsPerPage = 10
const rowsPerPageOptions = [10, 25, 50]
const compactTableSx = {
  borderCollapse: 'separate',
  borderSpacing: 0,
  '& .MuiTableCell-root': { px: 1.25, py: 0.75, verticalAlign: 'middle' },
}
const ruleTableColumnSx = {
  rule: { width: 180 },
  match: { width: 140 },
  output: { width: 220 },
  scope: { width: 160 },
  priority: { width: 90 },
  status: { width: 96 },
  actions: { width: 112 },
}
const ruleStatusSwitchSx = { display: 'inline-flex', width: 48, justifyContent: 'center' }

function getItems(payload) {
  return Array.isArray(payload)
    ? payload
    : payload?.items || payload?.rows || payload?.results || []
}
function mapTemplateOptions(payload) {
  return getItems(payload).map((item) => ({
    id: item.id || item._id,
    label:
      item.name || item.displayName || item.title || item.label || item.code || 'Unnamed template',
  }))
}
function getSearchText(value) {
  return Array.isArray(value) ? value.join(' ') : String(value || '')
}
function filterBySearch(rows, search, getValues) {
  const needle = search.trim().toLowerCase()
  return needle
    ? rows.filter((row) =>
        getValues(row).map(getSearchText).join(' ').toLowerCase().includes(needle),
      )
    : rows
}
function getSafePage(rowCount, page, rowsPerPage) {
  return Math.min(page, Math.max(0, Math.ceil(rowCount / rowsPerPage) - 1))
}
function paginateRows(rows, page, rowsPerPage) {
  return rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
}
function getRuleTypeLabel(t, type) {
  const ruleType = mappingRuleTypes.find((item) => item.id === type)
  return t(`mapping.ruleTypes.${type}`, { defaultValue: ruleType?.label || type })
}
function getRuleFieldText(t, type, field, prop) {
  return t(`mapping.fields.${type}.${field.payloadKey}.${prop}`, { defaultValue: field[prop] })
}
function getRuleOptionLabel(t, option) {
  const value = option.value || option.id
  return t(`mapping.options.${value}`, { defaultValue: option.label })
}

function RuleStatusToggle({ checked, disabled, loading, onChange }) {
  return (
    <Box
      aria-checked={checked}
      aria-label="Toggle rule status"
      aria-busy={loading}
      component="button"
      disabled={disabled}
      role="switch"
      type="button"
      onClick={() => onChange(!checked)}
      sx={{
        alignItems: 'center',
        bgcolor: checked ? 'success.main' : 'action.disabledBackground',
        border: 0,
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        height: 24,
        opacity: disabled ? 0.6 : 1,
        p: '2px',
        transition: 'background-color 120ms ease',
        width: 42,
      }}
    >
      {loading ? (
        <CircularProgress color="inherit" size={16} sx={{ m: '2px auto' }} />
      ) : (
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: '50%',
            boxShadow: 1,
            height: 20,
            transform: checked ? 'translateX(18px)' : 'translateX(0)',
            transition: 'transform 120ms ease',
            width: 20,
          }}
        />
      )}
    </Box>
  )
}

function TabGuide({ type }) {
  const { t } = useTranslation()
  const guide = TAB_GUIDES[type]
  return (
    <Alert severity="info" variant="outlined">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {t(`mapping.guides.${type}.description`, { defaultValue: guide.description })}
      </Typography>
      <Typography variant="body2">
        {t(`mapping.guides.${type}.primaryAction`, { defaultValue: guide.primaryAction })}
      </Typography>
    </Alert>
  )
}

function RulePreviewCard({ label, preview }) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'action.hover',
        p: 1.5,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle2">{preview.title}</Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {(preview.changes || []).map((change) => (
          <Box
            key={`${change.label}-${change.before}-${change.after}`}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
              p: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {change.label}
            </Typography>
            <Box
              sx={{
                alignItems: 'center',
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
                mt: 0.5,
              }}
            >
              <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                {change.before}
              </Typography>
              <ArrowForwardIcon color="action" fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                {change.after}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {preview.description}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Scope: {preview.scope}
      </Typography>
    </Box>
  )
}

function RuleDialog({ onClose, onSave, optionsBySource, rule, saving, type }) {
  const { t } = useTranslation()
  const config = MAPPING_RULE_FORM_CONFIG[type]
  const [values, setValues] = useState(() => buildMappingRuleInitialValues(type, rule?.raw || {}))
  const [error, setError] = useState('')
  const mainFields = config.fields.filter((field) => !field.advanced)
  const advancedFields = config.fields.filter((field) => field.advanced)
  const getFieldOptions = (field) =>
    field.optionsKey
      ? STATIC_OPTIONS[field.optionsKey] || []
      : field.optionSource
        ? optionsBySource[field.optionSource] || []
        : []
  const renderField = (field) => {
    if (field.payloadKey === 'status')
      return (
        <FormControlLabel
          key={field.payloadKey}
          control={
            <Switch
              checked={(values[field.payloadKey] || 'ACTIVE') === 'ACTIVE'}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.payloadKey]: event.target.checked ? 'ACTIVE' : 'INACTIVE',
                }))
              }
              slotProps={{ input: { 'aria-label': t('mapping.a11y.ruleActive') } }}
            />
          }
          label={
            (values[field.payloadKey] || 'ACTIVE') === 'ACTIVE'
              ? t('mapping.status.active')
              : t('mapping.status.inactive')
          }
          sx={{ alignItems: 'center', minHeight: 40 }}
        />
      )
    const options = getFieldOptions(field)
    const isSelect = field.type === 'select'
    return (
      <TextField
        key={field.payloadKey}
        label={getRuleFieldText(t, type, field, 'label')}
        required={Boolean(field.required && !field.defaultValue)}
        select={isSelect}
        size="small"
        type={field.type === 'number' ? 'number' : 'text'}
        value={values[field.payloadKey] ?? ''}
        helperText={getRuleFieldText(t, type, field, 'helperText')}
        onChange={(event) =>
          setValues((current) => ({ ...current, [field.payloadKey]: event.target.value }))
        }
      >
        {isSelect
          ? [
              <MenuItem key="empty" value="">
                {field.required
                  ? t('mapping.options.selectOption')
                  : t('mapping.options.allNotSet')}
              </MenuItem>,
              ...options.map((option) => (
                <MenuItem key={option.value || option.id} value={option.value || option.id}>
                  {getRuleOptionLabel(t, option)}
                </MenuItem>
              )),
            ]
          : null}
      </TextField>
    )
  }
  const optionLabels = Object.fromEntries(
    config.fields.map((field) => [
      field.payloadKey,
      Object.fromEntries(
        getFieldOptions(field).map((option) => [
          option.value || option.id,
          getRuleOptionLabel(t, option),
        ]),
      ),
    ]),
  )
  const preview = buildMappingRulePreview(type, values, optionLabels)
  const currentPreview = rule
    ? buildMappingRulePreview(
        type,
        buildMappingRuleInitialValues(type, rule.raw || {}),
        optionLabels,
      )
    : null
  const handleSave = async () => {
    const missingField = config.fields.find(
      (field) => field.required && !String(values[field.payloadKey] || '').trim(),
    )
    if (missingField) {
      setError(
        t('mapping.validation.required', {
          field: getRuleFieldText(t, type, missingField, 'label'),
        }),
      )
      return
    }
    setError('')
    try {
      await onSave({ body: buildMappingRulePayload(type, values), id: rule?.id, type })
      onClose()
    } catch (saveError) {
      setError(
        saveError?.response?.data?.message ||
          saveError?.message ||
          t('mapping.messages.ruleSaveFailed'),
      )
    }
  }
  return (
    <Dialog open maxWidth="md" fullWidth onClose={onClose}>
      <DialogTitle>
        {rule
          ? t('mapping.ruleDialog.editTitle', { rule: getRuleTypeLabel(t, type) })
          : t('mapping.ruleDialog.createTitle', { rule: getRuleTypeLabel(t, type) })}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info" variant="outlined">
            {t(`mapping.ruleDescriptions.${type}`, { defaultValue: config.description })}
          </Alert>
          <Alert severity="success" variant="outlined">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('mapping.ruleDialog.howToFill')}
            </Typography>
            <Stack component="ul" spacing={0.5} sx={{ m: 0, mt: 0.5, pl: 2 }}>
              {config.howToFill.map((item, index) => (
                <Typography key={item} component="li" variant="body2">
                  {t(`mapping.howToFill.${type}.${index}`, { defaultValue: item })}
                </Typography>
              ))}
            </Stack>
          </Alert>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            {mainFields.map(renderField)}
          </Box>
          {advancedFields.length ? (
            <Box
              component="details"
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
            >
              <Box component="summary" sx={{ cursor: 'pointer', fontWeight: 700 }}>
                {t('mapping.ruleDialog.advanced')}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('mapping.ruleDialog.advancedDescription')}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                  mt: 1.5,
                }}
              >
                {advancedFields.map(renderField)}
              </Box>
            </Box>
          ) : null}
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: '1fr',
                md: currentPreview ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              },
            }}
          >
            {currentPreview ? (
              <RulePreviewCard label={t('mapping.ruleDialog.current')} preview={currentPreview} />
            ) : null}
            <RulePreviewCard label={t('mapping.ruleDialog.afterSave')} preview={preview} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          aria-busy={saving}
          disabled={saving}
          startIcon={saving ? <CircularProgress color="inherit" size={16} /> : null}
          variant="contained"
          onClick={handleSave}
        >
          {saving ? t('mapping.messages.savingRule') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function RuleInventoryWorkspace({ ruleType: type }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [dialogState, setDialogState] = useState(null)
  const [historyRule, setHistoryRule] = useState(null)
  const [pendingStatusRuleId, setPendingStatusRuleId] = useState('')
  const [ruleSearch, setRuleSearch] = useState('')
  const [ruleStatusFilter, setRuleStatusFilter] = useState('ALL')
  const [rulePage, setRulePage] = useState(0)
  const [ruleRowsPerPage, setRuleRowsPerPage] = useState(defaultRowsPerPage)
  const rulesQuery = useMappingRulesQuery(type, { limit: 100 })
  const optionQueryOptions = { enabled: Boolean(dialogState) }
  const shopsQuery = useListingShopsQuery({}, optionQueryOptions)
  const productTypesQuery = useListingProductTypesQuery({}, optionQueryOptions)
  const vendorsQuery = useVendorsQuery({ limit: 100 }, optionQueryOptions)
  const templatesQuery = useMappingInternalTemplatesQuery({ limit: 100 }, optionQueryOptions)
  const rulePreviewMutation = useMappingRulePreviewMutation()
  const ruleConflictsMutation = useMappingRuleConflictsMutation()
  const saveRuleMutation = useMappingSaveRuleMutation()
  const toggleStatusMutation = useMappingToggleRuleStatusMutation()
  const rows = useMemo(() => mapMappingRuleRows(type, rulesQuery.data), [rulesQuery.data, type])
  const filteredRows = useMemo(
    () =>
      filterBySearch(rows, ruleSearch, (row) => [
        row.label,
        row.match,
        row.output,
        row.scope,
        row.priority,
      ]).filter((row) => ruleStatusFilter === 'ALL' || row.status === ruleStatusFilter),
    [rows, ruleSearch, ruleStatusFilter],
  )
  const safeRulePage = getSafePage(filteredRows.length, rulePage, ruleRowsPerPage)
  const pageRows = useMemo(
    () => paginateRows(filteredRows, safeRulePage, ruleRowsPerPage),
    [filteredRows, ruleRowsPerPage, safeRulePage],
  )
  const optionsBySource = useMemo(
    () => ({
      productTypes: productTypesQuery.data || [],
      shops: shopsQuery.data || [],
      templates: mapTemplateOptions(templatesQuery.data),
      vendors: (vendorsQuery.data?.items || []).map((vendor) => ({
        id: vendor.id,
        label: vendor.name || vendor.displayName || vendor.code || 'Unnamed vendor',
      })),
    }),
    [productTypesQuery.data, shopsQuery.data, templatesQuery.data, vendorsQuery.data],
  )
  const notifyError = (error, fallbackKey) => {
    enqueueSnackbar(error?.response?.data?.message || error?.message || t(fallbackKey), {
      variant: SNACKBAR_VARIANTS.ERROR,
    })
  }
  const saveRule = async (variables) => {
    try {
      const result = await saveRuleMutation.mutateAsync(variables)
      enqueueSnackbar(
        t(variables.id ? 'mapping.messages.ruleUpdated' : 'mapping.messages.ruleCreated'),
        { variant: SNACKBAR_VARIANTS.SUCCESS },
      )
      return result
    } catch (saveError) {
      notifyError(saveError, 'mapping.messages.ruleSaveFailed')
      throw saveError
    }
  }
  const toggleRuleStatus = async (row, checked) => {
    setPendingStatusRuleId(row.id)
    try {
      await toggleStatusMutation.mutateAsync({
        id: row.id,
        nextStatus: checked ? 'ACTIVE' : 'INACTIVE',
        type,
      })
      enqueueSnackbar(t('mapping.messages.ruleStatusUpdated'), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
    } catch (statusError) {
      notifyError(statusError, 'mapping.messages.ruleStatusFailed')
    } finally {
      setPendingStatusRuleId('')
    }
  }
  const error = rulesQuery.error || saveRuleMutation.error || toggleStatusMutation.error
  return (
    <Stack spacing={1.5}>
      <TabGuide type={type} />
      <Box
        sx={{
          alignItems: { xs: 'flex-start', md: 'center' },
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
          width: '100%',
        }}
      >
        <Box>
          <Typography variant="h6">{getRuleTypeLabel(t, type)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('mapping.rules.subtitle')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ justifySelf: { xs: 'flex-start', md: 'end' } }}>
          <Tooltip title={t('mapping.actions.refreshRules')}>
            <IconButton
              size="small"
              aria-label={t('mapping.actions.refreshRules')}
              onClick={() => rulesQuery.refetch()}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('mapping.actions.createRule')}>
            <IconButton
              color="primary"
              size="small"
              aria-label={t('mapping.actions.createRule')}
              onClick={() => setDialogState({ rule: null })}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      {rulesQuery.isFetching ? <LinearProgress /> : null}
      {error ? <Alert severity="error">{error.message}</Alert> : null}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        sx={{ alignItems: { md: 'center' } }}
      >
        <TextField
          fullWidth
          label={t('mapping.filters.searchRules')}
          size="small"
          value={ruleSearch}
          onChange={(event) => {
            setRuleSearch(event.target.value)
            setRulePage(0)
          }}
        />
        <TextField
          label={t('mapping.filters.ruleStatus')}
          select
          size="small"
          sx={{ minWidth: { xs: '100%', md: 180 } }}
          value={ruleStatusFilter}
          onChange={(event) => {
            setRuleStatusFilter(event.target.value)
            setRulePage(0)
          }}
        >
          <MenuItem value="ALL">{t('mapping.filters.allRules')}</MenuItem>
          <MenuItem value="ACTIVE">{t('mapping.status.active')}</MenuItem>
          <MenuItem value="INACTIVE">{t('mapping.status.inactive')}</MenuItem>
        </TextField>
      </Stack>
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 920, tableLayout: 'fixed', ...compactTableSx }}>
          <TableHead>
            <TableRow>
              <TableCell sx={ruleTableColumnSx.rule}>{t('mapping.rules.table.rule')}</TableCell>
              <TableCell sx={ruleTableColumnSx.match}>{t('mapping.rules.table.match')}</TableCell>
              <TableCell sx={ruleTableColumnSx.output}>{t('mapping.rules.table.output')}</TableCell>
              <TableCell sx={ruleTableColumnSx.scope}>{t('mapping.rules.table.scope')}</TableCell>
              <TableCell sx={ruleTableColumnSx.priority}>
                {t('mapping.rules.table.priority')}
              </TableCell>
              <TableCell sx={ruleTableColumnSx.status}>{t('mapping.rules.table.status')}</TableCell>
              <TableCell align="right" sx={ruleTableColumnSx.actions}>
                {t('mapping.rules.table.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((row) => {
              const active = row.status === 'ACTIVE'
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>{row.label}</TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>{row.match}</TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>{row.output}</TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>{row.scope}</TableCell>
                  <TableCell>{row.priority}</TableCell>
                  <TableCell>
                    <Tooltip
                      title={
                        active ? t('mapping.actions.turnRuleOff') : t('mapping.actions.turnRuleOn')
                      }
                    >
                      <Box component="span" sx={ruleStatusSwitchSx}>
                        <RuleStatusToggle
                          checked={active}
                          disabled={toggleStatusMutation.isPending}
                          loading={pendingStatusRuleId === row.id}
                          onChange={(checked) => toggleRuleStatus(row, checked)}
                        />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                      <Tooltip title={t('mapping.actions.editRule')}>
                        <IconButton
                          size="small"
                          aria-label={t('mapping.actions.editRule')}
                          onClick={() => setDialogState({ rule: row })}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('mapping.actions.viewRuleHistory')}>
                        <IconButton
                          size="small"
                          aria-label={t('mapping.actions.viewRuleHistory')}
                          onClick={() => setHistoryRule(row)}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
            {!rulesQuery.isFetching && filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box sx={{ py: 5, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('mapping.rules.empty')}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredRows.length}
          page={safeRulePage}
          rowsPerPage={ruleRowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          onPageChange={(_, page) => setRulePage(page)}
          onRowsPerPageChange={(event) => {
            setRuleRowsPerPage(Number(event.target.value))
            setRulePage(0)
          }}
        />
      </Paper>
      {dialogState ? (
        type === 'vendorRouting' ? (
          <RuleDialog
            onSave={saveRule}
            optionsBySource={optionsBySource}
            rule={dialogState.rule}
            saving={saveRuleMutation.isPending}
            type={type}
            onClose={() => setDialogState(null)}
          />
        ) : (
          <MappingRuleDialog
            onCheckConflicts={ruleConflictsMutation.mutateAsync}
            onClose={() => setDialogState(null)}
            onPreview={rulePreviewMutation.mutateAsync}
            onSave={saveRule}
            open
            optionsBySource={optionsBySource}
            rule={dialogState.rule}
            type={type}
          />
        )
      ) : null}
      {historyRule ? (
        <RuleHistoryDialog
          onClose={() => setHistoryRule(null)}
          open
          rule={historyRule}
          type={type}
        />
      ) : null}
    </Stack>
  )
}
