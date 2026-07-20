# Finance Profit And Report Design

## Goal

Replace the existing finance and report API-workflow placeholders with read-only operational screens backed by the finance/report APIs.

## Scope

- Profit & Cost uses paginated finance snapshots with channel, shop, order, and cost-status filters.
- Financial Report exposes daily, seller, and team tables with shared report filters.
- Ads Performance is a daily profit report metric, not an unscoped client-side calculation.
- Keep the existing Reports/Amazon/Etsy sidebar hierarchy and routes.

## Data Rules

- Amounts are integer minor units. Currency is always shown and totals are grouped by currency.
- Gross profit remains the existing snapshot metric. Net profit is gross profit minus daily ad spend.
- Seller and team report tabs remain gross-profit-only because ads have no seller/team allocation.
- Missing cost stays visible in every relevant table and KPI summary.

## Backend Contract

- Extend snapshot listing with `salesChannelCode`.
- Add an authenticated `REPORTS:READ` daily profit endpoint that combines finance daily rows with AdsSpendDaily by date, shop, channel, marketplace, and currency.
- Seed deterministic AdsSpendDaily data for the same existing order scope and 28-day range as the finance demo seed. Order records remain unchanged.

## UX

- Profit & Cost: compact filter toolbar, currency-grouped KPI row, paginated order-item table.
- Financial Report: compact filter toolbar, Daily/Seller/Team tabs, currency-grouped KPI row, dense report table. Daily rows show ad spend and net profit; other tabs do not imply ad allocation.
- Use existing MUI/Tailwind/operations primitives. No chart library or new shared analytics abstraction.
