# Financial Report Card Layout Design

## Goal

Make Daily profit, By seller, and By team use the same card hierarchy as Ads performance without changing report APIs, filters, or URL state.

## Layout

- Keep the existing report header, tabs, shared filters, and refresh action.
- Render each currency independently; amounts are never combined across currencies.
- Start every tab with five horizontal KPI cards (`grid-cols-2 lg:grid-cols-5`), matching Ads performance: uppercase label, prominent value, and currency caption.
- Use `rounded-lg border border-border bg-surface shadow-sm` for every report card.
- Each card title uses `px-4 py-3` and `border-b border-border`.

## Views

- **Daily profit:** Revenue, Product cost, Gross profit, Ad spend, Net profit cards; existing daily trend and channel net-profit charts; then a `Daily profit records` table card.
- **By seller:** Revenue, Product cost, Gross profit, Gross margin, Items cards; a ranked `Gross profit by seller` chart; then a `Seller performance` table card.
- **By team:** Revenue, Product cost, Gross profit, Gross margin, Items cards; a ranked `Gross profit by team` chart; then a `Team performance` table card.
- Seller and Team tabs expose their own dropdown filter. The selected value is sent to the matching report API and is preserved in the report URL.
- Seller/Team rank charts use a compact fixed-height card rather than growing with row count.

## Constraints

- Reuse `OperationsTable`, `DailyProfitChart`, and `ChannelProfitChart`; add one small reusable rank-chart component for seller and team dimensions.
- Do not add dependencies or change backend contracts.
- Preserve loading, empty, error, filter, and tab behavior.

## Verification

- Extend the Reports composition test for the card headers.
- Run focused report tests, ESLint for modified files, and production build.
