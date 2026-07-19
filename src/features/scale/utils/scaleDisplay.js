export function truncateDisplayText(value, maxLength) {
  const text = value === null || value === undefined ? '' : String(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

export function formatCompactOrderDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return truncateDisplayText(value, 12)

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).format(date)
}

export function isScaleSlotUploadDisabled(slot = {}, isUploading = false) {
  return isUploading || slot.disabled === true
}

export const SCALE_MANUAL_UPLOAD_POSITIONS = [
  {
    value: 'FRONT',
    slotLabel: 'Front',
    labelKey: 'scale.manualUpload.positions.front',
  },
  {
    value: 'BACK',
    slotLabel: 'Back',
    labelKey: 'scale.manualUpload.positions.back',
  },
  {
    value: 'LEFT',
    slotLabel: 'Left',
    labelKey: 'scale.manualUpload.positions.left',
  },
  {
    value: 'RIGHT',
    slotLabel: 'Right',
    labelKey: 'scale.manualUpload.positions.right',
  },
]

export function getScaleManualUploadPosition(value) {
  return (
    SCALE_MANUAL_UPLOAD_POSITIONS.find((position) => position.value === value) ||
    SCALE_MANUAL_UPLOAD_POSITIONS[0]
  )
}

export function getScaleUploadTarget(detail = {}) {
  const slots = Array.isArray(detail.mockups) ? detail.mockups : []
  const target =
    slots.find((slot) => slot.outputStatus === 'MISSING' || !slot.outputAssetId) || slots[0] || {}
  const slotKey = target.slotKey || 'FRONT'

  return {
    fileCheckId: target.fileCheckId || null,
    isManual: !target.fileCheckId,
    slotKey,
    slotLabel:
      target.label || target.slotLabel || slotKey.charAt(0) + slotKey.slice(1).toLowerCase(),
    sourceType: target.sourceType || 'CUSTOMER_IMAGE',
  }
}

export function getScaleSlotPreviewAssetId(slot = {}) {
  if (slot.outputStatus && slot.outputStatus !== 'UPLOADED') return null
  return slot.outputAssetId || null
}

export async function copyDisplayText(value, options = {}) {
  const text = value === null || value === undefined ? '' : String(value)
  const clipboard = Object.hasOwn(options, 'clipboard')
    ? options.clipboard
    : globalThis.navigator?.clipboard

  if (typeof clipboard?.writeText === 'function') {
    await clipboard.writeText(text)
    return text
  }

  const documentRef = Object.hasOwn(options, 'document') ? options.document : globalThis.document
  if (!documentRef?.body || typeof documentRef.execCommand !== 'function') {
    throw new Error('Clipboard is not available')
  }

  const textarea = documentRef.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  documentRef.body.appendChild(textarea)
  textarea.select()

  try {
    if (!documentRef.execCommand('copy')) {
      throw new Error('Copy command was rejected')
    }
  } finally {
    documentRef.body.removeChild(textarea)
  }

  return text
}
