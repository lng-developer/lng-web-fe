import { Navigate, useLocation } from 'react-router-dom'

export function LegacyMappingRedirect({ tab }: { readonly tab: string }) {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  params.set('tab', tab)
  return <Navigate to={`/portal/mapping?${params}`} replace />
}
