import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import CancelIcon from '@mui/icons-material/Cancel'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RemoveIcon from '@mui/icons-material/Remove'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Pagination,
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

const MIN_STAGE_SCALE = 0.25
const MAX_STAGE_SCALE = 50
const ZOOM_STEP = 1.15
const DEFAULT_BG_COLOR = '#2f6f8a'
const DEFAULT_LAYER_SIZE = 320
const MIN_LAYER_SIZE = 24

function createInitialLayer(layer, index) {
  return {
    ...layer,
    x: 40 + index * 24,
    y: 40 + index * 24,
    width: DEFAULT_LAYER_SIZE,
    height: DEFAULT_LAYER_SIZE,
    originalWidth: null,
    originalHeight: null,
    initialX: 40 + index * 24,
    initialY: 40 + index * 24,
    initialWidth: DEFAULT_LAYER_SIZE,
    initialHeight: DEFAULT_LAYER_SIZE,
    visible: true,
    opacity: 1,
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

function ThumbnailCard({ active, image, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClick()
      }}
      className={`rounded-lg border bg-surface p-2 text-left transition ${
        active ? 'border-info ring-2 ring-info-bg' : 'border-border hover:border-info'
      }`}
    >
      {image.url ? (
        <ImagePreview
          src={image.url}
          alt={image.label}
          className="flex h-28 w-full items-center justify-center rounded-md bg-neutral-bg"
        >
          <img src={image.url} alt={image.label} className="max-h-full max-w-full object-contain" />
        </ImagePreview>
      ) : (
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-md bg-neutral-bg">
          <ImageOutlinedIcon className="text-ink-muted" />
        </div>
      )}
      <Typography className="mt-2 truncate text-center text-xs font-semibold text-ink-muted">
        {image.label}
      </Typography>
    </div>
  )
}

