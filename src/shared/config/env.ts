type EnvSource = Pick<ImportMetaEnv, 'VITE_API_BASE_URL' | 'VITE_APP_NAME' | 'DEV'>

export function readEnv(source: EnvSource) {
  return Object.freeze({
    apiBaseUrl: (source.VITE_API_BASE_URL ?? '').replace(/\/+$/, ''),
    appName: source.VITE_APP_NAME ?? 'LNG Web FE',
    isDev: source.DEV,
  })
}

export const env = readEnv(import.meta.env)
