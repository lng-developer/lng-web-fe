import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RemoveIcon from '@mui/icons-material/Remove'
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Pagination,
  Slider,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import ImagePreview from '@/components/common/ImagePreview'
import InlineDetailValue from '@/components/common/InlineDetailValue'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { buildQcImageReviewItems } from '@/features/qc/utils/qcApi'
import {
  computeQcLayerMove,
  computeQcLayerResize,
  computeQcWheelView,
  formatQcCustomizationValue,
  shouldSuppressBrowserZoomWheel,
} from '@/features/qc/utils/qcCanvas'
import { createQcPreviewImageSource, isProtectedMediaDownload } from '@/features/qc/utils/qcMedia'
import { apiClient } from '@/services/axiosInstance'

const MIN_STAGE_SCALE = 0.25
const MAX_STAGE_SCALE = 50
const ZOOM_STEP = 1.15
const DEFAULT_BG_COLOR = '#2f6f8a'
const DEFAULT_LAYER_SIZE = 320
const DEFAULT_OVERLAY_OPACITY = 0.5

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

function ValueBadge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex h-6 max-w-full items-center rounded-full border border-border bg-surface px-2.5 text-xs font-semibold text-ink-secondary ${className}`}
    >
      <span className="truncate">{children || '-'}</span>
    </span>
  )
}

function InfoRow({ label, value, children }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <Typography variant="caption" className="shrink-0 text-xs font-semibold text-ink">
        {label}
      </Typography>
      <div className="min-w-0">{children || <ValueBadge>{value}</ValueBadge>}</div>
    </div>
  )
}

function ThumbnailCard({ active, image, onClick, unavailableLabel }) {
  const content = (
    <>
      {image.url ? (
        <div className="flex h-28 w-full items-center justify-center rounded-md bg-neutral-bg">
          <img
            src={image.url}
            alt={onClick ? '' : image.label}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-md bg-neutral-bg">
          <ImageOutlinedIcon className="text-ink-muted" />
        </div>
      )}
      <Typography className="mt-2 truncate text-center text-xs font-semibold text-ink-muted">
        {image.label}
      </Typography>
      {unavailableLabel ? (
        <Typography className="mt-1 text-center text-xs font-semibold text-error">
          {unavailableLabel}
        </Typography>
      ) : null}
    </>
  )
  const className = `w-full rounded-lg border bg-surface p-2 text-left transition ${
    active
      ? 'border-info ring-2 ring-info-bg'
      : unavailableLabel
        ? 'border-border opacity-70'
        : 'border-border hover:border-info'
  }`

  return onClick ? (
    <button
      type="button"
      aria-label={`Select ${image.label}`}
      aria-pressed={active}
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}

function LayerNode({
  active = false,
  layer,
  onImageLoad,
  onMouseDown,
  onResizeMouseDown,
  stageScale = 1,
}) {
  const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

  return (
    <div
      role="button"
      tabIndex={0}
      className={`absolute select-none ${active ? 'ring-2 ring-info' : ''}`}
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        opacity: layer.opacity ?? 1,
      }}
      onMouseDown={onMouseDown ? (event) => onMouseDown(event, layer) : undefined}
      onKeyDown={(event) => event.preventDefault()}
    >
      <img
        src={layer.url}
        alt={layer.label}
        draggable={false}
        onLoad={(event) => onImageLoad(layer.id, event.currentTarget)}
        className="size-full object-contain"
      />
      {active && onResizeMouseDown
        ? handles.map((handle) => (
            <span
              key={handle}
              aria-hidden="true"
              className={`absolute size-3 rounded-full border border-info bg-surface ${
                handle.includes('top') ? '-top-1.5' : '-bottom-1.5'
              } ${handle.includes('left') ? '-left-1.5' : '-right-1.5'}`}
              style={{ transform: `scale(${1 / stageScale})` }}
              onMouseDown={(event) => onResizeMouseDown(event, layer, handle)}
            />
          ))
        : null}
    </div>
  )
}

export default function QcImageReviewDialog({
  canDecide,
  canPass,
  canReject,
  canReview,
  decisionLoading,
  onClose,
  onSubmitDecision,
  open,
  task,
}) {
  const { enqueueSnackbar } = useSnackbar()
  const { t } = useTranslation()
  const stageRef = useRef(null)
  const backgroundInputRef = useRef(null)
  const dragFrameRef = useRef(null)
  const pendingOverlayGeometryRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [qcNote, setQcNote] = useState('')
  const [noteError, setNoteError] = useState(false)
  const [layers, setLayers] = useState([])
  const [activeLayerId, setActiveLayerId] = useState(null)
  const [viewMode, setViewMode] = useState('single')
  const [overlayGeometry, setOverlayGeometry] = useState(null)
  const [overlayOpacity, setOverlayOpacity] = useState(DEFAULT_OVERLAY_OPACITY)
  const [dragState, setDragState] = useState(null)
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [resolvedImageSources, setResolvedImageSources] = useState({})
  const previewItems = useMemo(() => buildQcImageReviewItems(task), [task])
  const currentItem = previewItems[currentIndex] || previewItems[0]
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
  const activeLayer = layers.find((layer) => layer.id === activeLayerId) || null
  const outputLayer = layers.find(
    (layer) => layer.url && layer.sourceId === activeLayer?.sourceId && layer.kind === 'output',
  )
  const inputLayer = layers.find(
    (layer) => layer.url && layer.sourceId === activeLayer?.sourceId && layer.kind === 'input',
  )
  const baseLayer = outputLayer || activeLayer
  const canCompare = Boolean(outputLayer && inputLayer)
  const overlayLayer = viewMode === 'compare' && canCompare ? inputLayer : null
  const displayOverlay =
    overlayLayer && viewMode === 'compare'
      ? { ...overlayLayer, ...overlayGeometry, opacity: overlayOpacity }
      : null
  const sizeInfo = baseLayer?.originalWidth
    ? `${baseLayer.originalWidth}x${baseLayer.originalHeight} px`
    : '-'
  const referenceImages = (currentItem?.referenceImages || []).map((image) => ({
    ...image,
    url: resolveImageUrl(image.url),
  }))
  const slotLayers = resolvedSlotLayers
  const sourceLayers = slotLayers.filter((layer) => layer.kind === 'input')
  const scaledLayers = slotLayers.filter((layer) => layer.kind !== 'input')
  const previewGroups = [
    { id: 'reference', label: t('qc.preview.referenceImages'), images: referenceImages },
    { id: 'source', label: t('qc.preview.sourceFiles'), images: sourceLayers, selectable: true },
    { id: 'scaled', label: t('qc.preview.scaledFiles'), images: scaledLayers, selectable: true },
  ].filter((group) => group.images.length > 0)

  function selectLayer(layerId) {
    const nextLayer = layers.find((layer) => layer.id === layerId)
    if (nextLayer?.sourceId !== activeLayer?.sourceId) {
      setViewMode('single')
      setOverlayGeometry(null)
      setOverlayOpacity(DEFAULT_OVERLAY_OPACITY)
      setDragState(null)
    }
    setActiveLayerId(layerId)
  }

  function setCanvasBackground(color) {
    if (backgroundInputRef.current) backgroundInputRef.current.value = color
    if (stageRef.current) stageRef.current.style.backgroundColor = color
  }

  function handleBackgroundInput(event) {
    setCanvasBackground(event.currentTarget.value)
  }

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setCurrentIndex(0)
      setCanvasBackground(DEFAULT_BG_COLOR)
      setViewMode('single')
      setOverlayGeometry(null)
      setOverlayOpacity(DEFAULT_OVERLAY_OPACITY)
      setStageScale(1)
      setStagePos({ x: 0, y: 0 })
    })
  }, [open, task?.id])

  useEffect(() => {
    if (!open || !currentItem) return
    const nextLayers = resolvedSlotLayers.filter((layer) => layer.url).map(createInitialLayer)
    queueMicrotask(() => {
      setLayers(nextLayers)
      setActiveLayerId(
        nextLayers.find((layer) => layer.kind === 'output')?.id || nextLayers[0]?.id || null,
      )
      setQcNote(currentItem.qcNote || '')
      setNoteError(false)
      setViewMode('single')
      setOverlayGeometry(null)
      setOverlayOpacity(DEFAULT_OVERLAY_OPACITY)
      setDragState(null)
      setStageScale(1)
      setStagePos({ x: 0, y: 0 })
    })
  }, [currentItem, open, resolvedSlotLayers])

  useEffect(() => {
    if (!open) return undefined

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
  }, [imageUrls, imageUrlsKey, open])

  useEffect(() => {
    if (!open) return undefined

    function suppressBrowserZoom(event) {
      if (shouldSuppressBrowserZoomWheel(event)) event.preventDefault()
    }

    window.addEventListener('wheel', suppressBrowserZoom, { capture: true, passive: false })

    return () => {
      window.removeEventListener('wheel', suppressBrowserZoom, { capture: true })
    }
  }, [open])

  const handleImageLoad = useCallback((layerId, imageElement) => {
    setLayers((current) =>
      current.map((layer) => {
        if (layer.id !== layerId || layer.originalWidth) return layer
        const viewport = stageRef.current?.getBoundingClientRect()
        const originalWidth = imageElement.naturalWidth || DEFAULT_LAYER_SIZE
        const originalHeight = imageElement.naturalHeight || DEFAULT_LAYER_SIZE
        const fitScale = Math.min(
          ((viewport?.width || DEFAULT_LAYER_SIZE) * 0.72) / originalWidth,
          ((viewport?.height || DEFAULT_LAYER_SIZE) * 0.72) / originalHeight,
          1,
        )
        const width = originalWidth * fitScale
        const height = originalHeight * fitScale
        const x = ((viewport?.width || width) - width) / 2
        const y = ((viewport?.height || height) - height) / 2

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

  const setZoom = useCallback((nextScale) => {
    setStageScale(Math.min(MAX_STAGE_SCALE, Math.max(MIN_STAGE_SCALE, nextScale)))
  }, [])

  const resetViewport = useCallback(() => {
    setStageScale(1)
    setStagePos({ x: 0, y: 0 })
  }, [])

  function resetView() {
    resetViewport()
    setOverlayGeometry(null)
    setOverlayOpacity(DEFAULT_OVERLAY_OPACITY)
  }

  function startOverlayMove(event, layer) {
    event.preventDefault()
    setDragState({ type: 'move', startX: event.clientX, startY: event.clientY, layer })
  }

  function startOverlayResize(event, layer, handle) {
    event.preventDefault()
    event.stopPropagation()
    setDragState({ type: 'resize', startX: event.clientX, startY: event.clientY, layer, handle })
  }

  useEffect(() => {
    if (!dragState) return undefined

    function flushOverlayGeometry() {
      if (!pendingOverlayGeometryRef.current) return
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = null
      }
      setOverlayGeometry(pendingOverlayGeometryRef.current)
      pendingOverlayGeometryRef.current = null
    }

    function move(event) {
      const delta = {
        dx: (event.clientX - dragState.startX) / stageScale,
        dy: (event.clientY - dragState.startY) / stageScale,
      }
      const next =
        dragState.type === 'move'
          ? computeQcLayerMove(dragState.layer, delta)
          : computeQcLayerResize(dragState.layer, delta)
      pendingOverlayGeometryRef.current = next

      if (!dragFrameRef.current) {
        dragFrameRef.current = requestAnimationFrame(() => {
          dragFrameRef.current = null
          setOverlayGeometry(pendingOverlayGeometryRef.current)
          pendingOverlayGeometryRef.current = null
        })
      }
    }
    function up() {
      flushOverlayGeometry()
      setDragState(null)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      flushOverlayGeometry()
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [dragState, stageScale])

  useEffect(
    () => () => {
      if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current)
    },
    [],
  )

  function handleWheel(event) {
    event.preventDefault()
    const rect = stageRef.current?.getBoundingClientRect()
    const pointer = rect
      ? {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }
      : null
    const nextView = computeQcWheelView({
      ctrlKey: event.ctrlKey,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      maxScale: MAX_STAGE_SCALE,
      metaKey: event.metaKey,
      minScale: MIN_STAGE_SCALE,
      pointer,
      shiftKey: event.shiftKey,
      stagePos,
      stageScale,
      zoomStep: ZOOM_STEP,
    })

    setStageScale(nextView.stageScale)
    setStagePos(nextView.stagePos)
  }

  async function copyOrderId() {
    try {
      await navigator.clipboard.writeText(currentItem.orderId)
      enqueueSnackbar(t('qc.preview.copySuccess'), { variant: SNACKBAR_VARIANTS.INFO })
    } catch {
      enqueueSnackbar(t('qc.preview.copyError'), { variant: SNACKBAR_VARIANTS.ERROR })
    }
  }

  async function submitDecision(decision) {
    if (decision === 'REJECTED' && !qcNote.trim()) {
      setNoteError(true)
      return
    }

    await onSubmitDecision(
      {
        ...task,
        id: currentItem.taskId || task.id,
        orderId: currentItem.orderId,
        orderItemId: currentItem.orderItemId,
      },
      decision,
      qcNote,
    )
    onClose()
  }

  if (!currentItem) return null
  const passEnabled = canPass ?? canDecide
  const rejectEnabled = canReject ?? canDecide

  return (
    <Dialog open={open} onClose={decisionLoading ? undefined : onClose} fullWidth maxWidth="xl">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Typography variant="h5" className="min-w-52 text-xl font-bold text-ink-strong">
              {t('qc.preview.title')}
            </Typography>
            <Pagination
              count={Math.max(previewItems.length, 1)}
              page={currentIndex + 1}
              onChange={(_event, nextPage) => setCurrentIndex(nextPage - 1)}
              size="small"
              color="primary"
            />
            <ValueBadge>
              {t('qc.preview.itemCounter', {
                current: currentIndex + 1,
                total: previewItems.length,
              })}
            </ValueBadge>
            <ValueBadge>{t('qc.preview.size', { size: sizeInfo })}</ValueBadge>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip title={canReview ? t('qc.actions.pass') : t('qc.actions.noQcPermission')}>
              <span>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleIcon fontSize="small" />}
                  disabled={!canReview || !passEnabled || decisionLoading}
                  onClick={() => submitDecision('PASSED')}
                  className="h-9 px-4 text-sm font-semibold"
                >
                  {t('qc.preview.passed')}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={canReview ? t('qc.actions.reject') : t('qc.actions.noQcPermission')}>
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon fontSize="small" />}
                  disabled={!canReview || !rejectEnabled || decisionLoading}
                  onClick={() => submitDecision('REJECTED')}
                  className="h-9 px-4 text-sm font-semibold"
                >
                  {t('qc.preview.rejected')}
                </Button>
              </span>
            </Tooltip>
            <IconButton
              aria-label={t('qc.preview.close')}
              disabled={decisionLoading}
              onClick={onClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tooltip title={t('qc.preview.zoomOut')}>
            <IconButton size="small" onClick={() => setZoom(stageScale / ZOOM_STEP)}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            onClick={resetViewport}
            className="h-8 px-3 text-xs"
          >
            {Math.round(stageScale * 100)}%
          </Button>
          <Tooltip title={t('qc.preview.zoomIn')}>
            <IconButton size="small" onClick={() => setZoom(stageScale * ZOOM_STEP)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant={viewMode === 'compare' ? 'contained' : 'outlined'}
            disabled={!canCompare}
            onClick={() => setViewMode((mode) => (mode === 'compare' ? 'single' : 'compare'))}
          >
            {t('qc.preview.compare')}
          </Button>
          <Button size="small" variant="outlined" onClick={resetView}>
            {t('qc.preview.resetView')}
          </Button>
          {viewMode === 'compare' ? (
            <div className="flex w-40 items-center gap-2">
              <Typography variant="caption">{t('qc.preview.sourceOverlayOpacity')}</Typography>
              <Slider
                size="small"
                value={overlayOpacity * 100}
                onChange={(_event, value) => setOverlayOpacity(Number(value) / 100)}
              />
            </div>
          ) : null}
          <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-ink-secondary">
            {t('qc.preview.background')}
            <input
              ref={backgroundInputRef}
              type="color"
              defaultValue={DEFAULT_BG_COLOR}
              onInput={handleBackgroundInput}
              className="h-8 w-10 rounded border border-border bg-surface"
            />
          </label>
        </div>
      </div>

      <DialogContent className="grid grid-cols-12 gap-4 p-4">
        <aside className="col-span-12 flex max-h-[72vh] flex-col gap-3 overflow-auto lg:col-span-2">
          {previewGroups.length > 0 ? (
            previewGroups.map((group) => (
              <section key={group.id} className="flex flex-col gap-2">
                <Typography
                  variant="caption"
                  className="px-1 text-xs font-bold uppercase text-ink-muted"
                >
                  {group.label}
                </Typography>
                {group.images.map((image) => (
                  <div key={image.id} className="flex items-start gap-1">
                    <div className="min-w-0 flex-1">
                      <ThumbnailCard
                        image={image}
                        active={group.selectable && image.url && image.id === activeLayerId}
                        onClick={
                          group.selectable && image.url ? () => selectLayer(image.id) : undefined
                        }
                        unavailableLabel={
                          !image.url
                            ? image.kind === 'output' && image.unavailableReason === 'MISSING'
                              ? t('qc.preview.outputMissing')
                              : t('qc.preview.fileUnavailable')
                            : null
                        }
                      />
                    </div>
                    {image.url ? (
                      <div className="flex shrink-0 flex-col gap-1">
                        <Tooltip title={t('qc.preview.openImage')}>
                          <ImagePreview
                            src={image.url}
                            alt={`${t('qc.preview.openImage')}: ${image.label}`}
                            className="flex size-8 items-center justify-center rounded border border-border bg-surface text-ink-secondary hover:bg-neutral-bg"
                          >
                            <ImageOutlinedIcon fontSize="small" />
                          </ImagePreview>
                        </Tooltip>
                        <Tooltip title={t('qc.preview.openImage')}>
                          <IconButton
                            component="a"
                            aria-label={`${t('qc.preview.openImage')}: ${image.label}`}
                            href={image.url}
                            target="_blank"
                            rel="noreferrer"
                            size="small"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    ) : null}
                  </div>
                ))}
              </section>
            ))
          ) : (
            <Alert severity="info">{t('qc.preview.noImages')}</Alert>
          )}
        </aside>

        <section className="col-span-12 lg:col-span-7">
          <div
            ref={stageRef}
            className="relative h-[72vh] min-h-96 overflow-hidden rounded-xl border border-border"
            style={{ backgroundColor: DEFAULT_BG_COLOR }}
            onWheel={handleWheel}
          >
            <div
              data-stage="inner"
              className="absolute left-0 top-0 size-full origin-top-left"
              style={{
                transform: `translate(${stagePos.x}px, ${stagePos.y}px) scale(${stageScale})`,
              }}
            >
              {baseLayer ? (
                <LayerNode key={baseLayer.id} layer={baseLayer} onImageLoad={handleImageLoad} />
              ) : null}
              {displayOverlay ? (
                <LayerNode
                  key={displayOverlay.id}
                  active
                  layer={displayOverlay}
                  onImageLoad={handleImageLoad}
                  onMouseDown={startOverlayMove}
                  onResizeMouseDown={startOverlayResize}
                  stageScale={stageScale}
                />
              ) : null}
            </div>
          </div>
        </section>

        <aside className="col-span-12 flex max-h-[72vh] flex-col gap-3 overflow-auto lg:col-span-3">
          <section className="rounded-lg border border-border bg-surface p-3">
            <Typography variant="subtitle1" className="mb-3 font-semibold text-ink-strong">
              {t('qc.preview.itemInfo')}
            </Typography>
            <div className="flex flex-col gap-2">
              <InfoRow label={t('qc.preview.orderId')} value={currentItem.orderId}>
                <button
                  type="button"
                  onClick={copyOrderId}
                  className="inline-flex max-w-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <ValueBadge className="border-primary text-primary">
                    {currentItem.orderId}
                    <ContentCopyIcon className="ml-1 !text-sm" />
                  </ValueBadge>
                </button>
              </InfoRow>
              <InfoRow label={t('qc.preview.asin')} value={currentItem.product.asin} />
              <InfoRow label={t('qc.preview.sku')} value={currentItem.product.sku} />
              <InfoRow label={t('qc.preview.scaleBy')} value={currentItem.scaleBy} />
              <InfoRow label={t('qc.preview.vendor')} value={currentItem.vendorProduct} />
              <InfoRow label={t('qc.preview.productName')} value={currentItem.product.title} />
              <InfoRow label={t('qc.preview.fulfillName')} value={currentItem.fulfillName} />
              <InfoRow label={t('qc.preview.pngStatus')} value={currentItem.pngStatus} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-3">
            <Typography variant="subtitle1" className="mb-3 font-semibold text-ink-strong">
              {t('qc.preview.customization')}
            </Typography>
            <div className="flex flex-col gap-1.5">
              {currentItem.customization.length > 0 ? (
                currentItem.customization.map((item, index) => (
                  <InlineDetailValue
                    key={`${item.label}-${index}`}
                    label={item.label}
                    value={formatQcCustomizationValue(item.value)}
                    valueClassName="text-xs text-ink-secondary"
                  />
                ))
              ) : (
                <Typography variant="body2" className="text-sm text-ink-muted">
                  {t('qc.preview.noCustomization')}
                </Typography>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
            <Typography variant="subtitle1" className="font-semibold text-ink-strong">
              {t('qc.preview.csNote')}
            </Typography>
            <TextField
              value={currentItem.csNote}
              multiline
              minRows={2}
              maxRows={5}
              fullWidth
              disabled
              placeholder={t('qc.preview.noCsNote')}
            />
            <Typography variant="subtitle1" className="font-semibold text-ink-strong">
              {t('qc.preview.qcNote')}
            </Typography>
            <TextField
              value={qcNote}
              onChange={(event) => {
                setQcNote(event.target.value)
                setNoteError(false)
              }}
              multiline
              minRows={3}
              maxRows={8}
              fullWidth
              error={noteError}
              helperText={noteError ? t('qc.preview.noteRequired') : ' '}
              disabled={decisionLoading}
              placeholder={t('qc.preview.notePlaceholder')}
            />
          </section>
        </aside>
      </DialogContent>
    </Dialog>
  )
}
