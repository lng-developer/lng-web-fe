import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('completion UI uses only the own-profile endpoints and never HR directory mutation', async () => {
  const source = await readFile('src/features/profile/api/profile.mutations.js', 'utf8')

  assert.match(source, /ENDPOINTS\.HR\.MY_EMPLOYEE_PROFILE_PERSONAL/)
  assert.doesNotMatch(source, /EMPLOYEE_PROFILE\(profileId\)/)
})
