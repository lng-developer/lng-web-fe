# Report Workspace Design

## Goal

Provide one permission-aware reporting workspace that turns the existing report APIs into actionable views for company operators without duplicating the Finance workspace.

## Users and scope

- Global `REPORTS:READ`: all report data.
- Department and team scopes: only finance snapshots belonging to those organization nodes.
- Own scope: only snapshots whose seller account matches the signed-in account.
- Shop scope: all supported report sources for the assigned shop.
- Unsupported source/scope combinations return no data; they must never fall back to global data.

## Backend contract

- Add `departmentId` to report filters.
- Add `GET /api/reports/filter-options` returning channels, marketplaces, sellers, teams, departments, and shops the caller may access.
- Reuse finance snapshot dimensions and public module ports; do not couple Report to internal repositories of other modules.
- Keep currencies separate in every aggregate.
- Finance daily, seller, and team reports support organization and own scopes.
- Ads, buyer, vendor, and operational summaries support global and shop scopes until their source records carry organization dimensions.

## Frontend

Route: `/portal/reports`, visible only with `REPORTS:READ` from global or scoped permissions.

The page has one compact filter toolbar and three tabs:

1. **Executive overview**: currency-separated revenue/profit cards and daily trend, buyer summary, and operational blockers.
2. **Sales & finance**: seller and team performance tables plus channel acquisition.
3. **Operations**: order/production/shipment status summaries and vendor performance.

Only the active tab fetches its datasets. Queries reuse TanStack Query caching and do not refetch on scroll. Charts use native HTML/CSS/SVG and existing tokens; no chart dependency is added.

## UX rules

- Never sum different currencies.
- Never expose ObjectIds as display labels.
- Loading, empty, and error states use shared foundation components.
- Filters use display names/codes and send IDs only as values.
- Desktop-first dense layout consistent with existing Portal workspaces.

## Out of scope

- Export files.
- Saved report presets.
- Organization-scoped operations/ads until those source models contain the required dimensions.
