import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildProfileDetails } from './profileUser.js'

describe('buildProfileDetails', () => {
  it('builds display-ready profile details for the Figma personal information screen', () => {
    const user = {
      account: {
        email: 'AdminUser@LNG.co',
        username: 'AdminUser',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'System',
      },
      profile: {
        fullName: 'Admin User',
        birthday: '1999-02-03',
        phone: '0909000000',
        email: 'admin@lng.co',
        citizenId: '012345678901',
        address: '123 LNG Street',
      },
      department: { name: 'Operations' },
      roles: ['ADMIN'],
    }

    assert.deepEqual(buildProfileDetails(user), {
      displayName: 'Admin User',
      email: 'admin@lng.co',
      personalEmail: 'admin@lng.co',
      phone: '0909000000',
      birthday: '1999-02-03',
      citizenId: '012345678901',
      address: '123 LNG Street',
      username: 'AdminUser',
      role: 'admin',
      department: 'Operations',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'System',
      initials: 'AU',
    })
  })

  it('falls back to safe empty values when optional fields are missing', () => {
    const user = {
      account: {
        email: 'fallback@example.com',
      },
      roles: [],
    }

    assert.deepEqual(buildProfileDetails(user), {
      displayName: 'fallback@example.com',
      email: 'fallback@example.com',
      personalEmail: 'fallback@example.com',
      phone: '',
      birthday: '',
      citizenId: '',
      address: '',
      username: 'fallback@example.com',
      role: '',
      department: '',
      status: '',
      createdAt: '',
      createdBy: '',
      initials: 'F',
    })
  })
})
