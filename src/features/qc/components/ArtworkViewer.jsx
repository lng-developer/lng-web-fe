import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { Button, IconButton, Slider, Tooltip, Typography } from '@mui/material'

import {
  computeQcLayerMove,
  computeQcLayerResize,
  computeQcWheelView,
  shouldSuppressBrowserZoomWheel,
} from '@/features/qc/utils/qcCanvas'

const MIN_STAGE_SCALE = 0.25
const MAX_STAGE_SCALE = 50
const ZOOM_STEP = 1.15
const DEFAULT_BG_COLOR = '#2f6f8a'

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
        alt={layer.label || layer.id}
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

export default function ArtworkViewer({
  baseLayer,
  displayOverlay,
  onImageLoad,
  onOverlayChange,
  showControls = true,
  canCompare = false,
  viewMode = 'single',
  onViewModeChange,
}) {
  const { t } = useTranslation()
  const stageRef = useRef(null)
  const backgroundInputRef = useRef(null)
  const dragFrameRef = useRef(null)
  const pendingOverlayGeometryRef = useRef(null)

  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState(null)
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)

  useEffect(() => {
    function suppressBrowserZoom(event) {
      if (shouldSuppressBrowserZoomWheel(event)) event.preventDefault()
    }
    window.addEventListener('wheel', suppressBrowserZoom, { capture: true, passive: false })
    return () => {
      window.removeEventListener('wheel', suppressBrowserZoom, { capture: true })
    }
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
    setOverlayOpacity(0.5)
    if (onOverlayChange) onOverlayChange(null)
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
      if (onOverlayChange) onOverlayChange(pendingOverlayGeometryRef.current)
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
          if (onOverlayChange) onOverlayChange(pendingOverlayGeometryRef.current)
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
  }, [dragState, stageScale, onOverlayChange])

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

  function setCanvasBackground(color) {
    if (backgroundInputRef.current) backgroundInputRef.current.value = color
    if (stageRef.current) stageRef.current.style.backgroundColor = color
  }

  function handleBackgroundInput(event) {
    setCanvasBackground(event.currentTarget.value)
  }

  const finalDisplayOverlay = displayOverlay ? { ...displayOverlay, opacity: overlayOpacity } : null

  return (
    <div className="flex h-full flex-col gap-2">
      {showControls && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2">
          <Tooltip title={t('qc.preview.zoomOut', { defaultValue: 'Zoom Out' })}>
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
          <Tooltip title={t('qc.preview.zoomIn', { defaultValue: 'Zoom In' })}>
            <IconButton size="small" onClick={() => setZoom(stageScale * ZOOM_STEP)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {canCompare && onViewModeChange && (
            <Button
              size="small"
              variant={viewMode === 'compare' ? 'contained' : 'outlined'}
              onClick={() => onViewModeChange(viewMode === 'compare' ? 'single' : 'compare')}
            >
              {t('qc.preview.compare', { defaultValue: 'Compare' })}
            </Button>
          )}

          <Button size="small" variant="outlined" onClick={resetView}>
            {t('qc.preview.resetView', { defaultValue: 'Reset View' })}
          </Button>

          {viewMode === 'compare' && (
            <div className="flex w-40 items-center gap-2 ml-4">
              <Typography variant="caption" className="whitespace-nowrap">
                {t('qc.preview.sourceOverlayOpacity', { defaultValue: 'Overlay' })}
              </Typography>
              <Slider
                size="small"
                value={overlayOpacity * 100}
                onChange={(_event, value) => setOverlayOpacity(Number(value) / 100)}
              />
            </div>
          )}

          <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-ink-secondary">
            {t('qc.preview.background', { defaultValue: 'Background' })}
            <input
              ref={backgroundInputRef}
              type="color"
              defaultValue={DEFAULT_BG_COLOR}
              onInput={handleBackgroundInput}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-surface p-0"
            />
          </label>
        </div>
      )}

      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border"
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
            <LayerNode key={baseLayer.id || 'base'} layer={baseLayer} onImageLoad={onImageLoad} />
          ) : null}
          {finalDisplayOverlay ? (
            <LayerNode
              key={finalDisplayOverlay.id || 'overlay'}
              active
              layer={finalDisplayOverlay}
              onImageLoad={onImageLoad}
              onMouseDown={startOverlayMove}
              onResizeMouseDown={startOverlayResize}
              stageScale={stageScale}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
