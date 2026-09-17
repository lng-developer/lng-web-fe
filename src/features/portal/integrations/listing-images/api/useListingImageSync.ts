import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  actOnImageJob,
  createImageJob,
  listImageJobs,
  listImageSchedules,
  saveImageSchedule,
} from './listingImageApi'
import type { ImageJobAction } from './listingImageApi'

const keys = {
  all: ['listing-image-sync'],
  schedules: ['listing-image-sync', 'schedules'],
  jobs: (page: number) => ['listing-image-sync', 'jobs', page],
}
export function useListingImageSync(enabled: boolean, page: number) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.all })
  const schedules = useQuery({
    queryKey: keys.schedules,
    queryFn: listImageSchedules,
    enabled,
    retry: false,
    refetchInterval: 30_000,
  })
  const jobs = useQuery({
    queryKey: keys.jobs(page),
    queryFn: () => listImageJobs(page),
    enabled,
    retry: false,
    refetchInterval: 10_000,
  })
  const save = useMutation({
    mutationFn: ({ agentId, enabled: active }: { agentId: string; enabled: boolean }) =>
      saveImageSchedule(agentId, active),
    onSuccess: refresh,
  })
  const create = useMutation({ mutationFn: createImageJob, onSuccess: refresh })
  const action = useMutation({
    mutationFn: ({ jobId, action }: { jobId: string; action: ImageJobAction }) =>
      actOnImageJob(jobId, action),
    onSuccess: refresh,
  })
  return { schedules, jobs, save, create, action }
}
