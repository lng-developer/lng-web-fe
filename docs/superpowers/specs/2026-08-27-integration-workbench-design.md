# Integration Workbench Hybrid Design

## Goal

Make operational integration data faster to scan and act on by using a stable master-detail workbench pattern for Imports, Amazon Extension, and Finance data.

## Constraints

- Preserve the existing route, API contracts, permission checks, query keys, mutations, and URL-backed Import filters.
- Use existing shared UI primitives, Ant Design, SCSS modules, and i18n.
- Add no dependency or backend field unless the implementation proves a missing data point.
- Keep inactive workbench queries disabled; retain existing active import polling only while its detail is open.

## Interaction Model

The page keeps exactly three primary tabs: Imports, Amazon Extension, and Finance data. Each workbench follows one relationship: operators scan a compact master list, select an item, then inspect and act from a persistent contextual panel. On smaller widths, the panel becomes the existing accessible detail drawer.

## Imports

- Keep the existing URL-backed filters and Upload report action.
- Add a slim three-state operational summary above the table using data already present in the import jobs list: needs review, processing, and completed.
- Selecting a job opens the existing `ImportJobPanel` as a right contextual panel on wide screens rather than a screen-obscuring drawer.
- Retain the existing job summary, progress phases, raw records, retry rules, issue count, and error feedback inside that panel.
- Keep `ImportIssueQueue` below the table as the secondary triage surface; it does not duplicate the selected-job detail.

## Amazon Extension

- Use the current management-agent list as the left master list.
- Keep the current selected agent context on the right and organize it as Command queue, Automation, and Connection details.
- Retain existing command creation, command error/timeline view, schedule mutation, token creation and revocation permissions.
- Use the current agent health, command status, last-seen, and schedule data; no new backend contract is required.

## Finance Data

- Keep the current Ads, Ads mapping, Transactions, and Settlements sources.
- Make the finance filters compact and one-line within the active source.
- Selecting an import batch or pending mapping row opens a right reconciliation panel. It uses fields already returned by the selected row/batch: source, shop, status, file, processed/valid/error counts, date range, and available mapping action.
- A visual variance/evidence panel is out of scope until the current backend exposes payout-level amount and evidence data; do not fabricate financial values in production UI.

## Visual System

- Use the current semantic theme tokens, borders, and existing status tags; no hard-coded palette.
- Use 8px spacing increments, compact table density, visible focus states, and icon controls with accessible labels.
- The right panel is 360–440px on desktop, resizable only if a shared component already supports it; otherwise fixed width.
- Preserve light and dark mode through theme tokens and do not add decorative animation.

## State and Data Flow

- Local state owns only active tab and selected master-list item.
- Existing TanStack Query hooks remain the source of truth. Query enablement stays tied to the selected top-level workbench.
- URL parameters remain the source of truth for import filters and selected import job deep links.
- Mutations keep their existing query invalidations and feedback handling.

## Verification

- Add focused UI tests for master-list selection, contextual panel visibility, and top-level query activation.
- Run the focused Integration UI test, lint, and build. Report pre-existing unrelated lint failures separately.
