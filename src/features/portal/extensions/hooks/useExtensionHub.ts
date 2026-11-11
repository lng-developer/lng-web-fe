import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
import dayjs from 'dayjs'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import type { ExtensionTokenInput } from '@/features/auth/extension-tokens/api/extensionTokensApi'
import {
  createExtensionToken,
  revokeExtensionToken,
} from '@/features/auth/extension-tokens/api/extensionTokensApi'
import {
  canWriteFinanceForShop,
  canWriteOrdersForShop,
  canWriteOrdersSomewhere,
} from '@/features/portal/integrations/auth/integrationAccess'
import { shouldPollExtensionCommands } from '@/features/portal/integrations/hooks/extensionCommandPolling'
import { shopKeys } from '@/features/portal/shops/api/shopKeys'
import { useFeedbackToast } from '@/shared/ui'
import {
  createExtensionCommand,
  listAllActiveShops,
  listExtensionAgents,
  listExtensionCommands,
  listExtensionFinanceSchedules,
  listExtensionManagementAgents,
  listExtensionOrderSchedules,
  listExtensionTrackingSchedules,
  requestExtensionFinanceScheduleNow,
  requestExtensionTrackingScheduleNow,
  upsertExtensionFinanceSchedule,
  upsertExtensionOrderSchedule,
  upsertExtensionTrackingSchedule,
  type ExtensionCommand,
  type ExtensionCommandType,
  type ExtensionFinanceScheduleSource,
  type ExtensionImportDays,
  type ExtensionScheduleType,
} from '../api/extensionApi'
import { extensionKeys } from '../api/extensionKeys'

export interface CreateExtensionCommandInput {
  maxOrders?: number
  agentId: string
  type: ExtensionCommandType
  numDays?: ExtensionImportDays
  dateFrom?: string
  dateTo?: string
}

