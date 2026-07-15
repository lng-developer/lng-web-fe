export function truncateDisplayText(value, maxLength) {
  const text = value === null || value === undefined ? '' : String(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

export function isScaleSlotUploadDisabled(slot = {}, isUploading = false) {
  return !slot.fileCheckId || isUploading
}

export function getScaleUploadTarget(detail = {}) {
  return { fileCheckId: detail.psdTemplate?.fileCheckId || null }
}

export function toggleExpandedTaskIds(expandedTaskIds = [], taskId) {
  return expandedTaskIds.includes(taskId)
    ? expandedTaskIds.filter((expandedTaskId) => expandedTaskId !== taskId)
    : [...expandedTaskIds, taskId]
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
