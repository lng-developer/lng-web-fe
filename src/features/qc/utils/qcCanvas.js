function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
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

export function computeQcLayerMove(layer, { dx = 0, dy = 0, shiftKey = false } = {}) {
  let nextDx = toFiniteNumber(dx)
  let nextDy = toFiniteNumber(dy)

  if (shiftKey) {
    if (Math.abs(nextDx) >= Math.abs(nextDy)) nextDy = 0
    else nextDx = 0
  }

  return {
    x: layer.x + nextDx,
    y: layer.y + nextDy,
  }
}

export function computeQcLayerResize(
  layer,
  { ctrlKey = false, dx = 0, dy = 0, handle = 'bottom-right', minSize = 24, shiftKey = false } = {},
) {
  const left = handle.includes('left')
  const top = handle.includes('top')
  const deltaX = toFiniteNumber(dx)
  const deltaY = toFiniteNumber(dy)
  const widthDirection = left ? -1 : 1
  const heightDirection = top ? -1 : 1
  const widthDelta = deltaX * widthDirection * (ctrlKey ? 2 : 1)
  const heightDelta = deltaY * heightDirection * (ctrlKey ? 2 : 1)
  const ratio = layer.width / layer.height || 1
  let width = Math.max(minSize, layer.width + widthDelta)
  let height = Math.max(minSize, layer.height + heightDelta)

  if (shiftKey) {
    width = Math.max(minSize, layer.width + widthDelta)
    height = Math.max(minSize, width / ratio)
  }

  if (ctrlKey) {
    return {
      x: layer.x + (layer.width - width) / 2,
      y: layer.y + (layer.height - height) / 2,
      width,
      height,
    }
  }

  return {
    x: left ? layer.x + layer.width - width : layer.x,
    y: top ? layer.y + layer.height - height : layer.y,
    width,
    height,
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
