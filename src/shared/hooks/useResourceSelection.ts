import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useResourceSelection() {
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState<string>()
  const resourceId = params.get('resourceId') || undefined
  const select = useCallback(
    (id: string | undefined) => {
      setSelected(id)
      if (resourceId) {
        const next = new URLSearchParams(params)
        next.delete('resourceId')
        setParams(next, { replace: true })
      }
    },
    [params, resourceId, setParams],
  )
  return [resourceId ?? selected, select] as const
}
