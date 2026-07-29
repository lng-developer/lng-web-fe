import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSetupRoute, ROUTES } from '../../constants/routes.js'
import { resolveCurrentUser } from './utils/currentUser.js'

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

test('uses the safe current-account profile state for the setup redirect', () => {
  const user = resolveCurrentUser({
    data: {
      account: { mustChangePassword: false },
      roles: [],
      permissions: [],
      scopes: [],
      profileSetupRequired: true,
    },
  })

  assert.equal(
    resolveSetupRoute({
      mustChangePassword: user.account.mustChangePassword,
      profileSetupRequired: user.profileSetupRequired,
    }),
    ROUTES.COMPLETE_PROFILE,
  )
})
