import type { AppNotification } from '@/features/notifications/api/notificationApi'

const IMPORTANT_TYPE_KEYWORDS = [
  'order',
  'production',
  'qc',
  'fail',
  'error',
  'issue',
  'urgent',
  'alert',
  'assign',
  'approval',
  'pending',
  'payroll',
  'warning',
] as const

const IMPORTANT_TEXT_KEYWORDS = [
  'thất bại',
  'lỗi',
  'cảnh báo',
  'khẩn',
  'phân công',
  'cần duyệt',
  'từ chối',
  'failed',
  'error',
  'urgent',
  'assign',
  'approval',
  'pending',
  'rejected',
  'action required',
] as const

export function isImportantNotification(
  item?:
    | (Pick<AppNotification, 'type' | 'title' | 'message'> & {
        relatedResource?: { type: string; id: string } | null
      })
    | null,
): boolean {
  if (!item) return false

  const type = (item.type || '').toLowerCase()
  const resourceType = (item.relatedResource?.type || '').toLowerCase()
  const title = (item.title || '').toLowerCase()
  const message = (item.message || '').toLowerCase()

  for (const keyword of IMPORTANT_TYPE_KEYWORDS) {
    if (type.includes(keyword) || resourceType.includes(keyword)) {
      return true
    }
  }

  for (const keyword of IMPORTANT_TEXT_KEYWORDS) {
    if (title.includes(keyword) || message.includes(keyword)) {
      return true
    }
  }

  return false
}
