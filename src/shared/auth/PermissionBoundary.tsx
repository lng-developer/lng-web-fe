import type { ReactNode } from 'react'

import { AccessDeniedResult } from './AccessDeniedResult'
import { hasAnyPermission } from './permissions'

export interface PermissionBoundaryProps {
  readonly anyOf: readonly string[]
  readonly children: ReactNode
  readonly globalOnly?: boolean
}

export function PermissionBoundary({
  anyOf,
  children,
  globalOnly = false,
}: PermissionBoundaryProps) {
  if (hasAnyPermission(anyOf, { globalOnly })) return children
  return <AccessDeniedResult />
}

