import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useFeedbackToast } from '@/shared/ui'

import { listMediaAssets, type MediaAssetListParams, uploadMediaAsset } from '../api/mediaApi'
import { mediaKeys } from '../api/mediaKeys'

export function useMediaAssetsQuery(params: MediaAssetListParams) {
  return useQuery({
    queryKey: mediaKeys.list(params),
    queryFn: () => listMediaAssets(params),
  })
}

export function useUploadMediaAssetMutation() {
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: uploadMediaAsset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mediaKeys.all })
      toast('success', t('media.upload.success'))
    },
    onError: () => toast('error', t('media.upload.error')),
  })
}
