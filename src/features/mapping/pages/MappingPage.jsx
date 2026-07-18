import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import EditIcon from '@mui/icons-material/Edit'
import RefreshIcon from '@mui/icons-material/Refresh'
import ReplayIcon from '@mui/icons-material/Replay'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  Alert,
  Box,
  Button,
  Chip,
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'

import {
  useListingProductTypesQuery,
  useListingShopsQuery,
} from '@/features/listings/api/listings.queries'
import {
  useMappingPreviewMutation,
  useMappingRecheckMutation,
  useMappingRecheckUnmatchedMutation,
  useMappingResolveMutation,
  useMappingSaveRuleMutation,
  useMappingSelectMutation,
  useMappingToggleRuleStatusMutation,
} from '@/features/mapping/api/mapping.mutations'
import {
  useMappingInternalTemplatesQuery,
  useMappingPlanQuery,
  useMappingRulesQuery,
  useMappingUnmatchedOrderItemsQuery,
} from '@/features/mapping/api/mapping.queries'
import { mappingRuleTypes } from '@/features/mapping/api/mapping.queries'
import {
  buildMappingRuleInitialValues,
  buildMappingRulePayload,
  buildMappingRulePreview,
  MAPPING_RULE_FORM_CONFIG,
  STATIC_OPTIONS,
  TAB_GUIDES,
} from '@/features/mapping/data/mappingUxConfig'
import {
  mapMappingPlan,
  mapMappingPreview,
  mapMappingRuleRows,
  mapMappingWorkbenchRows,
} from '@/features/mapping/utils/mappingMappers'
import { useVendorsQuery } from '@/features/vendors/api/vendors.queries'

const tabs = [{ id: 'resolve' }, ...mappingRuleTypes]
const tabIds = new Set(tabs.map((tab) => tab.id))
const blankBatch = { limit: '50', marketplaceCode: '', salesChannelCode: '', shopId: '' }
const defaultRowsPerPage = 10
const rowsPerPageOptions = [10, 25, 50]
const compactTableSx = {
  borderCollapse: 'separate',
  borderSpacing: 0,
  '& .MuiTableCell-root': {
    px: 1.25,
    py: 0.75,
    verticalAlign: 'middle',
  },
}
const ruleTableColumnSx = {
  rule: { width: 180 },
  match: { width: 140 },
  output: { width: 220 },
  scope: { width: 160 },
  priority: { width: 90 },
  status: { width: 96 },
  actions: { width: 80 },
}
const ruleStatusSwitchSx = {
  display: 'inline-flex',
  width: 48,
  justifyContent: 'center',
}

function RuleStatusToggle({ checked, disabled, onChange }) {
  return (
    <Box
      aria-checked={checked}
      aria-label="Toggle rule status"
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
    </Box>
  )
}

function compactPayload(values) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => {
        if (['appliesWhenValues', 'productTypeAliases'].includes(key)) {
          return [
            key,
            value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          ]
        }
        if (['limit', 'priority', 'segmentIndex'].includes(key) && value !== '') {
          return [key, Number(value)]
        }
        return [key, value]
      })
      .filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0
        return value !== ''
      }),
  )
}

function getItems(payload) {
  if (Array.isArray(payload)) return payload
  return payload?.items || payload?.rows || payload?.results || []
}

function mapTemplateOptions(payload) {
  return getItems(payload).map((item) => ({
    id: item.id || item._id,
    label:
      item.name || item.displayName || item.title || item.label || item.code || 'Unnamed template',
  }))
}

function StatusChip({ value }) {
  const color = value === 'ACTIVE' || value === 'READY' ? 'success' : 'default'
  return <Chip size="small" color={color} label={value || '-'} />
}

function getSearchText(value) {
  if (Array.isArray(value)) return value.join(' ')
  return String(value || '')
}

function filterBySearch(rows, search, getValues) {
  const needle = search.trim().toLowerCase()
  if (!needle) return rows
  return rows.filter((row) =>
    getValues(row).map(getSearchText).join(' ').toLowerCase().includes(needle),
  )
}

function getSafePage(rowCount, page, rowsPerPage) {
  return Math.min(page, Math.max(0, Math.ceil(rowCount / rowsPerPage) - 1))
}

function paginateRows(rows, page, rowsPerPage) {
  return rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
}

function getInitialMappingTab() {
  const searchParams = new URLSearchParams(window.location.search)
  const tab = searchParams.get('tab')
  return tabIds.has(tab) ? tab : 'resolve'
}

