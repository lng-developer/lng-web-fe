import { ApiError } from '@/shared/api'
import i18n from '@/shared/i18n/i18n'

export const MAX_SCALED_OUTPUT_FILE_BYTES = 20 * 1024 * 1024 // 20 MB
export const ALLOWED_SCALED_OUTPUT_EXTENSIONS = ['.png', '.psd', '.jpg', '.jpeg', '.pdf']

export function formatSlotLabel(slotKey: string, slotLabel?: string | null): string {
  if (slotLabel && slotLabel.trim()) return slotLabel.trim()
  const upper = (slotKey || '').toUpperCase()
  if (upper === 'FRONT') return i18n.t('portal.production.manualSlot.positions.front')
  if (upper === 'BACK') return i18n.t('portal.production.manualSlot.positions.back')
  if (upper === 'LEFT_CHEST') return i18n.t('portal.production.manualSlot.positions.leftChest')
  if (upper === 'LEFT_SLEEVE') return i18n.t('portal.production.manualSlot.positions.leftSleeve')
  if (upper === 'RIGHT_SLEEVE') return i18n.t('portal.production.manualSlot.positions.rightSleeve')
  if (upper.startsWith('CUSTOM_')) {
    return upper.replace(/^CUSTOM_/, '').replace(/_/g, ' ')
  }
  return slotKey
}

export function validateScaledOutputFile(file: File): {
  valid: boolean
  errorTitle?: string
  errorDescription?: string
} {
  const extension = '.' + (file.name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_SCALED_OUTPUT_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      errorTitle: i18n.t('portal.production.feedback.unsupportedFileTypeTitle'),
      errorDescription: i18n.t('portal.production.feedback.unsupportedFileTypeDescription', {
        extensions: ALLOWED_SCALED_OUTPUT_EXTENSIONS.join(', '),
        filename: file.name,
      }),
    }
  }

  if (file.size > MAX_SCALED_OUTPUT_FILE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      errorTitle: i18n.t('portal.production.feedback.fileTooLargeTitle'),
      errorDescription: i18n.t('portal.production.feedback.fileTooLargeDescription', {
        size: sizeMb,
        max: '20MB',
      }),
    }
  }

  return { valid: true }
}

type ErrorDetails = {
  missingSlots?: string[]
  slotKey?: string
  addressValidationStatus?: string
  [key: string]: unknown
}

