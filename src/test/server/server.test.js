import { describe, expect, it } from 'vitest'

import { createServer, getPathname } from '../../../server.mjs'

describe('getPathname', () => {
  it('returns null for a malformed URL path', () => {
    expect(getPathname('/%ZZ', 'localhost')).toBeNull()
  })

  it('responds with 400 for a malformed URL path', async () => {
    const server = createServer()
    await new Promise((resolve) => server.listen(0, resolve))

    try {
      const address = server.address()
      if (!address || typeof address === 'string')
        throw new Error('Server did not bind to a TCP port')

      const response = await fetch(`http://127.0.0.1:${address.port}/%ZZ`)

      expect(response.status).toBe(400)
    } finally {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    }
  })
})
