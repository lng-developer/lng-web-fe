import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './api/notificationApi'

const notificationKey = ['notifications'] as const

export function useNotificationCenter(open: boolean, limit: number, unreadOnly = false) {
  const queryClient = useQueryClient()

  const countQuery = useQuery({
    queryKey: [...notificationKey, 'unread-count'],
    queryFn: getUnreadCount,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  })

  const inboxQuery = useInfiniteQuery({
    queryKey: [...notificationKey, 'inbox', limit, unreadOnly],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listNotifications(unreadOnly, limit, pageParam),
    getNextPageParam: ({ pagination }) =>
      pagination.page * pagination.limit < pagination.total ? pagination.page + 1 : undefined,
    enabled: open,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKey })

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    meta: { skipGlobalToast: true },
  })

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    meta: { skipGlobalToast: true },
  })

  return {
    countQuery,
    inboxQuery,
    readMutation,
    readAllMutation,
    refresh,
  }
}