function LayerNode({
  active,
  layer,
  onImageLoad,
  onMouseDown,
  onResizeMouseDown,
  onSelect,
  stageScale,
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
        opacity: layer.opacity,
      }}
      onMouseDown={(event) => onMouseDown(event, layer)}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(layer.id)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect(layer.id)
      }}
    >
      <img
        src={layer.url}
        alt={layer.label}
        draggable={false}
        onLoad={(event) => onImageLoad(layer.id, event.currentTarget)}
        className="size-full object-contain"
      />
      {active
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [bgColor, setBgColor] = useState(DEFAULT_BG_COLOR)
  const [qcNote, setQcNote] = useState('')
  const [noteError, setNoteError] = useState(false)
  const [layers, setLayers] = useState([])
  const [activeLayerId, setActiveLayerId] = useState(null)
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [dragState, setDragState] = useState(null)
  const previewItems = useMemo(() => buildQcImageReviewItems(task), [task])
  const currentItem = previewItems[currentIndex] || previewItems[0]
  const activeLayer = layers.find((layer) => layer.id === activeLayerId) || null
  const sizeInfo = activeLayer?.originalWidth
    ? `${activeLayer.originalWidth}x${activeLayer.originalHeight} px`
    : '-'
  const allThumbnails = [...(currentItem?.referenceImages || []), ...layers]

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setCurrentIndex(0)
      setBgColor(DEFAULT_BG_COLOR)
      setStageScale(1)
      setStagePos({ x: 0, y: 0 })
    })
  }, [open, task?.id])

  useEffect(() => {
    if (!open || !currentItem) return
    const nextLayers = currentItem.layers.map(createInitialLayer)
    queueMicrotask(() => {
      setLayers(nextLayers)
      setActiveLayerId(nextLayers[0]?.id || null)
      setQcNote(currentItem.qcNote || '')
      setNoteError(false)
      setStageScale(1)
      setStagePos({ x: 0, y: 0 })
    })
  }, [currentItem, open])

  useEffect(() => {
    if (!open) return undefined

    function suppressBrowserZoom(event) {
      if (shouldSuppressBrowserZoomWheel(event)) event.preventDefault()
    }

    function handleKeyDown(event) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return
      if (event.code === 'Space') {
        event.preventDefault()
        setIsSpaceDown(true)
      }
    }

    function handleKeyUp(event) {
      if (event.code === 'Space') setIsSpaceDown(false)
    }

    window.addEventListener('wheel', suppressBrowserZoom, { capture: true, passive: false })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('wheel', suppressBrowserZoom, { capture: true })
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [open])

  useEffect(() => {
    if (!dragState) return undefined

    function handleMouseMove(event) {
      if (dragState.type === 'pan') {
        setStagePos({
          x: dragState.startStagePos.x + event.clientX - dragState.startClientX,
          y: dragState.startStagePos.y + event.clientY - dragState.startClientY,
        })
        return
      }

      const dx = (event.clientX - dragState.startClientX) / stageScale
      const dy = (event.clientY - dragState.startClientY) / stageScale

      setLayers((current) =>
        current.map((layer) => {
          if (layer.id !== dragState.layerId) return layer

          if (dragState.type === 'move') {
            return {
              ...layer,
              ...computeQcLayerMove(dragState.startLayer, {
                dx,
                dy,
                shiftKey: event.shiftKey,
              }),
            }
          }

          return {
            ...layer,
            ...computeQcLayerResize(dragState.startLayer, {
              ctrlKey: event.ctrlKey || event.metaKey,
              dx,
              dy,
              handle: dragState.handle,
              minSize: MIN_LAYER_SIZE,
              shiftKey: event.shiftKey,
            }),
          }
        }),
      )
    }

    function handleMouseUp() {
      setDragState(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, stageScale])

  const selectLayer = useCallback((layerId) => {
    setActiveLayerId(layerId)
  }, [])

  const updateActiveLayer = useCallback(
    (patch) => {
      if (!activeLayerId) return
      setLayers((current) =>
        current.map((layer) => (layer.id === activeLayerId ? { ...layer, ...patch } : layer)),
      )
    },
    [activeLayerId],
  )

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
          initialX: x,
          initialY: y,
          initialWidth: width,
          initialHeight: height,
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

  const centerActiveLayer = useCallback(() => {
    if (!activeLayer) return
    const viewport = stageRef.current?.getBoundingClientRect()
    updateActiveLayer({
      x: ((viewport?.width || activeLayer.width) - activeLayer.width) / 2,
      y: ((viewport?.height || activeLayer.height) - activeLayer.height) / 2,
    })
  }, [activeLayer, updateActiveLayer])

  const fitActiveLayer = useCallback(() => {
    if (!activeLayer?.originalWidth || !activeLayer?.originalHeight) return
    const viewport = stageRef.current?.getBoundingClientRect()
    const fitScale = Math.min(
      ((viewport?.width || DEFAULT_LAYER_SIZE) * 0.9) / activeLayer.originalWidth,
      ((viewport?.height || DEFAULT_LAYER_SIZE) * 0.9) / activeLayer.originalHeight,
      1,
    )
    const width = activeLayer.originalWidth * fitScale
    const height = activeLayer.originalHeight * fitScale
    updateActiveLayer({
      width,
      height,
      x: ((viewport?.width || width) - width) / 2,
      y: ((viewport?.height || height) - height) / 2,
    })
  }, [activeLayer, updateActiveLayer])

  const resetActiveLayer = useCallback(() => {
    if (!activeLayer) return
    updateActiveLayer({
      x: activeLayer.initialX,
      y: activeLayer.initialY,
      width: activeLayer.initialWidth,
      height: activeLayer.initialHeight,
    })
  }, [activeLayer, updateActiveLayer])

  const actualSizeActiveLayer = useCallback(() => {
    if (!activeLayer?.originalWidth || !activeLayer?.originalHeight) return
    updateActiveLayer({
      width: activeLayer.originalWidth,
      height: activeLayer.originalHeight,
    })
  }, [activeLayer, updateActiveLayer])

  function startLayerMove(event, layer) {
    event.preventDefault()
    event.stopPropagation()
    setActiveLayerId(layer.id)
    if (isSpaceDown || event.button === 1) {
      setDragState({
        type: 'pan',
        startClientX: event.clientX,
        startClientY: event.clientY,
        startStagePos: stagePos,
      })
      return
    }
    setDragState({
      type: 'move',
      layerId: layer.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayer: layer,
    })
  }

  function startLayerResize(event, layer, handle) {
    event.preventDefault()
    event.stopPropagation()
    setActiveLayerId(layer.id)
    setDragState({
      type: 'resize',
      layerId: layer.id,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayer: layer,
    })
  }

  function startStagePan(event) {
    if (event.target !== stageRef.current && event.target?.dataset?.stage !== 'inner') return
    if (isSpaceDown || event.button === 1) {
      event.preventDefault()
      setDragState({
        type: 'pan',
        startClientX: event.clientX,
        startClientY: event.clientY,
        startStagePos: stagePos,
      })
      return
    }
    setActiveLayerId(null)
  }

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
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-3">
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
          {t('qc.preview.itemCounter', { current: currentIndex + 1, total: previewItems.length })}
        </ValueBadge>
        <ValueBadge>{t('qc.preview.size', { size: sizeInfo })}</ValueBadge>

        <div className="flex items-center gap-1">
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
        </div>

        <div className="flex items-center gap-1">
          <Tooltip title={t('qc.preview.fit')}>
            <span>
              <IconButton size="small" disabled={!activeLayer} onClick={fitActiveLayer}>
                <CenterFocusStrongIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('qc.preview.center')}>
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={!activeLayer}
                onClick={centerActiveLayer}
                className="h-8 px-3 text-xs"
              >
                {t('qc.preview.centerShort')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('qc.preview.actualSize')}>
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={!activeLayer}
                onClick={actualSizeActiveLayer}
                className="h-8 px-3 text-xs"
              >
                1:1
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('qc.preview.resetLayer')}>
            <span>
              <IconButton size="small" disabled={!activeLayer} onClick={resetActiveLayer}>
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>

        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-ink-secondary">
          {t('qc.preview.background')}
          <input
            type="color"
            value={bgColor}
            onChange={(event) => setBgColor(event.target.value)}
            className="h-8 w-10 rounded border border-border bg-surface"
          />
        </label>

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
        </div>

        <IconButton aria-label={t('qc.preview.close')} disabled={decisionLoading} onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>

      <DialogContent className="grid grid-cols-12 gap-4 p-4">
        <aside className="col-span-12 flex max-h-[72vh] flex-col gap-3 overflow-auto lg:col-span-2">
          {allThumbnails.length > 0 ? (
            allThumbnails.map((image) => (
              <div key={image.id} className="relative">
                <ThumbnailCard
                  image={image}
                  active={image.id === activeLayerId}
                  onClick={() => {
                    if (layers.some((layer) => layer.id === image.id)) setActiveLayerId(image.id)
                  }}
                />
                {image.url ? (
                  <Tooltip title={t('qc.preview.openImage')}>
                    <IconButton
                      component="a"
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      size="small"
                      className="!absolute !right-1 !top-1 !bg-surface"
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </div>
            ))
          ) : (
            <Alert severity="info">{t('qc.preview.noImages')}</Alert>
          )}
        </aside>

        <section className="col-span-12 lg:col-span-7">
          <div
            ref={stageRef}
            role="button"
            tabIndex={0}
            aria-label={t('qc.preview.canvas')}
            className={`relative h-[72vh] min-h-96 overflow-hidden rounded-xl border border-border ${
              isSpaceDown || dragState?.type === 'pan' ? 'cursor-grab' : 'cursor-default'
            }`}
            style={{ backgroundColor: bgColor }}
            onMouseDown={startStagePan}
            onWheel={handleWheel}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setActiveLayerId(null)
            }}
          >
            <div
              data-stage="inner"
              className="absolute left-0 top-0 size-full origin-top-left"
              style={{
                transform: `translate(${stagePos.x}px, ${stagePos.y}px) scale(${stageScale})`,
              }}
            >
              {layers.map((layer) => (
                <LayerNode
                  key={layer.id}
                  layer={layer}
                  active={layer.id === activeLayerId}
                  onImageLoad={handleImageLoad}
                  onMouseDown={startLayerMove}
                  onResizeMouseDown={startLayerResize}
                  onSelect={selectLayer}
                  stageScale={stageScale}
                />
              ))}
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
                <button type="button" onClick={copyOrderId} className="inline-flex max-w-full">
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
            <div className="flex max-h-56 flex-col gap-1.5 overflow-auto">
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
