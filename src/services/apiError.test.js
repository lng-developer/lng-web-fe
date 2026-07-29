import { AxiosError } from 'axios'
import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeApiError } from './apiError.js'

test('normalizeApiError preserves backend error code and message', () => {
  const error = new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    {},
    {},
    {
      status: 409,
      data: {
        success: false,
        error: {
          code: 'SCOPE_IN_USE',
          message: 'Scope has active assignments',
          requestId: 'request-1',
        },
      },
    },
  )

  const normalized = normalizeApiError(error)

  assert.equal(normalized.status, 409)
  assert.equal(normalized.code, 'SCOPE_IN_USE')
  assert.equal(normalized.message, 'Scope has active assignments')
  assert.equal(normalized.data.error.requestId, 'request-1')
})
