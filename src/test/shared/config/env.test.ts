import { describe, expect, it } from 'vitest'

import { readEnv } from '@/shared/config/env'

describe('readEnv', () => {
  it('uses safe defaults when optional values are missing', () => {
    expect(readEnv({ DEV: false })).toEqual({
      apiBaseUrl: '',
      uploadApiBaseUrl: '',
      appName: 'LNG Web FE',
      isDev: false,
      googleClientId: '',
      microsoftClientId: '',
      microsoftTenantId: 'common',
    })
  })

  it('removes trailing slashes from the configured API base URL', () => {
    expect(
      readEnv({
        DEV: true,
        VITE_API_BASE_URL: 'https://api.example.test///',
        VITE_APP_NAME: 'LNG Operations',
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.example.test',
      uploadApiBaseUrl: 'https://api.example.test',
      appName: 'LNG Operations',
      isDev: true,
      googleClientId: '',
      microsoftClientId: '',
      microsoftTenantId: 'common',
    })
  })

  it('allows upload API base URL to use a different origin', () => {
    expect(
      readEnv({
        DEV: false,
        VITE_API_BASE_URL: 'https://app.example.test/api/',
        VITE_UPLOAD_API_BASE_URL: 'https://uploads.example.test///',
      }),
    ).toMatchObject({
      uploadApiBaseUrl: 'https://uploads.example.test',
    })
  })
})