export function useExtensionHub() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const account = useRouteLoaderData('workspace') as CurrentAccount

  const [tokenForm] = Form.useForm<ExtensionTokenInput>()
  const [createdToken, setCreatedToken] = useState<string>()
  const [selectedCommand, setSelectedCommand] = useState<ExtensionCommand>()

  const canWrite = canWriteOrdersSomewhere(account)
  const canWriteFinance = account?.permissions?.includes('FINANCE:WRITE') ?? false
  const canUseExtension = canWrite || canWriteFinance

  const { data: shopsData, isLoading: isShopsLoading } = useQuery({
    queryKey: shopKeys.list({ page: 1, limit: 100, status: 'ACTIVE' }),
    queryFn: listAllActiveShops,
    staleTime: 5 * 60 * 1000,
  })

  const shops = useMemo(() => shopsData?.items ?? [], [shopsData?.items])
  const shopNames = useMemo(() => new Map(shops.map((shop) => [shop.id, shop.name])), [shops])
  const shopPlatforms = useMemo(
    () => new Map(shops.map((shop) => [shop.id, shop.salesChannelCode])),
    [shops],
  )

  const writableShops = useMemo(
    () => shops.filter((shop) => canWriteOrdersForShop(account, shop.id)),
    [account, shops],
  )

  const setupShopOptions = useMemo(
    () =>
      shops
        .filter(
          (shop) =>
            canWriteOrdersForShop(account, shop.id) || canWriteFinanceForShop(account, shop.id),
        )
        .map((shop) => ({
          label: `${shop.name} (${shop.salesChannelCode || 'AMAZON'})`,
          value: shop.id,
        })),
    [account, shops],
  )

  const extensionAgents = useQuery({
    queryKey: extensionKeys.agents(),
    queryFn: listExtensionAgents,
    enabled: canUseExtension,
    retry: false,
    refetchInterval: 30_000,
  })

  const extensionManagementAgents = useQuery({
    queryKey: extensionKeys.managementAgents(),
    queryFn: listExtensionManagementAgents,
    enabled: canUseExtension,
    retry: false,
    refetchInterval: 30_000,
  })

  const extensionCommands = useQuery({
    queryKey: extensionKeys.commands(),
    queryFn: () => listExtensionCommands({ page: 1, limit: 100 }),
    enabled: canUseExtension,
    retry: false,
    refetchInterval: (query) =>
      shouldPollExtensionCommands(query.state.data?.items) ? 10_000 : false,
  })

  const extensionOrderSchedules = useQuery({
    queryKey: extensionKeys.orderSchedules(),
    queryFn: listExtensionOrderSchedules,
    enabled: canWrite,
    retry: false,
  })

  const extensionTrackingSchedules = useQuery({
    queryKey: extensionKeys.trackingSchedules(),
    queryFn: listExtensionTrackingSchedules,
    enabled: canWrite,
    retry: false,
  })

  const extensionFinanceSchedules = useQuery({
    queryKey: extensionKeys.financeSchedules(),
    queryFn: listExtensionFinanceSchedules,
    enabled: canUseExtension,
    retry: false,
  })

  const createToken = useMutation({
    mutationFn: (input: ExtensionTokenInput) =>
      createExtensionToken({ ...input, expiresAt: input.expiresAt || null }),
    onSuccess: (result) => {
      setCreatedToken(result.token)
    },
    onError: (error) => {
      showFeedbackToast('error', error instanceof Error ? error.message : 'Token creation failed.')
    },
  })

  const revokeToken = useMutation({
    mutationFn: revokeExtensionToken,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: extensionKeys.agents() }),
        queryClient.invalidateQueries({ queryKey: extensionKeys.managementAgents() }),
      ])
      showFeedbackToast('success', 'Extension token revoked.')
    },
    onError: (error) => {
      showFeedbackToast('error', error instanceof Error ? error.message : 'Revoke failed.')
    },
  })

  const createCommand = useMutation({
    onError: (error) =>
      showFeedbackToast('error', error instanceof Error ? error.message : 'Command failed'),
    mutationFn: ({
      agentId,
      type,
      numDays,
      maxOrders,
      dateFrom,
      dateTo,
    }: CreateExtensionCommandInput) => {
      const agent = extensionAgents.data?.items.find((item) => item.id === agentId)
      if (!agent) throw new Error('Extension agent is unavailable')
      if (
        type === 'IMPORT_ADS_SPEND' &&
        (!dateFrom || !dateTo || dayjs(dateTo).diff(dayjs(dateFrom), 'day') > 119)
      ) {
        throw new Error('Choose an Ads date range of up to 120 days')
      }
      return createExtensionCommand({
        type,
        shopId: agent.shopId,
        agentId,
        ...(maxOrders !== undefined ? { maxOrders } : {}),
        ...(numDays ? { numDays } : {}),
        ...(dateFrom ? { dateFrom: dayjs(dateFrom).format('YYYY-MM-DD') } : {}),
        ...(dateTo ? { dateTo: dayjs(dateTo).format('YYYY-MM-DD') } : {}),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: extensionKeys.commands() })
      showFeedbackToast(
        'success',
        t('portal.integrations.extension.commandQueued', {
          defaultValue: 'Import command queued.',
        }),
      )
    },
  })

  const saveOrderSchedule = useMutation({
    mutationFn: ({
      agentId,
      enabled,
      scheduleType,
      intervalMinutes,
      fixedTimes,
      timezone,
    }: {
      agentId: string
      enabled: boolean
      scheduleType?: ExtensionScheduleType
      intervalMinutes?: 60 | 120 | 180 | 240
      fixedTimes?: string[]
      timezone?: string
    }) =>
      upsertExtensionOrderSchedule(agentId, {
        enabled,
        scheduleType,
        intervalMinutes,
        fixedTimes,
        timezone,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: extensionKeys.orderSchedules() })
      showFeedbackToast('success', 'Order schedule saved.')
    },
  })

  const saveFinanceSchedule = useMutation({
    mutationFn: ({
      agentId,
      source,
      enabled,
      scheduleType,
      intervalMinutes,
      fixedTimes,
      timezone,
    }: {
      agentId: string
      source: ExtensionFinanceScheduleSource
      enabled: boolean
      scheduleType?: ExtensionScheduleType
      intervalMinutes?: number
      fixedTimes?: string[]
      timezone?: string
    }) =>
      upsertExtensionFinanceSchedule(agentId, source, {
        enabled,
        scheduleType,
        intervalMinutes,
        fixedTimes,
        timezone,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: extensionKeys.financeSchedules() })
      showFeedbackToast('success', 'Finance schedule saved.')
    },
  })

  const requestFinanceScheduleNow = useMutation({
    mutationFn: ({
      agentId,
      source,
    }: {
      agentId: string
      source: ExtensionFinanceScheduleSource
    }) => requestExtensionFinanceScheduleNow(agentId, source),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: extensionKeys.financeSchedules() }),
        queryClient.invalidateQueries({ queryKey: extensionKeys.commands() }),
      ])
      showFeedbackToast('success', 'Finance import requested.')
    },
    onError: (error) => {
      showFeedbackToast(
        'error',
        error instanceof Error ? error.message : 'Finance import request failed.',
      )
    },
  })

  const saveTrackingSchedule = useMutation({
    mutationFn: ({
      agentId,
      enabled,
      scheduleType,
      intervalMinutes,
      fixedTimes,
      timezone,
    }: {
      agentId: string
      enabled: boolean
      scheduleType?: ExtensionScheduleType
      intervalMinutes?: number
      fixedTimes?: string[]
      timezone?: string
    }) =>
      upsertExtensionTrackingSchedule(agentId, {
        enabled,
        scheduleType,
        intervalMinutes,
        fixedTimes,
        timezone,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: extensionKeys.trackingSchedules() })
      showFeedbackToast('success', 'Tracking schedule saved.')
    },
  })

  const requestTrackingScheduleNow = useMutation({
    mutationFn: (agentId: string) => requestExtensionTrackingScheduleNow(agentId),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: extensionKeys.trackingSchedules() }),
        queryClient.invalidateQueries({ queryKey: extensionKeys.commands() }),
      ])
      showFeedbackToast('success', data.message || 'Tracking upload requested.')
    },
    onError: (error) => {
      showFeedbackToast(
        'error',
        error instanceof Error ? error.message : 'Tracking upload request failed.',
      )
    },
  })

  const managementAgents = useMemo(
    () => extensionManagementAgents.data?.items ?? [],
    [extensionManagementAgents.data?.items],
  )
  const schedules = useMemo(
    () => extensionOrderSchedules.data?.items ?? [],
    [extensionOrderSchedules.data?.items],
  )
  const trackingSchedules = useMemo(
    () => extensionTrackingSchedules.data?.items ?? [],
    [extensionTrackingSchedules.data?.items],
  )
  const financeSchedules = useMemo(
    () => extensionFinanceSchedules.data?.items ?? [],
    [extensionFinanceSchedules.data?.items],
  )
  const commands = useMemo(
    () => extensionCommands.data?.items ?? [],
    [extensionCommands.data?.items],
  )

  const onlineAgentsCount = useMemo(
    () => managementAgents.filter((agent) => agent.status === 'ONLINE').length,
    [managementAgents],
  )
  const activeSchedulesCount = useMemo(
    () =>
      schedules.filter((schedule) => schedule.enabled).length +
      trackingSchedules.filter((schedule) => schedule.enabled).length +
      financeSchedules.filter((schedule) => schedule.enabled).length,
    [schedules, trackingSchedules, financeSchedules],
  )
  const failedCommandsCount = useMemo(
    () => commands.filter((command) => command.status === 'FAILED').length,
    [commands],
  )

  return {
    account,
    canWrite,
    canWriteFinance,
    canUseExtension,
    shops,
    isShopsLoading,
    shopNames,
    shopPlatforms,
    setupShopOptions,
    writableShops,
    tokenForm,
    createdToken,
    setCreatedToken,
    selectedCommand,
    setSelectedCommand,
    createToken,
    revokeToken,
    createCommand,
    saveOrderSchedule,
    saveTrackingSchedule,
    saveFinanceSchedule,
    requestFinanceScheduleNow,
    requestTrackingScheduleNow,
    extensionAgents,
    extensionManagementAgents,
    extensionCommands,
    extensionOrderSchedules,
    extensionTrackingSchedules,
    extensionFinanceSchedules,
    managementAgents,
    schedules,
    trackingSchedules,
    financeSchedules,
    commands,
    onlineAgentsCount,
    activeSchedulesCount,
    failedCommandsCount,
  }
}
