const AVATAR_CLASSES = [
  '!bg-primary-light !text-primary',
  '!bg-[#dbeafe] !text-[#2563eb]',
  '!bg-[#ede9fe] !text-[#8b5cf6]',
  '!bg-[#dcfce7] !text-[#16a34a]',
  '!bg-[#fef3c7] !text-[#f59e0b]',
]

const ROLE_META = {
  admin: {
    label: 'Admin',
    className: '!bg-primary-light !text-primary !border-primary',
  },
  manager: {
    label: 'Manager',
    className: '!bg-[#ede9fe] !text-[#8b5cf6] !border-[#8b5cf6]',
  },
  leader: {
    label: 'Leader',
    className: '!bg-[#dbeafe] !text-[#2563eb] !border-[#2563eb]',
  },
  staff: {
    label: 'Staff',
    className: '!bg-[#fef3c7] !text-[#f59e0b] !border-[#f59e0b]',
  },
  anonymous: {
    label: 'Anonymous',
    className: '!bg-page !text-ink-secondary !border-border',
  },
}

export function normalizeRoleKey(roleCode = '') {
  const normalized = String(roleCode).toLowerCase()

  if (normalized.includes('admin')) return 'admin'
  if (normalized.includes('manager')) return 'manager'
  if (normalized.includes('leader')) return 'leader'
  if (normalized.includes('staff') || normalized.includes('user')) return 'staff'
  if (normalized.includes('anonymous') || normalized.includes('anon')) return 'anonymous'

  return normalized || 'anonymous'
}

export function getRoleMeta(roleCode = '') {
  const key = normalizeRoleKey(roleCode)

  return {
    key,
    label: ROLE_META[key]?.label ?? toTitleCase(roleCode || key),
    className: ROLE_META[key]?.className ?? ROLE_META.anonymous.className,
  }
}

export function getStatusMeta(status = '') {
  const active = status === 'active'

  return {
    key: active ? 'active' : 'inactive',
    labelKey: active ? 'rbac.users.status.active' : 'rbac.users.status.inactive',
    className: active
      ? '!bg-[#dcfce7] !text-[#16a34a] !border-[#16a34a]'
      : '!bg-[#fef3c7] !text-[#f59e0b] !border-[#f59e0b]',
  }
}

export function getAvatarMeta(displayName = '', index = 0, anonymous = false) {
  if (anonymous) {
    return {
      initials: 'KH',
      className: '!bg-page !text-ink-muted border border-border',
    }
  }

  const initials = String(displayName || 'KH')
    .split(/\s|@|\(/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return {
    initials: initials || 'KH',
    className: AVATAR_CLASSES[index % AVATAR_CLASSES.length],
  }
}

export function formatLastLoginLabel(value, now = new Date(), locale = 'vi') {
  if (!value) return '—'

  const date = new Date(value)
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000))
  const english = String(locale).startsWith('en')

  if (diffMinutes < 60) {
    const minutes = diffMinutes || 1
    return english
      ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
      : `${minutes} phút trước`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return english
      ? `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
      : `${diffHours} giờ trước`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) {
    const time = date.toLocaleTimeString(english ? 'en-GB' : 'vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return english ? `Yesterday, ${time}` : `Hôm qua, ${time}`
  }

  return english ? `${diffDays} days ago` : `${diffDays} ngày trước`
}

function toTitleCase(value = '') {
  return String(value)
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ')
}