export function formatProductionError(
  error: unknown,
  defaultAction?: string,
): { title: string; description: string } {
  let code = ''
  let status: number | undefined
  let rawMessage = ''
  let requestId = ''
  let details: ErrorDetails | undefined

  if (error instanceof ApiError) {
    code = error.code || ''
    status = error.status
    rawMessage = error.rawMessage || error.message || ''
    requestId = error.requestId || ''
    details = error.details as ErrorDetails | undefined
  } else if (error && typeof error === 'object') {
    const anyErr = error as Record<string, unknown>
    code = typeof anyErr.code === 'string' ? anyErr.code : ''
    status = typeof anyErr.status === 'number' ? anyErr.status : undefined
    rawMessage =
      typeof anyErr.rawMessage === 'string'
        ? anyErr.rawMessage
        : typeof anyErr.message === 'string'
          ? anyErr.message
          : ''
    requestId = typeof anyErr.requestId === 'string' ? anyErr.requestId : ''
    details = anyErr.details as ErrorDetails | undefined
  } else if (typeof error === 'string') {
    rawMessage = error
  }

  const rawLower = rawMessage.toLowerCase()
  const fallbackTitle = defaultAction || i18n.t('portal.production.feedback.defaultFailedTitle')

  // 1. Missing required scaled outputs before QC submit
  if (
    rawLower.includes('all required scaled outputs must be uploaded') ||
    rawLower.includes('missing required scaled output')
  ) {
    const missing = details?.missingSlots
    const slotText =
      Array.isArray(missing) && missing.length > 0
        ? missing.map((s) => formatSlotLabel(s)).join(', ')
        : ''
    return {
      title: i18n.t('portal.production.feedback.missingRequiredSlotsTitle'),
      description: slotText
        ? i18n.t('portal.production.feedback.missingRequiredSlotsDescription', { slots: slotText })
        : i18n.t('portal.production.feedback.missingRequiredSlotsGeneric'),
    }
  }

  // 2. File size limit
  if (
    status === 413 ||
    code === 'PAYLOAD_TOO_LARGE' ||
    rawLower.includes('file size too large') ||
    rawLower.includes('exceeds the maximum allowed size') ||
    rawLower.includes('maximum is 10485760')
  ) {
    return {
      title: i18n.t('portal.production.feedback.fileTooLargeTitle'),
      description: i18n.t('portal.production.feedback.fileTooLargeDescription', {
        size: '20+',
        max: '20MB',
      }),
    }
  }

  // 3. Slot already exists
  if (
    rawLower.includes('file check already exists for slotkey') ||
    rawLower.includes('already exists for slotkey')
  ) {
    const slotName = details?.slotKey ? formatSlotLabel(details.slotKey) : ''
    return {
      title: i18n.t('portal.production.feedback.slotAlreadyExistsTitle'),
      description: slotName
        ? i18n.t('portal.production.feedback.slotAlreadyExistsDescription', { slot: slotName })
        : i18n.t('portal.production.feedback.slotAlreadyExistsGeneric'),
    }
  }

  // 4. Scaled outputs cannot be changed after QC has passed
  if (rawLower.includes('scaled outputs cannot be changed after qc')) {
    return {
      title: i18n.t('portal.production.feedback.mutationLockedTitle'),
      description: i18n.t('portal.production.feedback.mutationLockedPassed'),
    }
  }

  // 5. Already sent to vendor
  if (rawLower.includes('already sent to vendor')) {
    return {
      title: i18n.t('portal.production.feedback.mutationLockedTitle'),
      description: i18n.t('portal.production.feedback.mutationLockedSent'),
    }
  }

  // 6. Address invalid before scale
  if (rawLower.includes('order address must be valid before scale')) {
    return {
      title: i18n.t('portal.production.feedback.invalidAddressTitle'),
      description: i18n.t('portal.production.feedback.invalidAddressDescription'),
    }
  }

  // 7. QC decision required for every scaled output
  if (rawLower.includes('qc decision is required for every scaled output')) {
    return {
      title: i18n.t('portal.production.feedback.qcDecisionRequiredTitle'),
      description: i18n.t('portal.production.feedback.qcDecisionRequiredDescription'),
    }
  }

  // 8. QC decision must be PASSED or REJECTED
  if (rawLower.includes('qc decision must be passed or rejected')) {
    return {
      title: i18n.t('portal.production.feedback.qcDecisionInvalidTitle'),
      description: i18n.t('portal.production.feedback.qcDecisionInvalidDescription'),
    }
  }

  // 9. Scaled output is required before QC pass
  if (rawLower.includes('scaled output is required before qc pass')) {
    const slotName = details?.slotKey ? formatSlotLabel(details.slotKey) : ''
    return {
      title: i18n.t('portal.production.feedback.qcPassMissingOutputTitle'),
      description: slotName
        ? i18n.t('portal.production.feedback.qcPassMissingOutputDescription', { slot: slotName })
        : i18n.t('portal.production.feedback.qcPassMissingOutputGeneric'),
    }
  }

  // 10. Task already assigned
  if (rawLower.includes('production task is already assigned')) {
    return {
      title: i18n.t('portal.production.feedback.taskAlreadyAssignedTitle'),
      description: i18n.t('portal.production.feedback.taskAlreadyAssignedDescription'),
    }
  }

  // 11. Concurrent update conflict
  if (rawLower.includes('changed concurrently')) {
    return {
      title: i18n.t('portal.production.feedback.concurrentUpdateTitle'),
      description: i18n.t('portal.production.feedback.concurrentUpdateDescription'),
    }
  }

  // 12. Invalid file type from server
  if (rawLower.includes('only .png, .psd, .jpg, .pdf files are allowed')) {
    return {
      title: i18n.t('portal.production.feedback.unsupportedFileTypeTitle'),
      description: i18n.t('portal.production.feedback.unsupportedFileTypeDescription', {
        extensions: ALLOWED_SCALED_OUTPUT_EXTENSIONS.join(', '),
        filename: '',
      }),
    }
  }

  // 13. CS Assignee required
  if (rawLower.includes('cs assignee is required')) {
    return {
      title: i18n.t('portal.production.feedback.csAssigneeRequiredTitle'),
      description: i18n.t('portal.production.feedback.csAssigneeRequiredDescription'),
    }
  }

  // 14. Network or server error
  if (code === 'NETWORK_ERROR' || rawLower.includes('network error')) {
    return {
      title: i18n.t('portal.production.feedback.networkErrorTitle'),
      description: i18n.t('portal.production.feedback.networkErrorDescription'),
    }
  }

  if (status && status >= 500) {
    const reqText = requestId ? ` (${i18n.t('errors.requestId')}: ${requestId})` : ''
    return {
      title: i18n.t('portal.production.feedback.serverErrorTitle'),
      description: i18n.t('portal.production.feedback.serverErrorDescription', {
        requestId: reqText,
      }),
    }
  }

  // 15. Validation details from Joi
  if (Array.isArray(details) && details.length > 0) {
    const detailMessages = details
      .map((d: Record<string, unknown>) => (typeof d?.message === 'string' ? d.message : ''))
      .filter(Boolean)
      .join('; ')
    if (detailMessages) {
      return {
        title: i18n.t('portal.production.feedback.invalidDataTitle'),
        description: detailMessages,
      }
    }
  }

  // 16. Fallback with rawMessage if meaningful
  if (rawMessage && !rawLower.includes('unexpected') && !rawLower.includes('request failed')) {
    const reqText = requestId ? ` (${i18n.t('errors.requestId')}: ${requestId})` : ''
    return {
      title: fallbackTitle,
      description: `${rawMessage}${reqText}`,
    }
  }

  const reqText = requestId ? ` (${i18n.t('errors.requestId')}: ${requestId})` : ''
  return {
    title: fallbackTitle,
    description: i18n.t('portal.production.feedback.defaultFailedDescription', {
      requestId: reqText,
    }),
  }
}
