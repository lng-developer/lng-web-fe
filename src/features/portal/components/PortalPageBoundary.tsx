import type { ReactNode } from 'react'
import { Result } from 'antd'

import { getGlobalPermissions, getPermissions } from '@/shared/auth/session'

export interface PortalPageBoundaryProps {
  readonly anyOf: readonly string[]
  readonly children: ReactNode
  readonly globalOnly?: boolean
}

export function PortalPageBoundary({
  anyOf,
  children,
  globalOnly = false,
}: PortalPageBoundaryProps) {
  const permissions = globalOnly ? getGlobalPermissions() : getPermissions()
  if (anyOf.some((permission) => permissions.includes(permission))) return children

  return <Result status="403" title="403" />
}
