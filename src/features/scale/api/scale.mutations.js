import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  assignEtsyScaleTaskCs,
  assignScaleTaskCs,
  updateEtsyScaleTaskMockups,
  updateEtsyScaleTaskNote,
  updateScaleTaskMockups,
  updateScaleTaskNote,
} from '@/features/scale/utils/scaleMock'

import { scaleKeys } from './scale.keys'

function invalidateScale(queryClient) {
  queryClient.invalidateQueries({ queryKey: scaleKeys.all })
}

export function useAssignScaleTaskCsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignScaleTaskCs,
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useAssignEtsyScaleTaskCsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignEtsyScaleTaskCs,
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useUpdateScaleTaskNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateScaleTaskNote,
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useUpdateEtsyScaleTaskNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEtsyScaleTaskNote,
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useUpdateScaleTaskMockupsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateScaleTaskMockups,
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useUpdateEtsyScaleTaskMockupsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEtsyScaleTaskMockups,
    onSuccess: () => invalidateScale(queryClient),
  })
}
