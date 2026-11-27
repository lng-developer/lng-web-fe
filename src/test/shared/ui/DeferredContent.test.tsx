import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DeferredContent } from '@/shared/ui/DeferredContent'

afterEach(() => vi.unstubAllGlobals())

describe('DeferredContent', () => {
  it('mounts only nearby content and preserves edits when it leaves the viewport', () => {
    const callbacks: IntersectionObserverCallback[] = []
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          callbacks.push(callback)
        }
        observe = vi.fn()
        disconnect = disconnect
      },
    )
    const mounted = vi.fn()
    function Detail({ id }: { id: number }) {
      mounted(id)
      const [value, setValue] = useState('')
      return (
        <input aria-label={`Note ${id}`} value={value} onChange={(e) => setValue(e.target.value)} />
      )
    }
    const { unmount } = render(
      <>
        {Array.from({ length: 50 }, (_, id) => (
          <DeferredContent key={id} revealLabel={`Show ${id}`}>
            <Detail id={id} />
          </DeferredContent>
        ))}
      </>,
    )
    expect(mounted).not.toHaveBeenCalled()
    act(() =>
      callbacks[0](
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Note 0'), { target: { value: 'Unsaved draft' } })
    act(() =>
      callbacks[0](
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    expect(screen.getByLabelText('Note 0')).toHaveValue('Unsaved draft')
    unmount()
    expect(disconnect.mock.calls.length).toBeGreaterThanOrEqual(50)
  })

  it('allows explicit reveal without scrolling', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    render(
      <DeferredContent revealLabel="Show details">
        <p>Task details</p>
      </DeferredContent>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }))
    expect(screen.getByText('Task details')).toBeVisible()
  })

  it('renders immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(
      <DeferredContent revealLabel="Show details">
        <p>Task details</p>
      </DeferredContent>,
    )
    expect(screen.getByText('Task details')).toBeVisible()
  })
})
