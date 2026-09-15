import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { useGenerationIntent } from '@/features/portal/catalog/listing-launch/hooks/useGenerationIntent'
import {
  activeRun,
  useLaunchRunPolling,
} from '@/features/portal/catalog/listing-launch/hooks/useLaunchRunPolling'
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
it('reuses an uncertain request across remount but changes key for a new source or deliberate retry', () => {
  const first = renderHook(() => useGenerationIntent('draft-test', 'analysis'))
  const command = first.result.current.getOrCreate({ expectedMockupRevision: 1 })
  first.unmount()
  const resumed = renderHook(() => useGenerationIntent('draft-test', 'analysis'))
  expect(resumed.result.current.getOrCreate({ expectedMockupRevision: 1 })).toEqual(command)
  expect(resumed.result.current.getOrCreate({ expectedMockupRevision: 2 }).requestKey).not.toBe(
    command.requestKey,
  )
  resumed.result.current.clear()
  expect(resumed.result.current.getOrCreate({ expectedMockupRevision: 1 }).requestKey).not.toBe(
    command.requestKey,
  )
})
it('tracks hidden views and only recognizes nonterminal statuses as active', () => {
  const original = Object.getOwnPropertyDescriptor(document, 'visibilityState')
  const hook = renderHook(useLaunchRunPolling)
  act(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(hook.result.current).toBe(false)
  act(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(hook.result.current).toBe(true)
  expect(['QUEUED', 'RUNNING', 'FAILED', 'SUCCEEDED'].map(activeRun)).toEqual([
    true,
    true,
    false,
    false,
  ])
  if (original) Object.defineProperty(document, 'visibilityState', original)
})
