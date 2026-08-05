import type { MediaAssetListParams } from './mediaApi'

export const mediaKeys = {
  all: ['media'] as const,
  list: (params: MediaAssetListParams) => [...mediaKeys.all, 'list', params] as const,
}
