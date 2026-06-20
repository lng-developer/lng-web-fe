import { normalizeRole } from '../../../layouts/sidebarNavigation.js'

function firstNonEmptyRole(roles = []) {
  return roles.find((role) => typeof role === 'string' && role.trim())
}

function firstScopedRole(scopes = []) {
  for (const scope of scopes) {
    const role = firstNonEmptyRole(scope?.roles)

    if (role) {
      return role
    }
  }

  return undefined
}

export function resolveCurrentUser(response) {
  const data = response?.data ?? response

  if (!data) {
    return null
  }

  if (data.account || data.profile || data.roles || data.scopes) {
    return {
      account: data.account ?? null,
      profile: data.profile ?? null,
      roles: Array.isArray(data.roles) ? data.roles : [],
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
    }
  }

  return data.user?.account ?? data.user ?? data.account ?? data
}

export function getCurrentUserDisplayName(user) {
  return (
    user?.profile?.fullName ??
    user?.profile?.email ??
    user?.account?.email ??
    user?.name ??
    user?.fullName ??
    user?.displayName ??
    user?.email ??
    ''
  )
}

export function getCurrentUserAvatar(user) {
  return (
    user?.profile?.avatarUrl ??
    user?.account?.avatarUrl ??
    user?.avatarUrl ??
    user?.avatar ??
    user?.photoUrl ??
    user?.imageUrl ??
    ''
  )
}

export function getCurrentUserRole(user) {
  return normalizeRole(
    firstNonEmptyRole(user?.roles) ??
      firstScopedRole(user?.scopes) ??
      user?.role ??
      user?.accountRole ??
      user?.type ??
      '',
  )
}

export function getCurrentUserInitials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return 'U'
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}
