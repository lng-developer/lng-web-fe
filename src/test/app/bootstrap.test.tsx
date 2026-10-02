import { beforeEach, describe, expect, it, vi } from 'vitest'

const events: string[] = []

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: () => ({
      render: () => events.push('rendered'),
    }),
  },
}))

vi.mock('@/app/App', () => {
  events.push('app-loaded')
  return { App: () => null }
})

import { bootstrapApp } from '@/app/bootstrap'

describe('bootstrapApp', () => {
  beforeEach(() => {
    events.length = 0
  })

  it('waits for authentication callback handling before loading the router app', async () => {
    await bootstrapApp(async () => {
      events.push('authentication-finished')
    })

    expect(events).toEqual(['authentication-finished', 'app-loaded', 'rendered'])
  })

  it('does not load the application inside the Microsoft popup callback', async () => {
    await bootstrapApp(async () => false)

    expect(events).toEqual([])
  })
})
