# Auth Management Screens

## Goal

Complete the Auth administration UI before Employee provisioning: manage existing account lifecycle first, then roles, permissions, and scope policies.

## Boundaries

- Employee provisioning remains owned by HR and is not exposed in Accounts.
- Accounts remains the entry list for existing Auth accounts.
- Account detail, access, and security are separate routes so security actions do not compete with access configuration.

## Screen Map

```text
/auth/accounts
/auth/accounts/:accountId
/auth/accounts/:accountId/access
/auth/accounts/:accountId/security
/auth/roles
/auth/permissions
/auth/scopes
/auth/scopes/:scopeId/policies
```

## Delivery Order

1. Account detail and security: email, account state, password reset, session revocation, archive.
2. Roles: catalog and role-permission management.
3. Permissions: catalog management.
4. Scopes: registry and scoped role policies.

## Data Rules

- All reads and mutations use `/api/auth/*` through the shared API client.
- Every mutation invalidates the affected account or catalog query.
- `AUTH:WRITE` remains enforced by the backend; failed actions show contextual error feedback.
- The UI does not create accounts because staff provisioning owns account creation.
