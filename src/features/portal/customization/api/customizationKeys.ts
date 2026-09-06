import { CustomizationParams } from './customizationApi'

export const customizationKeys = {
  all: ['customizations'] as const,
  list: (params: CustomizationParams) => [...customizationKeys.all, 'list', params] as const,
  summary: (params: CustomizationParams = { blockedOnly: true }) =>
    [...customizationKeys.all, 'summary', params] as const,
}
