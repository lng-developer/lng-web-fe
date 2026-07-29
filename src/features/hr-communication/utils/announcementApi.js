export function mapAnnouncementRow(row) {
  return {
    ...row,
    actions: {
      update: Boolean(row?.capabilities?.update),
      delete: Boolean(row?.capabilities?.delete),
    },
  }
}

export function announcementPreview(content, maxLength = 180) {
  const text = String(content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}

export function mapAnnouncementCollection(payload) {
  if (!payload || !Array.isArray(payload.items)) return payload
  return { ...payload, items: payload.items.map(mapAnnouncementRow) }
}

export function buildAnnouncementPayload(values) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    category: values.category,
    priority: values.priority,
    status: values.status,
    sendToAll: values.sendToAll,
    targetDepartmentIds: values.sendToAll ? [] : values.targetDepartmentIds,
    targetProfileIds: values.sendToAll ? [] : values.targetProfileIds,
    isPinned: values.isPinned,
    scheduledAt: values.status === 'SCHEDULED' ? new Date(values.scheduledAt).toISOString() : null,
  }
}
