# Vendor Integration Modes Design

## Goal

Allow operators to create any Vendor without registering a backend provider enum value, while retaining safe automated fulfilment for supported providers.

## Domain Boundary

- A **Vendor** is an operator-managed business record. Its identity is `code`, `name`, fulfilment type, status, and pricing data. It has no technical provider key.
- A **Vendor integration** is an optional connection owned by one Vendor. It declares one mode: `MANUAL`, `GENERIC_API`, or `NATIVE`.
- A **native adapter key** is owned by backend code. It is only required for `NATIVE`, because code must exist to authenticate, create fulfilment orders, and consume provider-specific status responses.

## Modes

| Mode | Operator input | Fulfilment behavior |
| --- | --- | --- |
| `MANUAL` | No endpoint or credential | Vendor products and mappings can be managed; an operator fulfils orders outside the system. |
| `GENERIC_API` | HTTPS endpoint, supported auth method, and generic payload configuration | The backend may submit only through the documented generic contract; it must never pretend a vendor-specific adapter exists. |
| `NATIVE` | A backend-supported adapter key and its required credentials | The backend calls the corresponding provider adapter and can safely expose connection status. |

## UX

1. **Create/Edit Vendor** contains identity, fulfilment type, surcharge, and status only. Creating a Vendor must never ask for a provider key.
2. **Vendor Integrations** displays the integration mode and connection status. Selecting `MANUAL` needs no credential fields. Selecting `GENERIC_API` shows endpoint, auth, and generic configuration. Selecting `NATIVE` shows only backend-supported adapter keys and their credentials.
3. A Vendor without an integration is treated as manual until configured. It must not be presented as connected or automatically fulfilable.

## Backend Contract

- Remove `providerKey` from Vendor create/update input and from the Vendor persistence model after a guarded data migration.
- Replace `VendorIntegrationConfig.providerKey` with `mode` plus an optional `adapterKey`; retain existing encrypted credential fields and connection metadata.
- Validate `adapterKey` only when `mode === 'NATIVE'`. `MANUAL` requires neither endpoint nor credentials. `GENERIC_API` accepts only the explicitly supported generic auth and payload configuration.
- Existing provider-specific refresh behavior remains native-only. A new native provider such as DODPrint requires its own adapter implementation and tests; adding it to a UI dropdown alone is not an integration.

## Migration And Safety

- Backfill existing `Vendor.providerKey` into the corresponding Vendor integration as `NATIVE.adapterKey` before removing the old field.
- Keep the old field readable during the transition; do not silently erase active provider assignments.
- Block automatic submission when the integration is absent, disconnected, manual, or generic without a validated generic configuration.

## Verification

- Frontend tests prove Vendor creation submits no provider key and editing identity cannot alter integration configuration.
- Backend tests cover mode validation, migration/backfill, manual submission blocking, generic-contract validation, and native adapter routing.
- Run focused tests, lint, build, and one create/configure/manual-order smoke check.
