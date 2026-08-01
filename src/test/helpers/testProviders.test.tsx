import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTestProviders } from '@/test/helpers/testProviders'

describe('renderWithTestProviders', () => {
  afterEach(cleanup)

  it('creates an independent QueryClient for every render', () => {
    const first = renderWithTestProviders(<div>First</div>)
    const second = renderWithTestProviders(<div>Second</div>)

    first.queryClient.setQueryData(['shared'], 'first')

    expect(first.queryClient).not.toBe(second.queryClient)
    expect(second.queryClient.getQueryData(['shared'])).toBeUndefined()
  })
})
