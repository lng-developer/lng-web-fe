import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import FileDownloadDoneIcon from '@mui/icons-material/FileDownloadDone'
import RefreshIcon from '@mui/icons-material/Refresh'
import ReplayIcon from '@mui/icons-material/Replay'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useMappingPreviewMutation,
  useMappingRecheckMutation,
  useMappingRecheckUnmatchedMutation,
  useMappingResolveMutation,
  useMappingSelectMutation,
} from '@/features/mapping/api/mapping.mutations'
import { useMappingUnmatchedOrderItemsQuery } from '@/features/mapping/api/mapping.queries'
import { mapMappingPreview, mapMappingWorkbenchRows } from '@/features/mapping/utils/mappingMappers'
import {
  filterResolveQueueRows,
  initialResolveQueueState,
  resolveQueueReducer,
} from '@/features/mapping/utils/resolveQueueState'

const blankBatch = { limit: '50', marketplaceCode: '', salesChannelCode: '', shopId: '' }

function compactPayload(values) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) =>
        ['limit'].includes(key) && value !== '' ? [key, Number(value)] : [key, value],
      )
      .filter(([, value]) => value !== ''),
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

// Draggable Active Item Card
function DraggableSourceCard({ row }) {
  const [isDragging, setIsDragging] = useState(false)
  const { t } = useTranslation()

  if (!row) return null

  return (
    <Box
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', row.id)
        e.dataTransfer.effectAllowed = 'move'
        // Add a slight delay before setting dragging state to allow drag image to render
        setTimeout(() => setIsDragging(true), 10)
      }}
      onDragEnd={() => setIsDragging(false)}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '2px solid',
        borderColor: 'primary.main',
        bgcolor: 'background.paper',
        boxShadow: isDragging ? 4 : 1,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        '&:active': { cursor: 'grabbing' },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative drag handle background */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 32,
          bgcolor: 'primary.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DragIndicatorIcon color="primary" />
      </Box>

      <Box sx={{ ml: 4, flex: 1 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase' }}
        >
          {t('mapping.workbench.activeItem', { defaultValue: 'Item to Map' })}
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.5, lineHeight: 1.2 }}>
          {row.itemLabel}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Order: {row.orderLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            •
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SKU: <strong>{row.originalSku}</strong>
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}

// Dropzone Candidate Card
function CandidateDropzone({ candidate, onSelect, isSelecting, rowId }) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const droppedId = e.dataTransfer.getData('text/plain')
        if (droppedId === rowId && !isSelecting) {
          onSelect(candidate)
        }
      }}
      onClick={() => {
        if (!isSelecting) onSelect(candidate)
      }}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '2px dashed',
        borderColor: isDragOver ? 'primary.main' : 'divider',
        bgcolor: isDragOver ? 'primary.50' : 'background.paper',
        cursor: isSelecting ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        '&:hover': {
          borderColor: isSelecting ? 'divider' : 'primary.main',
          bgcolor: isSelecting ? 'background.paper' : 'action.hover',
        },
        opacity: isSelecting ? 0.7 : 1,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: isDragOver ? 'primary.main' : 'surface.subtle',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          color: isDragOver ? 'primary.contrastText' : 'text.secondary',
        }}
      >
        {isSelecting ? <CircularProgress size={24} /> : <FileDownloadDoneIcon />}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {candidate.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Cost Center ID: {candidate.vendorCostCenterId || '-'}
        </Typography>
      </Box>
    </Box>
  )
}

