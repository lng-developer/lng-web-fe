import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'

import { loadAccessAccounts } from '@/features/auth/api/accessExplorerApi'

import { accountKeys } from '../api/accountKeys'
import {
  archiveAccount,
  createAccount,
  CreateAccountInput,
  loadAccount,
  resetAccountPassword,
  revokeAccountSessions,
  updateAccountEmail,
  updateAccountOperatingCost,
  updateAccountStatus,
} from '../api/accountManagementApi'

export function useAccessAccountsQuery() {
  return useQuery({
    queryKey: accountKeys.all(),
    queryFn: loadAccessAccounts,
  })
}

export function useAccountDetailQuery(accountId: string) {
  return useQuery({
    queryKey: accountKeys.detail(accountId),
    queryFn: () => loadAccount(accountId),
    enabled: Boolean(accountId),
  })
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAccountInput) => createAccount(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
    },
  })
}

export function useUpdateAccountEmailMutation(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => updateAccountEmail(accountId, email),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountKeys.detail(accountId) }),
        queryClient.invalidateQueries({ queryKey: accountKeys.all() }),
      ])
    },
  })
}

export function useUpdateAccountStatusMutation(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: 'active' | 'inactive') => updateAccountStatus(accountId, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountKeys.detail(accountId) }),
        queryClient.invalidateQueries({ queryKey: accountKeys.all() }),
      ])
    },
  })
}

export function useUpdateAccountOperatingCostMutation(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      amount?: number
      startedAt?: Dayjs | string | null
      operatingCostAmount?: number
      operatingCostStartedAt?: string | null
    }) => {
      const amount =
        input.amount !== undefined
          ? Math.round(input.amount * 100)
          : (input.operatingCostAmount ?? 0)
      let startedAt: string | null = null
      if (input.startedAt) {
        startedAt =
          typeof input.startedAt === 'string'
            ? input.startedAt
            : (input.startedAt as Dayjs).toISOString()
      } else if (input.operatingCostStartedAt !== undefined) {
        startedAt = input.operatingCostStartedAt
      }
      return updateAccountOperatingCost(accountId, amount, startedAt)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountKeys.detail(accountId) })
    },
  })
}

export function useResetAccountPasswordMutation(accountId: string) {
  return useMutation({
    mutationFn: (password: string) => resetAccountPassword(accountId, password),
  })
}

export function useRevokeAccountSessionsMutation(accountId: string) {
  return useMutation({
    mutationFn: () => revokeAccountSessions(accountId),
  })
}

export function useArchiveAccountMutation(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => archiveAccount(accountId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
    },
  })
}
