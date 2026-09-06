import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
import dayjs from 'dayjs'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import type { ExtensionTokenInput } from '@/features/auth/extension-tokens/api/extensionTokensApi'
import {
  createExtensionToken,
  revokeExtensionToken,
} from '@/features/auth/extension-tokens/api/extensionTokensApi'
import { useFeedbackToast } from '@/shared/ui'

import {
  createExtensionCommand,
  listExtensionAgents,
  listExtensionCommands,
  listExtensionManagementAgents,
  listExtensionOrderSchedules,
  upsertExtensionOrderSchedule,
} from '../api/integrationApi'
import { integrationKeys } from '../api/integrationKeys'
import type { CreateExtensionCommandInput } from '../components/extensionHelpers'
import { shouldPollExtensionCommands } from './extensionCommandPolling'

export interface UseExtensionWorkbenchParams {
  readonly account: CurrentAccount
  readonly canWrite: boolean
}

export function useExtensionWorkbench({ canWrite }: UseExtensionWorkbenchParams) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()

  const [tokenForm] = Form.useForm<ExtensionTokenInput>()
  const [createdToken, setCreatedToken] = useState<string>()

  const extensionAgents = useQuery({
    queryKey: integrationKeys.extensionAgents(),
    queryFn: listExtensionAgents,
    enabled: canWrite,
    retry: false,
    refetchInterval: 30_000,
  })

  const extensionManagementAgents = useQuery({
    queryKey: integrationKeys.extensionManagementAgents(),
    queryFn: listExtensionManagementAgents,
    enabled: canWrite,
    retry: false,
    refetchInterval: 30_000,
  })

  const extensionCommands = useQuery({
    queryKey: integrationKeys.extensionCommands(),
    queryFn: () => listExtensionCommands({ page: 1, limit: 10 }),
    enabled: canWrite,
    retry: false,
    refetchInterval: (query) =>
      shouldPollExtensionCommands(query.state.data?.items) ? 10_000 : false,
  })

  const extensionOrderSchedules = useQuery({
    queryKey: integrationKeys.extensionOrderSchedules(),
    queryFn: listExtensionOrderSchedules,
    enabled: canWrite,
    retry: false,
  })

  const createToken = useMutation({
    mutationFn: (input: ExtensionTokenInput) =>
      createExtensionToken({ ...input, expiresAt: input.expiresAt || null }),
    onSuccess: (result) => {
      setCreatedToken(result.token)
    },
  })

  const createCommand = useMutation({
    mutationFn: ({ agentId, type, numDays, dateFrom, dateTo }: CreateExtensionCommandInput) => {
      const agent = extensionAgents.data?.items.find((item) => item.id === agentId)
      if (!agent) throw new Error('Extension agent is unavailable')
      if (
        type === 'IMPORT_ADS_SPEND' &&
        (!dateFrom || !dateTo || dayjs(dateTo).diff(dayjs(dateFrom), 'day') > 119)
      )
        throw new Error('Choose an Ads date range of up to 120 days')
      return createExtensionCommand({
        type,
        shopId: agent.shopId,
        agentId,
        ...(numDays ? { numDays } : {}),
        ...(dateFrom ? { dateFrom: dayjs(dateFrom).format('YYYY-MM-DD') } : {}),
        ...(dateTo ? { dateTo: dayjs(dateTo).format('YYYY-MM-DD') } : {}),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationKeys.extensionCommands() })
      showFeedbackToast(
        'success',
        t('portal.integrations.extension.commandQueued', {
          defaultValue: 'Import command queued.',
        }),
      )
    },
  })

  const revokeToken = useMutation({
    mutationFn: revokeExtensionToken,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: integrationKeys.extensionAgents() }),
        queryClient.invalidateQueries({ queryKey: integrationKeys.extensionManagementAgents() }),
      ])
      showFeedbackToast('success', 'Extension token revoked.')
    },
  })

  const saveOrderSchedule = useMutation({
    mutationFn: ({
      agentId,
      enabled,
      intervalMinutes,
    }: {
      agentId: string
      enabled: boolean
      intervalMinutes: 60 | 120 | 180 | 240
    }) => upsertExtensionOrderSchedule(agentId, { enabled, intervalMinutes }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationKeys.extensionOrderSchedules() })
      showFeedbackToast('success', 'Order schedule saved.')
    },
  })

  return {
    tokenForm,
    createdToken,
    setCreatedToken,
    createToken,
    extensionAgents,
    extensionManagementAgents,
    extensionCommands,
    extensionOrderSchedules,
    createCommand,
    revokeToken,
    saveOrderSchedule,
  }
}
