import assert from 'node:assert/strict'
import test from 'node:test'

import { getPersonDisplayName } from './personDisplay.js'

test('getPersonDisplayName reads a name from common user profile payload shapes', () => {
  assert.equal(getPersonDisplayName({ fullName: 'Nguyen Van A' }), 'Nguyen Van A')
  assert.equal(
    getPersonDisplayName({
      id: '6a339b6c033e000000000001',
      userProfile: { fullName: 'Tran Thi B' },
    }),
    'Tran Thi B',
  )
  assert.equal(getPersonDisplayName({ account: { profile: { fullName: 'Le Van C' } } }), 'Le Van C')
})

test('getPersonDisplayName never exposes a Mongo user-profile id as a display label', () => {
  assert.equal(getPersonDisplayName('6a339b6c033e000000000001', 'Unassigned'), 'Unassigned')
  assert.equal(getPersonDisplayName({ id: '6a339b6c033e000000000001' }, 'Designer'), 'Designer')
})
