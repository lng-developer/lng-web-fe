import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { loginDefaultValues, loginSchema } from './loginSchema.js'

describe('loginSchema', () => {
  for (const identifier of ['J2501', 'employee@lng.co']) {
    it(`accepts ${identifier} as a login identifier`, () => {
      assert.deepEqual(loginSchema.parse({ identifier, password: 'secret' }), {
        identifier,
        password: 'secret',
      })
    })
  }

  it('rejects an empty login identifier', () => {
    assert.equal(loginSchema.safeParse({ identifier: '', password: 'secret' }).success, false)
  })

  it('uses identifier in the login form defaults', () => {
    assert.deepEqual(loginDefaultValues, { identifier: '', password: '' })
  })
})
