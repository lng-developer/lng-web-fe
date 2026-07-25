import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import RefreshIcon from '@mui/icons-material/Refresh'
import ReplayIcon from '@mui/icons-material/Replay'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
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

import { StatusBadge } from '@/components/operations'
import {
  useMappingPreviewMutation,
  useMappingRecheckMutation,
  useMappingRecheckUnmatchedMutation,
  useMappingResolveMutation,
  useMappingSelectMutation,
} from '@/features/mapping/api/mapping.mutations'
import {
  useMappingPlanQuery,
  useMappingUnmatchedOrderItemsQuery,
} from '@/features/mapping/api/mapping.queries'
import { TAB_GUIDES } from '@/features/mapping/data/mappingUxConfig'
import {
  mapMappingPlan,
  mapMappingPreview,
  mapMappingWorkbenchRows,
} from '@/features/mapping/utils/mappingMappers'

const blankBatch = { limit: '50', marketplaceCode: '', salesChannelCode: '', shopId: '' }
const defaultRowsPerPage = 10
const rowsPerPageOptions = [10, 25, 50]
const compactTableSx = {
  borderCollapse: 'separate',
  borderSpacing: 0,
  '& .MuiTableCell-root': { px: 1.25, py: 0.75, verticalAlign: 'middle' },
}

function compactPayload(values) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) =>
        ['limit'].includes(key) && value !== '' ? [key, Number(value)] : [key, value],
      )
      .filter(([, value]) => value !== ''),
  )
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

function StatusChip({ value }) {
  return (
    <StatusBadge tone={value === 'ACTIVE' || value === 'READY' ? 'success' : 'neutral'}>
      {value || '-'}
    </StatusBadge>
  )
}

function DetailList({ items }) {
  return items?.length ? (
    <Stack spacing={0.5}>
      {items.map((item) => (
        <Typography key={item} variant="body2">
          {item}
        </Typography>
      ))}
    </Stack>
  ) : (
    <Typography variant="body2">-</Typography>
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

function TabGuide() {
  const { t } = useTranslation()
  const guide = TAB_GUIDES.resolve
  return (
    <Alert severity="info" variant="outlined">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {t('mapping.guides.resolve.description', { defaultValue: guide.description })}
      </Typography>
      <Typography variant="body2">
        {t('mapping.guides.resolve.primaryAction', { defaultValue: guide.primaryAction })}
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
  if (!row)
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t('mapping.resolve.selectOrderItem')}
        </Typography>
      </Paper>
    )

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

export default function ResolveQueueWorkspace() {
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
      <TabGuide />
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
              {filteredRows.map((row) => (
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
            previewMutation.mutate(orderItemId, { onSuccess: setPreview })
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
