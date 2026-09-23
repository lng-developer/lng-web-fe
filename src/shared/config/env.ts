type EnvSource = Pick<
  ImportMetaEnv,
  | 'VITE_API_BASE_URL'
  | 'VITE_UPLOAD_API_BASE_URL'
  | 'VITE_APP_NAME'
  | 'VITE_GOOGLE_CLIENT_ID'
  | 'VITE_MICROSOFT_CLIENT_ID'
  | 'VITE_MICROSOFT_TENANT_ID'
  | 'DEV'
>

export function readEnv(source: EnvSource) {
  return Object.freeze({
    apiBaseUrl: (source.VITE_API_BASE_URL ?? '').replace(/\/+$/, ''),
    uploadApiBaseUrl: (source.VITE_UPLOAD_API_BASE_URL ?? source.VITE_API_BASE_URL ?? '').replace(
      /\/+$/,
      '',
    ),
    appName: source.VITE_APP_NAME ?? 'LNG Web FE',
    googleClientId: source.VITE_GOOGLE_CLIENT_ID ?? '',
    microsoftClientId: source.VITE_MICROSOFT_CLIENT_ID ?? '',
    microsoftTenantId: source.VITE_MICROSOFT_TENANT_ID ?? 'common',
    isDev: source.DEV,
  })
}

export const env = readEnv(import.meta.env)