export default function ResolveQueueWorkspace() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [state, dispatch] = useReducer(resolveQueueReducer, initialResolveQueueState)
  const [batchOpen, setBatchOpen] = useState(false)
  const activePreviewId = useRef(null)
  const [selectingCandidateId, setSelectingCandidateId] = useState(null)

  const query = useMemo(
    () => ({ limit: 100, page: 1 }),
    [], // Fetch 100 items for continuous queue
  )
  const unmatchedQuery = useMappingUnmatchedOrderItemsQuery(query)
  const rows = useMemo(() => mapMappingWorkbenchRows(unmatchedQuery.data), [unmatchedQuery.data])
  const filteredRows = useMemo(
    () => filterResolveQueueRows(rows, state.resolveSearch),
    [rows, state.resolveSearch],
  )

  // Mutations
  const previewMutation = useMappingPreviewMutation()
  const resolveMutation = useMappingResolveMutation()
  const recheckMutation = useMappingRecheckMutation()
  const selectMutation = useMappingSelectMutation()
  const recheckUnmatchedMutation = useMappingRecheckUnmatchedMutation()

  // Auto-select first row if none selected
  useEffect(() => {
    if (!state.selectedRow && filteredRows.length > 0) {
      dispatch({ row: filteredRows[0], type: 'select-row' })
    }
  }, [state.selectedRow, filteredRows])

  const selectedRow = state.selectedRow

  // Auto-fetch preview when selected row changes
  useEffect(() => {
    if (selectedRow?.id && selectedRow.id !== activePreviewId.current) {
      activePreviewId.current = selectedRow.id
      previewMutation.mutate(selectedRow.id, {
        onSuccess: (preview) => dispatch({ preview, type: 'set-preview' }),
      })
    }
  }, [selectedRow?.id, previewMutation])

  const handleSelectCandidate = useCallback(
    (candidate) => {
      if (!selectedRow || !candidate.vendorCostCenterId) return

      setSelectingCandidateId(candidate.vendorCostCenterId)

      selectMutation.mutate(
        {
          body: {
            vendorCostCenterId: candidate.vendorCostCenterId,
            vendorProductId: candidate.vendorProductId,
          },
          orderItemId: selectedRow.id,
        },
        {
          onSuccess: () => {
            enqueueSnackbar(
              t('mapping.messages.mappingSuccess', { defaultValue: 'Mapping successful!' }),
              {
                variant: SNACKBAR_VARIANTS.SUCCESS,
              },
            )
            // Auto-Next: find current index, select next
            const currentIndex = filteredRows.findIndex((r) => r.id === selectedRow.id)
            if (currentIndex >= 0 && currentIndex < filteredRows.length - 1) {
              dispatch({ row: filteredRows[currentIndex + 1], type: 'select-row' })
            } else {
              unmatchedQuery.refetch()
            }
          },
          onError: (err) => {
            enqueueSnackbar(
              err.message ||
                t('mapping.messages.mappingFailed', { defaultValue: 'Mapping failed.' }),
              {
                variant: SNACKBAR_VARIANTS.ERROR,
              },
            )
          },
          onSettled: () => {
            setSelectingCandidateId(null)
          },
        },
      )
    },
    [selectedRow, filteredRows, selectMutation, unmatchedQuery, enqueueSnackbar, t],
  )

  const handleSkipNext = useCallback(() => {
    if (!selectedRow) return
    const currentIndex = filteredRows.findIndex((r) => r.id === selectedRow.id)
    if (currentIndex >= 0 && currentIndex < filteredRows.length - 1) {
      dispatch({ row: filteredRows[currentIndex + 1], type: 'select-row' })
    } else {
      unmatchedQuery.refetch()
    }
  }, [selectedRow, filteredRows, unmatchedQuery])

  const previewData = state.preview ? mapMappingPreview(state.preview) : null
  const canMutate = !resolveMutation.isPending && !recheckMutation.isPending

  const error =
    unmatchedQuery.error ||
    previewMutation.error ||
    resolveMutation.error ||
    recheckMutation.error ||
    selectMutation.error ||
    recheckUnmatchedMutation.error

  return (
    <Stack spacing={1.5} sx={{ height: 'calc(100vh - 120px)', minHeight: 0 }}>
      {/* Header */}
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

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '350px minmax(0, 1fr)' },
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left Sidebar: Queue */}
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            flexCol: 'column',
            overflow: 'hidden',
            height: '100%',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              fullWidth
              placeholder={t('mapping.filters.searchResolve', { defaultValue: 'Search Queue...' })}
              size="small"
              value={state.resolveSearch}
              onChange={(event) => {
                dispatch({ search: event.target.value, type: 'set-search' })
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {filteredRows.length}{' '}
              {t('mapping.workbench.pendingTasks', { defaultValue: 'items remaining' })}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {filteredRows.map((row) => {
              const active = selectedRow?.id === row.id
              return (
                <Box
                  key={row.id}
                  onClick={() => dispatch({ row, type: 'select-row' })}
                  sx={{
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: active ? 'primary.50' : 'background.paper',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: active ? 'primary.50' : 'action.hover' },
                    borderLeft: active ? '4px solid' : '4px solid transparent',
                    borderLeftColor: active ? 'primary.main' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: active ? 700 : 500 }}>
                    {row.itemLabel}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    SKU: {row.originalSku}
                  </Typography>
                </Box>
              )
            })}
            {filteredRows.length === 0 && !unmatchedQuery.isFetching && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {t('mapping.resolve.empty', { defaultValue: 'No unmapped items found.' })}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Right Main Area: Workspace */}
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: '100%',
            bgcolor: 'surface.subtle',
          }}
        >
          {selectedRow ? (
            <>
              <Box
                sx={{
                  p: 3,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1, pr: 3 }}>
                    <DraggableSourceCard row={selectedRow} />

                    <Box
                      sx={{
                        mt: 2,
                        p: 1.5,
                        bgcolor: 'surface.subtle',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t('mapping.resolve.blockingReasons', { defaultValue: 'Blocking Reasons' })}
                      </Typography>
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        {(previewData?.blockingReasons.length
                          ? previewData.blockingReasons
                          : selectedRow.blockingReasons
                        )?.map((item, idx) => (
                          <Typography key={idx} variant="body2" color="error.main">
                            • {item}
                          </Typography>
                        )) || <Typography variant="body2">-</Typography>}
                      </Stack>
                    </Box>
                  </Box>

                  <Stack spacing={1}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      endIcon={<SkipNextIcon />}
                      onClick={handleSkipNext}
                    >
                      {t('mapping.actions.skipNext', { defaultValue: 'Skip & Next' })}
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={!canMutate}
                      startIcon={<AutoFixHighIcon />}
                      onClick={() => resolveMutation.mutate(selectedRow.id)}
                    >
                      {t('mapping.actions.autoResolve', { defaultValue: 'Auto-Resolve' })}
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={!canMutate}
                      startIcon={<ReplayIcon />}
                      onClick={() => recheckMutation.mutate(selectedRow.id)}
                    >
                      {t('mapping.actions.recheckMapping', { defaultValue: 'Recheck' })}
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  {t('mapping.resolve.costCenterCandidates', {
                    defaultValue: 'Suggested Internal SKUs (Drag & Drop here)',
                  })}
                </Typography>

                {previewMutation.isPending ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : previewData?.costCenterCandidates?.length > 0 ? (
                  <Stack spacing={2}>
                    {previewData.costCenterCandidates.map((candidate) => (
                      <CandidateDropzone
                        key={candidate.id || candidate.label || candidate.vendorCostCenterId}
                        candidate={candidate}
                        rowId={selectedRow.id}
                        isSelecting={selectingCandidateId === candidate.vendorCostCenterId}
                        onSelect={handleSelectCandidate}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      {t('mapping.resolve.noCandidates', {
                        defaultValue:
                          'No suggestions found. You may need to create a new mapping rule manually.',
                      })}
                    </Typography>
                  </Paper>
                )}
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                p: 4,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                {t('mapping.workbench.selectTask', {
                  defaultValue: 'Select an item from the queue to start mapping.',
                })}
              </Typography>
            </Box>
          )}
        </Paper>
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
