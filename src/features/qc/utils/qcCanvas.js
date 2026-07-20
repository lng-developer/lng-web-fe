function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function formatQcCustomizationValue(value) {
  if (value === undefined || value === null || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    const parts = value.map(formatQcCustomizationValue).filter((item) => item && item !== '-')
    return parts.length > 0 ? parts.join(', ') : '-'
  }
  if (typeof value === 'object') {
    if (value.value !== undefined) return formatQcCustomizationValue(value.value)
    if (value.label !== undefined) return formatQcCustomizationValue(value.label)
    if (value.name !== undefined) return formatQcCustomizationValue(value.name)
    if (value.url !== undefined) return formatQcCustomizationValue(value.url)
    if (value.secureUrl !== undefined) return formatQcCustomizationValue(value.secureUrl)

    const parts = Object.values(value)
      .map(formatQcCustomizationValue)
      .filter((item) => item && item !== '-')
    return parts.length > 0 ? parts.join(', ') : '-'
  }
  return String(value)
}

export function shouldSuppressBrowserZoomWheel(event = {}) {
  return Boolean(event.ctrlKey || event.metaKey)
}

export function computeQcLayerMove(layer, { dx = 0, dy = 0 } = {}) {
  return {
    ...layer,
    x: layer.x + dx,
    y: layer.y + dy,
  }
}

export function computeQcLayerResize(layer, { dx = 0, dy = 0, minSize = 24 } = {}) {
  return {
    ...layer,
    width: Math.max(minSize, layer.width + dx),
    height: Math.max(minSize, layer.height + dy),
  }
}

export function computeQcWheelView({
  ctrlKey = false,
  deltaX = 0,
  deltaY = 0,
  maxScale = 50,
  metaKey = false,
  minScale = 0.25,
  pointer = null,
  shiftKey = false,
  shiftPanMultiplier = 0.45,
  stagePos = { x: 0, y: 0 },
  stageScale = 1,
  zoomStep = 1.15,
} = {}) {
  if (ctrlKey || metaKey) {
    const nextScale = clamp(
      deltaY > 0 ? stageScale / zoomStep : stageScale * zoomStep,
      minScale,
      maxScale,
    )

    if (!pointer) {
      return { stagePos, stageScale: nextScale }
    }

    const pointTo = {
      x: (pointer.x - stagePos.x) / stageScale,
      y: (pointer.y - stagePos.y) / stageScale,
    }

    return {
      stagePos: {
        x: pointer.x - pointTo.x * nextScale,
        y: pointer.y - pointTo.y * nextScale,
      },
      stageScale: nextScale,
    }
  }

  return {
    stagePos: {
      x: stagePos.x - (shiftKey ? deltaY * shiftPanMultiplier : deltaX),
      y: shiftKey ? stagePos.y : stagePos.y - deltaY,
    },
    stageScale,
  }
}
