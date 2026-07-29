import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSetupRoute, ROUTES } from '../../constants/routes.js'

test('redirects a default-password session to initial password change before profile completion', () => {
  assert.equal(
    resolveSetupRoute({ mustChangePassword: true, profileSetupRequired: true }),
    ROUTES.CHANGE_INITIAL_PASSWORD,
  )
})

test('redirects a password-ready incomplete profile to profile completion', () => {
  assert.equal(
    resolveSetupRoute({ mustChangePassword: false, profileSetupRequired: true }),
    ROUTES.COMPLETE_PROFILE,
  )
})
