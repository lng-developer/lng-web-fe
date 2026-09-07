export const authKeys = {
  all: ['auth'] as const,
  accounts: {
    all: () => ['access-accounts'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? (['access-accounts', filters] as const) : (['access-accounts'] as const),
    detail: (accountId: string) => ['auth-account', accountId] as const,
    security: (accountId: string) => ['auth-account', accountId, 'security'] as const,
  },
  roles: {
    all: () => ['auth-roles'] as const,
    catalog: () => ['auth-role-catalog'] as const,
    detail: (roleId: string) => ['auth-roles', roleId] as const,
  },
  scopes: {
    all: () => ['auth-scopes'] as const,
    detail: (scopeId: string) => ['auth-scopes', scopeId] as const,
  },
  permissions: {
    all: () => ['auth-permissions'] as const,
  },
  accessExplorer: {
    all: () => ['access-explorer'] as const,
    detail: (accountId: string) => ['access-explorer', accountId] as const,
  },
}