function setMappingTabInUrl(tab) {
  const url = new URL(window.location.href)
  if (tab === 'resolve') {
    url.searchParams.delete('tab')
  } else {
    url.searchParams.set('tab', tab)
  }
  window.history.replaceState(null, '', url)
}

function DetailList({ items }) {
  if (!items?.length) return <Typography variant="body2">-</Typography>
  return (
    <Stack spacing={0.5}>
      {items.map((item) => (
        <Typography key={item} variant="body2">
          {item}
        </Typography>
      ))}
    </Stack>
  )
}

function InfoField({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
        {value || '-'}
      </Typography>
    </Box>
  )
}

function TabGuide({ tabId }) {
  const { t } = useTranslation()
  const guide = TAB_GUIDES[tabId]
  if (!guide) return null

  return (
    <Alert severity="info" variant="outlined">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {t(`mapping.guides.${tabId}.description`, { defaultValue: guide.description })}
      </Typography>
      <Typography variant="body2">
        {t(`mapping.guides.${tabId}.primaryAction`, { defaultValue: guide.primaryAction })}
      </Typography>
    </Alert>
  )
}

function BatchRecheckDialog({ mutation, onClose }) {
  const { t } = useTranslation()
  const [values, setValues] = useState(blankBatch)

  return (
    <Dialog open maxWidth="sm" fullWidth onClose={onClose}>
      <DialogTitle>{t('mapping.batchRecheck.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {['shopId', 'salesChannelCode', 'marketplaceCode', 'limit'].map((field) => (
            <TextField
              key={field}
              label={field}
              size="small"
              value={values[field]}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field]: event.target.value }))
              }
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(compactPayload(values), { onSuccess: onClose })}
        >
          {t('mapping.actions.recheck')}
        </Button>
      </DialogActions>
    </Dialog>
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

function getRuleTypeLabel(t, type) {
  const ruleType = mappingRuleTypes.find((item) => item.id === type)
  return t(`mapping.ruleTypes.${type}`, { defaultValue: ruleType?.label || type })
}

function getRuleFieldText(t, type, field, prop) {
  return t(`mapping.fields.${type}.${field.payloadKey}.${prop}`, {
    defaultValue: field[prop],
  })
}

function getRuleOptionLabel(t, option) {
  const value = option.value || option.id
  return t(`mapping.options.${value}`, { defaultValue: option.label })
}

