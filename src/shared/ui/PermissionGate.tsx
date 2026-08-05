import type { ReactElement, ReactNode } from 'react'
import { cloneElement } from 'react'

export interface PermissionGateProps {
  readonly permissions: readonly string[]
  readonly required: string | readonly string[]
  readonly children: ReactElement<{ disabled?: boolean }>
  readonly fallback?: ReactNode
  readonly mode?: 'hide' | 'disable'
}

export function PermissionGate({
  permissions,
  required,
  children,
  fallback = null,
  mode = 'hide',
}: PermissionGateProps) {
  const requiredPermissions = Array.isArray(required) ? required : [required]
  const allowed = requiredPermissions.every((permission) => permissions.includes(permission))

  if (allowed) {
    return children
  }

  if (mode === 'disable') {
    return cloneElement(children, { disabled: true })
  }

  return fallback
}
