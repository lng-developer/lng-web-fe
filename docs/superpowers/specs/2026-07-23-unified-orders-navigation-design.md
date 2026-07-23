# Unified Orders Navigation Design

## Goal

Expose one Portal navigation entry for all orders instead of separate Amazon and Etsy links.

## Behavior

- Replace the `orders-amazon` and `orders-etsy` children with one `orders-all` item.
- Point the item to `ROUTES.PORTAL_ORDER_LIST` with no `channel` search parameter.
- Keep the existing `ORDERS:READ` permission and the current mounted-route guard.
- Keep the Orders page channel filter unchanged, so users can still narrow the unified list to Amazon or Etsy.

## Scope

- Change only the Orders navigation configuration, its localized label, and focused navigation assertions.
- Do not change the route, API query builder, backend contract, order table, or channel filters.

## Verification

- The navigation test proves the visible Orders leaf is `orders-all` and targets `/portal/orders` without `?channel=`.
- Existing sidebar tests and targeted lint pass.
