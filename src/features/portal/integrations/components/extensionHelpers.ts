import type { ExtensionTokenEnvironment } from '@/features/auth/extension-tokens/api/extensionTokensApi'

import type {
  ExtensionCommandType,
  ExtensionImportDays,
  ExtensionManagementAgent,
} from '../api/integrationApi'

export interface CreateExtensionCommandInput {
  agentId: string
  type: ExtensionCommandType
  numDays?: ExtensionImportDays
  dateFrom?: string
  dateTo?: string
}

export const EXTENSION_API_BASE_URLS: Record<ExtensionTokenEnvironment, string> = {
  local: 'http://localhost:3000',
  development: 'https://dev-api.lngmerch.co',
  production: '',
}

export const EXTENSION_ENVIRONMENT_LABELS: Record<string, string> = {
  local: 'Local',
  development: 'Development',
  production: 'Production',
}

export const EXTENSION_ENVIRONMENT_TONES: Record<string, 'processing' | 'ready' | 'operational'> = {
  local: 'processing',
  development: 'ready',
  production: 'operational',
}

export const RECENT_RECONNECT_MS = 5 * 60 * 1000

export function nextPollLabel(lastSeenAt: string, now: number) {
  const remaining = Math.max(0, 60_000 - (now - Date.parse(lastSeenAt)))
  if (!remaining) return 'Polling…'
  return `Poll in ${Math.ceil(remaining / 1000)}s`
}

export function isRecentlyReconnected(agent: ExtensionManagementAgent, now: number) {
  return (
    agent.status === 'ONLINE' &&
    Boolean(agent.lastReconnectedAt) &&
    now - Date.parse(agent.lastReconnectedAt!) <= RECENT_RECONNECT_MS
  )
}
