import type { ReactNode } from 'react'
import { Result } from 'antd'

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
  return <Result status="403" title="403" />
}