function RuleDialog({ mutation, onClose, optionsBySource, rule, type }) {
  const { t } = useTranslation()
  const config = MAPPING_RULE_FORM_CONFIG[type]
  const [values, setValues] = useState(() => buildMappingRuleInitialValues(type, rule?.raw || {}))
  const [error, setError] = useState('')
  const mainFields = config.fields.filter((field) => !field.advanced)
  const advancedFields = config.fields.filter((field) => field.advanced)

  const getFieldOptions = (field) => {
    if (field.optionsKey) return STATIC_OPTIONS[field.optionsKey] || []
    if (field.optionSource) return optionsBySource[field.optionSource] || []
    return []
  }
  const renderField = (field) => {
    if (field.payloadKey === 'status') {
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
    }

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

  const handleSave = () => {
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
    mutation.mutate(
      { body: buildMappingRulePayload(type, values), id: rule?.id, type },
      { onSuccess: onClose },
    )
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
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
              }}
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
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function ResolveDetail({
  onPreview,
  preview,
  recheckMutation,
  resolveMutation,
  row,
  selectMutation,
}) {
  const { t } = useTranslation()
  const planQuery = useMappingPlanQuery(row?.id, { enabled: Boolean(row?.id) })
  const plan = mapMappingPlan(planQuery.data)

  if (!row) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t('mapping.resolve.selectOrderItem')}
        </Typography>
      </Paper>
    )
  }

  const previewData = preview ? mapMappingPreview(preview) : null
  const canMutate = !resolveMutation.isPending && !recheckMutation.isPending

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h6">{row.itemLabel}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('mapping.resolve.orderLabel', { order: row.orderLabel })}
            </Typography>
          </Box>
          <StatusChip value={previewData?.ready ? 'READY' : row.planStatus} />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          }}
        >
          <InfoField
            label={t('mapping.resolve.originalSku')}
            value={previewData?.originalSku || row.originalSku}
          />
          <InfoField
            label={t('mapping.resolve.canonicalSku')}
            value={previewData?.canonicalSku || row.canonicalSku}
          />
          <InfoField
            label={t('mapping.resolve.configCode')}
            value={previewData?.configCode || row.configCode}
          />
          <InfoField
            label={t('mapping.resolve.plan')}
            value={`${plan.status} / ${plan.selectionMode}`}
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            {t('mapping.resolve.blockingReasons')}
          </Typography>
          <DetailList
            items={
              previewData?.blockingReasons.length
                ? previewData.blockingReasons
                : row.blockingReasons
            }
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            {t('mapping.resolve.recommendedFixes')}
          </Typography>
          <DetailList items={row.recommendedFixes} />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            {t('mapping.resolve.normalizedInputs')}
          </Typography>
          <DetailList
            items={
              previewData?.normalizedInputs.length
                ? previewData.normalizedInputs
                : row.normalizedInputs
            }
          />
        </Box>

        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Tooltip title={t('mapping.actions.previewMapping')}>
            <IconButton
              size="small"
              color="primary"
              aria-label={t('mapping.actions.previewMapping')}
              onClick={() => onPreview(row.id)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('mapping.actions.autoResolve')}>
            <span>
              <IconButton
                size="small"
                disabled={!canMutate}
                aria-label={t('mapping.actions.autoResolve')}
                onClick={() => resolveMutation.mutate(row.id)}
              >
                <AutoFixHighIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('mapping.actions.recheckMapping')}>
            <span>
              <IconButton
                size="small"
                disabled={!canMutate}
                aria-label={t('mapping.actions.recheckMapping')}
                onClick={() => recheckMutation.mutate(row.id)}
              >
                <ReplayIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {previewData ? (
          <Box>
            <Typography variant="subtitle2">{t('mapping.resolve.costCenterCandidates')}</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {previewData.costCenterCandidates.map((candidate) => (
                <Paper key={candidate.id || candidate.label} variant="outlined" sx={{ p: 1 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    gap={1}
                  >
                    <Typography variant="body2">{candidate.label}</Typography>
                    <Tooltip title={t('mapping.actions.selectCandidate')}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={!candidate.vendorProductId || !candidate.vendorCostCenterId}
                          aria-label={t('mapping.actions.selectCandidate')}
                          onClick={() =>
                            selectMutation.mutate({
                              body: {
                                vendorCostCenterId: candidate.vendorCostCenterId,
                                vendorProductId: candidate.vendorProductId,
                              },
                              orderItemId: row.id,
                            })
                          }
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Paper>
              ))}
              {previewData.costCenterCandidates.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('mapping.resolve.noCandidates')}
                </Typography>
              ) : null}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  )
}

