import type { ExtensionCommand } from '../api/integrationApi'

const ACTIVE_COMMAND_STATUSES = new Set<ExtensionCommand['status']>([
  'QUEUED',
  'CLAIMED',
  'RUNNING',
])

export function shouldPollExtensionCommands(
  commands: readonly Pick<ExtensionCommand, 'status'>[] | undefined,
) {
  return Boolean(commands?.some((command) => ACTIVE_COMMAND_STATUSES.has(command.status)))
}
