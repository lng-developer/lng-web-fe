import { deepMerge } from './deepMerge'

const enModules = import.meta.glob<Record<string, unknown>>('./locales/en/**/*.json', {
  eager: true,
  import: 'default',
})

const viModules = import.meta.glob<Record<string, unknown>>('./locales/vi/**/*.json', {
  eager: true,
  import: 'default',
})

export type LocaleDictionary = Record<string, unknown> & {
  orders: {
    tabs: Record<string, string>
    statuses: Record<string, string>
    [key: string]: unknown
  }
  [key: string]: unknown
}

export const en = deepMerge<LocaleDictionary>(...Object.values(enModules))
export const vi = deepMerge<LocaleDictionary>(...Object.values(viModules))

export default { en, vi }
