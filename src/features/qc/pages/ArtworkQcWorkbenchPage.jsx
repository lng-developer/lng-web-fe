import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Alert, Button, CircularProgress, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import { SNACKBAR_VARIANTS } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import {
  useReplaceProductionQcArtworkMutation,
  useSubmitProductionQcMutation,
} from '@/features/production/api/production.mutations'
import {
  useProductionShopsQuery,
  useProductionTasksQuery,
} from '@/features/production/api/production.queries'
import ArtworkQcPanel from '@/features/qc/components/ArtworkQcPanel'
import ArtworkViewer from '@/features/qc/components/ArtworkViewer'
import { QC_STATUS_TABS } from '@/features/qc/constants/qcConstants'
import {
  buildQcImageReviewItems,
  buildQcTaskQuery,
  mapProductionTaskToQcRow,
} from '@/features/qc/utils/qcApi'
import { createQcPreviewImageSource, isProtectedMediaDownload } from '@/features/qc/utils/qcMedia'
import { apiClient } from '@/services/axiosInstance'

const DEFAULT_LAYER_SIZE = 320

function createInitialLayer(layer, index) {
  return {
    ...layer,
    x: 40 + index * 24,
    y: 40 + index * 24,
    width: DEFAULT_LAYER_SIZE,
    height: DEFAULT_LAYER_SIZE,
    originalWidth: null,
    originalHeight: null,
  }
}

export default function ArtworkQcWorkbenchPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const location = useLocation()

  // Find taskId from query params (if any)
  const queryParams = new URLSearchParams(location.search)
  const urlTaskId = queryParams.get('taskId')

  // Fetch pending tasks
  const taskFilters = useMemo(
    () => ({
      statusTab: QC_STATUS_TABS.PENDING,
      page: 1,
      pageSize: 20,
    }),
    [],
  )
  const taskQuery = useMemo(() => buildQcTaskQuery(taskFilters), [taskFilters])
  const tasksQuery = useProductionTasksQuery(taskQuery, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const shopsQuery = useProductionShopsQuery(
    { page: 1, limit: 100 },
    { staleTime: 5 * 60_000, refetchOnWindowFocus: false },
  )

  const shopOptions = useMemo(
    () =>
      (shopsQuery.data?.items || []).map((shop) => ({
        value: String(shop.id),
        label: shop.name || shop.code || String(shop.id),
      })),
    [shopsQuery.data],
  )
  const shopNameById = useMemo(
    () => new Map(shopOptions.map((shop) => [shop.value, shop.label])),
    [shopOptions],
  )

  const tasks = useMemo(
    () =>
      (tasksQuery.data?.items || []).map((task) =>
        mapProductionTaskToQcRow(task, { shopNameById }),
      ),
    [shopNameById, tasksQuery.data],
  )

  // Select task
  const [activeTaskId, setActiveTaskId] = useState(urlTaskId || null)

  useEffect(() => {
    if (!activeTaskId && tasks.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTaskId(tasks[0].id)
    }
  }, [activeTaskId, tasks])

  const task = useMemo(
    () => tasks.find((t) => String(t.id) === String(activeTaskId)) || tasks[0],
    [activeTaskId, tasks],
  )

  const submitQcMutation = useSubmitProductionQcMutation()
  const replaceArtworkMutation = useReplaceProductionQcArtworkMutation()

  // Artwork Logic
  const [layers, setLayers] = useState([])
  const [resolvedImageSources, setResolvedImageSources] = useState({})
  const [viewMode, setViewMode] = useState('single')

  const previewItems = useMemo(() => buildQcImageReviewItems(task || {}), [task])
  const currentItem = previewItems[0]

  const imageUrls = useMemo(
    () =>
      [...(currentItem?.layers || []), ...(currentItem?.referenceImages || [])]
        .map((image) => image.url)
        .filter(Boolean),
    [currentItem],
  )
  const imageUrlsKey = imageUrls.join('|')

  const resolveImageUrl = useCallback(
    (url) => resolvedImageSources[url] || (isProtectedMediaDownload(url) ? '' : url),
    [resolvedImageSources],
  )

  const resolvedSlotLayers = useMemo(
    () =>
      (currentItem?.layers || []).map((layer) => ({ ...layer, url: resolveImageUrl(layer.url) })),
    [currentItem, resolveImageUrl],
  )

  useEffect(() => {
    if (!currentItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLayers([])
      setViewMode('single')
      return
    }
    const nextLayers = resolvedSlotLayers.filter((layer) => layer.url).map(createInitialLayer)

    setLayers(nextLayers)
    setViewMode('single')
  }, [currentItem, resolvedSlotLayers])

  useEffect(() => {
    if (!task) return undefined

    let cancelled = false
    let sources = []

    void Promise.all(
      imageUrls.map(async (url) => {
        try {
          return await createQcPreviewImageSource(url, {
            fetchBlob: (path) => apiClient.get(path, { responseType: 'blob' }),
            createObjectUrl: URL.createObjectURL,
            revokeObjectUrl: URL.revokeObjectURL,
          })
        } catch {
          return { url: '', revoke: () => {} }
        }
      }),
    ).then((nextSources) => {
      sources = nextSources
      if (cancelled) {
        nextSources.forEach((source) => source.revoke())
        return
      }
      setResolvedImageSources(
        Object.fromEntries(imageUrls.map((url, index) => [url, nextSources[index].url])),
      )
    })

    return () => {
      cancelled = true
      sources.forEach((source) => source.revoke())
    }
  }, [imageUrls, imageUrlsKey, task])

  const handleImageLoad = useCallback((layerId, imageElement) => {
    setLayers((current) =>
      current.map((layer) => {
        if (layer.id !== layerId || layer.originalWidth) return layer
        const viewportWidth = window.innerWidth * 0.6 // rough estimation of viewer width
        const viewportHeight = window.innerHeight * 0.8
        const originalWidth = imageElement.naturalWidth || DEFAULT_LAYER_SIZE
        const originalHeight = imageElement.naturalHeight || DEFAULT_LAYER_SIZE
        const fitScale = Math.min(
          ((viewportWidth || DEFAULT_LAYER_SIZE) * 0.72) / originalWidth,
          ((viewportHeight || DEFAULT_LAYER_SIZE) * 0.72) / originalHeight,
          1,
        )
        const width = originalWidth * fitScale
        const height = originalHeight * fitScale
        const x = ((viewportWidth || width) - width) / 2
        const y = ((viewportHeight || height) - height) / 2

        return {
          ...layer,
          originalWidth,
          originalHeight,
          width,
          height,
          x,
          y,
        }
      }),
    )
  }, [])

  const handleOverlayChange = useCallback((nextGeometry) => {
    if (!nextGeometry) return
    setLayers((current) =>
      current.map((layer) => {
        if (layer.id !== nextGeometry.id) return layer
        return {
          ...layer,
          x: nextGeometry.x,
          y: nextGeometry.y,
          width: nextGeometry.width,
          height: nextGeometry.height,
        }
      }),
    )
  }, [])

  const baseLayer = layers.find((layer) => layer.kind === 'output') || layers[0] || null
  const inputLayer = layers.find((layer) => layer.kind === 'input') || null

  // Actions
  async function submitDecision(decision, note = '') {
    if (!task) return
    try {
      await submitQcMutation.mutateAsync({
        taskId: task.id,
        decision,
        note,
      })
      enqueueSnackbar(
        t(decision === 'PASSED' ? 'qc.messages.passSuccess' : 'qc.messages.rejectSuccess'),
        { variant: SNACKBAR_VARIANTS.SUCCESS },
      )
      // Move to next task
      const currentIndex = tasks.findIndex((t) => t.id === task.id)
      if (currentIndex >= 0 && currentIndex < tasks.length - 1) {
        setActiveTaskId(tasks[currentIndex + 1].id)
      } else {
        tasksQuery.refetch() // Fetch more
      }
    } catch (error) {
      enqueueSnackbar(error?.message || t('qc.messages.decisionError'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  async function handleReplaceArtwork(file) {
    if (!task || !baseLayer) return
    const fileCheckId = baseLayer.sourceId

    if (!fileCheckId || fileCheckId.startsWith('layer-')) {
      enqueueSnackbar(
        t('qc.artwork.noFileCheckId', {
          defaultValue: 'Cannot identify the correct slot to replace.',
        }),
        {
          variant: SNACKBAR_VARIANTS.ERROR,
        },
      )
      return
    }

    try {
      await replaceArtworkMutation.mutateAsync({
        taskId: task.id,
        fileCheckId,
        file,
      })
      enqueueSnackbar(
        t('qc.artwork.replaceSuccess', { defaultValue: 'Artwork replaced successfully!' }),
        {
          variant: SNACKBAR_VARIANTS.SUCCESS,
        },
      )
      // Refetch current task details
      tasksQuery.refetch()
    } catch (error) {
      enqueueSnackbar(
        error?.message ||
          t('qc.artwork.replaceError', { defaultValue: 'Failed to replace artwork' }),
        {
          variant: SNACKBAR_VARIANTS.ERROR,
        },
      )
    }
  }

  if (tasksQuery.isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-page">
        <CircularProgress />
      </div>
    )
  }

  if (tasksQuery.isError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-page p-6">
        <Alert severity="error">{tasksQuery.error?.message || 'Failed to load tasks'}</Alert>
        <Button className="mt-4" onClick={() => tasksQuery.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden bg-page">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
        <Button
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(ROUTES.QC)}
          className="text-ink-muted"
        >
          {t('common.actions.back', { defaultValue: 'Back to QC' })}
        </Button>
        <Typography variant="h6" className="font-bold text-ink-strong">
          {t('qc.artwork.workbenchTitle', { defaultValue: 'Artwork QC Workbench' })}
        </Typography>
        <div className="ml-auto text-sm text-ink-muted">
          {tasks.length} {t('qc.artwork.pendingTasks', { defaultValue: 'pending tasks in queue' })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex min-h-0 flex-1 flex-col gap-6 p-6 md:flex-row">
        {/* Left: Artwork Viewer */}
        <div className="min-w-0 flex-1">
          {baseLayer ? (
            <ArtworkViewer
              baseLayer={baseLayer}
              displayOverlay={viewMode === 'compare' ? inputLayer : null}
              canCompare={Boolean(inputLayer)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onImageLoad={handleImageLoad}
              onOverlayChange={handleOverlayChange}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-border bg-surface">
              <Typography className="text-ink-muted">
                {t('qc.artwork.noArtwork', { defaultValue: 'No artwork available for this task' })}
              </Typography>
            </div>
          )}
        </div>

        {/* Right: Operations Panel */}
        <div className="w-full shrink-0 md:w-80 lg:w-96">
          <ArtworkQcPanel
            task={task}
            decisionLoading={submitQcMutation.isPending || replaceArtworkMutation.isPending}
            onApprove={() => submitDecision('PASSED')}
            onReject={() => submitDecision('REJECTED', 'Rejected in Workbench')}
            onReplaceArtwork={handleReplaceArtwork}
          />
        </div>
      </main>
    </div>
  )
}