function ResolveQueue() {
  const { t } = useTranslation()
  const [selectedRow, setSelectedRow] = useState(null)
  const [preview, setPreview] = useState(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const [resolveSearch, setResolveSearch] = useState('')
  const [resolvePage, setResolvePage] = useState(0)
  const [resolveRowsPerPage, setResolveRowsPerPage] = useState(defaultRowsPerPage)
  const query = useMemo(
    () => ({ limit: resolveRowsPerPage, page: resolvePage + 1 }),
    [resolvePage, resolveRowsPerPage],
  )
  const unmatchedQuery = useMappingUnmatchedOrderItemsQuery(query)
  const rows = useMemo(() => mapMappingWorkbenchRows(unmatchedQuery.data), [unmatchedQuery.data])
  const filteredRows = useMemo(
    () =>
      filterBySearch(rows, resolveSearch, (row) => [
        row.itemLabel,
        row.orderLabel,
        row.originalSku,
        row.canonicalSku,
        row.configCode,
        row.blockingReasons,
        row.recommendedFixes,
      ]),
    [resolveSearch, rows],
  )
  const totalRows = resolveSearch.trim()
    ? filteredRows.length
    : unmatchedQuery.data?.pagination?.total || unmatchedQuery.data?.total || rows.length
  const pageRows = filteredRows
  const previewMutation = useMappingPreviewMutation()
  const resolveMutation = useMappingResolveMutation()
  const recheckMutation = useMappingRecheckMutation()
  const selectMutation = useMappingSelectMutation()
  const recheckUnmatchedMutation = useMappingRecheckUnmatchedMutation()
  const error =
    unmatchedQuery.error ||
    previewMutation.error ||
    resolveMutation.error ||
    recheckMutation.error ||
    selectMutation.error ||
    recheckUnmatchedMutation.error

  return (
    <Stack spacing={1.5}>
      <TabGuide tabId="resolve" />
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}>
        <Box>
          <Typography variant="h6">{t('mapping.resolve.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('mapping.resolve.subtitle')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={t('mapping.actions.refreshQueue')}>
            <IconButton
              size="small"
              aria-label={t('mapping.actions.refreshQueue')}
              onClick={() => unmatchedQuery.refetch()}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" onClick={() => setBatchOpen(true)}>
            {t('mapping.batchRecheck.title')}
          </Button>
        </Stack>
      </Stack>

      {unmatchedQuery.isFetching ? <LinearProgress /> : null}
      {error ? <Alert severity="error">{error.message}</Alert> : null}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        sx={{ alignItems: { md: 'center' } }}
      >
        <TextField
          fullWidth
          label={t('mapping.filters.searchResolve')}
          size="small"
          value={resolveSearch}
          onChange={(event) => {
            setResolveSearch(event.target.value)
            setResolvePage(0)
          }}
        />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.4fr) minmax(360px, 0.8fr)' },
        }}
      >
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 840, ...compactTableSx }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('mapping.resolve.table.orderItem')}</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>{t('mapping.resolve.table.config')}</TableCell>
                <TableCell>{t('mapping.resolve.table.blocking')}</TableCell>
                <TableCell>{t('mapping.resolve.table.fix')}</TableCell>
                <TableCell>{t('mapping.resolve.table.plan')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  selected={selectedRow?.id === row.id}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedRow(row)
                    setPreview(null)
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {row.itemLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.orderLabel}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.canonicalSku}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.originalSku}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.configCode}</TableCell>
                  <TableCell>{row.blockingReasons.join(', ') || '-'}</TableCell>
                  <TableCell>{row.recommendedFixes.join(', ') || '-'}</TableCell>
                  <TableCell>
                    <StatusChip value={row.planStatus} />
                  </TableCell>
                </TableRow>
              ))}
              {!unmatchedQuery.isFetching && filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('mapping.resolve.empty')}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalRows}
            page={resolvePage}
            rowsPerPage={resolveRowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={(_, page) => setResolvePage(page)}
            onRowsPerPageChange={(event) => {
              setResolveRowsPerPage(Number(event.target.value))
              setResolvePage(0)
            }}
          />
        </Paper>

        <ResolveDetail
          preview={preview}
          recheckMutation={recheckMutation}
          resolveMutation={resolveMutation}
          row={selectedRow}
          selectMutation={selectMutation}
          onPreview={(orderItemId) =>
            previewMutation.mutate(orderItemId, {
              onSuccess: setPreview,
            })
          }
        />
      </Box>

      {batchOpen ? (
        <BatchRecheckDialog
          mutation={recheckUnmatchedMutation}
          onClose={() => setBatchOpen(false)}
        />
      ) : null}
    </Stack>
  )
}

function RuleSection({ type }) {
  const { t } = useTranslation()
  const [dialogState, setDialogState] = useState(null)
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

  return (
    <Stack spacing={1.5}>
      <TabGuide tabId={type} />
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
      {rulesQuery.error || saveRuleMutation.error || toggleStatusMutation.error ? (
        <Alert severity="error">
          {(rulesQuery.error || saveRuleMutation.error || toggleStatusMutation.error).message}
        </Alert>
      ) : null}

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
                          onChange={(checked) =>
                            toggleStatusMutation.mutate({
                              id: row.id,
                              nextStatus: checked ? 'ACTIVE' : 'INACTIVE',
                              type,
                            })
                          }
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
        <RuleDialog
          mutation={saveRuleMutation}
          optionsBySource={optionsBySource}
          rule={dialogState.rule}
          type={type}
          onClose={() => setDialogState(null)}
        />
      ) : null}
    </Stack>
  )
}

export default function MappingPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(getInitialMappingTab)
  const isResolve = activeTab === 'resolve'

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h1">{t('mapping.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('mapping.subtitle')}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            variant="scrollable"
            scrollButtons="auto"
            onChange={(_, nextValue) => {
              setActiveTab(nextValue)
              setMappingTabInUrl(nextValue)
            }}
          >
            {tabs.map((tab) => (
              <Tab key={tab.id} label={getRuleTypeLabel(t, tab.id)} value={tab.id} />
            ))}
          </Tabs>
        </Paper>

        {isResolve ? <ResolveQueue /> : <RuleSection key={activeTab} type={activeTab} />}
      </Stack>
    </Box>
  )
}
