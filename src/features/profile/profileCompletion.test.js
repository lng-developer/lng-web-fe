import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  getOriginalDestination,
  getOriginalDestinationPath,
  getSetupRedirectDestination,
  ROUTES,
} from '../../constants/routes.js'

test('completion UI uses only the own-profile endpoints and never HR directory mutation', async () => {
  const source = await readFile('src/features/profile/api/profile.mutations.js', 'utf8')

  assert.match(source, /ENDPOINTS\.HR\.MY_EMPLOYEE_PROFILE_PERSONAL/)
  assert.doesNotMatch(source, /EMPLOYEE_PROFILE\(profileId\)/)
})

test('preserves a business destination through password and profile setup without targeting setup routes', async () => {
  const intended = { pathname: '/portal/orders', search: '?status=READY', hash: '#order-42' }
  const passwordLocation = { pathname: ROUTES.CHANGE_INITIAL_PASSWORD, state: { from: intended } }
  const protectedRoute = await readFile('src/routes/ProtectedRoute.jsx', 'utf8')
  const passwordForm = await readFile(
    'src/features/auth/components/ChangeInitialPasswordForm.jsx',
    'utf8',
  )
  const completionPage = await readFile(
    'src/features/profile/pages/CompleteProfilePage.jsx',
    'utf8',
  )

  assert.deepEqual(getSetupRedirectDestination({ pathname: intended.pathname }), {
    pathname: intended.pathname,
  })
  assert.deepEqual(getOriginalDestination(passwordLocation), intended)
  assert.equal(getOriginalDestinationPath(passwordLocation), '/portal/orders?status=READY#order-42')
  assert.equal(getOriginalDestinationPath({ pathname: ROUTES.COMPLETE_PROFILE }), null)
  assert.match(protectedRoute, /getSetupRedirectDestination\(location\)/)
  assert.match(
    protectedRoute,
    /\[ROUTES\.CHANGE_INITIAL_PASSWORD, ROUTES\.COMPLETE_PROFILE\]\.includes\(location\.pathname\)/,
  )
  assert.match(passwordForm, /getOriginalDestination\(location\)/)
  assert.match(completionPage, /getOriginalDestinationPath\(location\)/)
})
