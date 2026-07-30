import { describe, expect, it } from 'vitest'

import { readEnv } from './env'

describe('readEnv', () => {
  it('uses safe defaults when optional values are missing', () => {
    expect(readEnv({ DEV: false })).toEqual({
      apiBaseUrl: '',
      appName: 'LNG Web FE',
      isDev: false,
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
      appName: 'LNG Operations',
      isDev: true,
    })
  })
})
