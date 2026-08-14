# Customer Module FE Spec

## Goal

Add a customer workspace that helps operators identify new vs returning customers, high-value customers, issue-prone customers, and customers needing care follow-up. This should feel like an operations CRM, not a marketing CRM.

## Routes

- `/portal/customers`
- `/portal/customers/:customerId`

Navigation label: `Customers`

Required permissions:

- Read screens: `CUSTOMERS:READ`
- Notes/care updates: `CUSTOMERS:WRITE`
- Segment/admin actions: `CUSTOMERS:MANAGE`

## API Client

Create `src/features/portal/customers/api/customerApi.ts`.

Functions:

- `listCustomers(params)`
- `getCustomerSummary(params)`
- `getCustomer(customerId)`
- `listCustomerTimeline(customerId, params)`
- `createCustomerNote(customerId, input)`
- `updateCustomerNote(customerId, noteId, input)`
- `deleteCustomerNote(customerId, noteId)`
- `updateCustomerCareStatus(customerId, input)`

Create query keys in `customerKeys.ts`.

## Workspace Page

`CustomerWorkspacePage.tsx`

Layout:

- Header: title, date/filter summary, refresh action.
- KPI row:
  - Total customers
  - New customers
  - Returning customers
  - VIP
  - Needs follow-up
- Filter bar:
  - Search
  - Lifecycle
  - Care status
  - Country
  - Sales channel
  - Shop
  - Last order date range
- Main table:
  - Customer
  - Lifecycle
  - Order count
  - Total revenue
  - Last order
  - Flags
  - Care status
  - Action
- Right panel or drawer on row click:
  - Compact profile
  - Stats
  - Latest orders
  - Latest events
  - Notes

Avoid showing too many cards. Customers are a list-first workflow.

## Detail Page

`CustomerDetailPage.tsx`

Sections:

- Profile header:
  - name
  - masked email/phone
  - lifecycle badge
  - care status selector
  - countries / shops / channels
- Value cards:
  - order count
  - total revenue
  - average order value
  - first/last order
- Timeline:
  - order created
  - address issue
  - shipment exception
  - case opened
  - note added
- Notes:
  - add care note
  - edit/delete own notes if allowed
- Related orders table:
  - external order id
  - ordered at
  - status
  - amount
  - issue indicators

## Customer Lifecycle Display

Badges:

- `NEW`: blue
- `RETURNING`: green
- `VIP`: purple
- `AT_RISK`: orange
- `ISSUE_PRONE`: red

Care statuses:

- `NONE`
- `NEEDS_FOLLOW_UP`
- `IN_PROGRESS`
- `RESOLVED`

## Dashboard Integration

Operations dashboard should replace mock `New Customers` with real customer summary when backend exists:

- new customers from `GET /api/customers/summary`
- returning customers
- VIP or needs-follow-up counts

Do not compute customers from orders on the frontend.

## UX Rules

- Keep table dense but readable.
- Do not expose raw unmasked PII.
- Make lifecycle/care filters one-click.
- Notes must be visible near care status.
- Empty state should say whether filters hide results.
- Row click opens focused customer view; action buttons must not steal row navigation accidentally.

## Frontend Tests

Minimum:

- list page renders KPIs and table from mocked API.
- filters update query params and query key.
- row click opens detail/drawer.
- care status update invalidates detail/list/summary queries.
- users without `CUSTOMERS:WRITE` cannot add notes.
- dashboard uses customer summary only when permission exists.

## Implementation Order

1. Add API types and query keys.
2. Add route/navigation permission gate.
3. Build list page with summary and filters.
4. Build detail drawer/page.
5. Add notes and care status mutations.
6. Wire operations dashboard customer metrics.
7. Add tests and run typecheck/build.
