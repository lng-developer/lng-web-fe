# Scale API V2 Integration Design

## Scope

Adapt the Scale workspace to the Production API contract introduced by backend commit `3e54900`. The integration covers Amazon and Etsy task queues, status counters, assignable users, enriched order metadata, and slot-specific Scale assets.

## Queries

- List tasks through `GET /api/production/tasks` with channel, status, search, shop, assignee, date, page, and limit filters.
- Load counters separately through `GET /api/production/tasks/summary` so page changes do not refetch summary data.
- Load assignable Scale users through `GET /api/production/tasks/scale-assignees`.
- Load shops separately through the existing Shop list endpoint.
- Keep separate TanStack Query keys for list, summary, assignees, and shops.
- Amazon and Etsy tabs send `salesChannelCode=AMAZON` and `salesChannelCode=ETSY` respectively.

## Status Semantics

- Unassigned uses `designAssignmentStatus=UNASSIGNED` and `byAssignmentStatus.UNASSIGNED`.
- Pending uses `designAssignmentStatus=ASSIGNED` and `byAssignmentStatus.ASSIGNED`.
- Completed uses `scaleStatus=SCALED` and `byScaleStatus.SCALED`.
- QC Rejected uses `qcStatus=REJECTED` and `byQcStatus.REJECTED`.
- All uses the summary total after all non-status filters and channel filters are applied.

## Task Mapping

- Read group ID, group type, sales channel, order status, seller, and order owner from the new summary DTO.
- Read listing/template/PSD data from `scaleContext.use`.
- Read uploadable outputs from `scaleContext.use.scaleSlots` instead of the removed `fileChecks` field.
- Preserve customization, vendor product, vendor cost center, assignee, QC user, blockers, and timestamps.
- Display actual PSD/task status and real customer image URLs where provided.

## Assignment And Assets

- Populate assignment and Scale By filters from the dedicated assignee endpoint, not users found on the current page.
- Each Scale slot owns its upload action and output download action.
- Uploading targets the selected slot's `fileCheckId`; the UI never guesses the first incomplete slot.
- Disable slot upload when Scale context marks the task as not scalable or the slot has no usable input.

## Etsy Boundaries

- Enable the Etsy queue and its shared search, date, shop, Scale By, QC By, status, and pagination controls.
- Do not emulate vendor, order-status, or Scale-file filters client-side because backend pagination and counters would become incorrect.

## Error And Loading States

- Preserve list skeleton, empty state, error state, refresh state, mutation snackbars, and pagination behavior.
- Disable assignment and slot upload controls while their related mutations are pending.
- Keep the existing authenticated API and permission handling; no backend code is modified.

## Verification

- Update pure mapper/query tests for the V2 response and both channels.
- Test status counter mapping and slot-specific upload selection.
- Run focused tests, full lint, production build, diff checks, and the Scale route smoke check.
