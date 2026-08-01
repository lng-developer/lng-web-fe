# Mapping Pipeline Workspace Design

## Goal

Build an operator-facing Mapping workspace that exposes the backend resolution pipeline directly. Mapping and Production operators can trace why an imported order item is blocked, correct the responsible rule, preview the effect, and recheck the item without moving through disconnected CRUD screens.

Seller and team-leader users do not receive this workspace. They continue to see only the mapping status and relevant blocker inside the Order workbench.

## Existing Contract

The backend already owns the required workflow under `/api/mapping`:

- mapping summary and configuration workbench;
- unmatched order-item queue;
- read-only fulfillment preview;
- automatic resolve and item or batch recheck;
- vendor candidate search and manual selection;
- SKU normalization, SKU configuration, semantic normalization, value alias, and vendor-routing rule management;
- rule preview, conflict detection, authorable shops, and rule history.

The frontend must use the shared API client, backend-provided permissions, and these existing endpoints. It must not reproduce mapping decisions in the browser.

## Users And Authorization

- `MAPPING:READ` exposes the navigation entry and permits viewing the workspace, queue, previews, candidates, rule history, and impact samples.
- `MAPPING:WRITE` permits rule creation and updates, status changes, recheck, resolve, batch recheck, and manual vendor/cost-center selection.
- Access remains global or exact shop-scoped according to backend authorization.
- No UI behavior is based on hardcoded role names.

## Information Architecture

The module uses one route: `/portal/mapping`.

It is one workspace rather than a collection of rule CRUD pages. Its fixed pipeline navigation follows the real resolution order:

1. SKU cleanup
2. Product mapping
3. Input semantics
4. Value aliases
5. Vendor routing

The unmatched queue remains an auxiliary mode inside this workspace. Selecting a blocked item loads its context and opens the pipeline step associated with its recommended fix.

## Desktop Layout

### Context bar

A compact top bar controls the active Shop, marketplace, SKU, or Order Item. Preview is explicit and read-only. Context is retained while the operator changes pipeline steps.

### Pipeline navigation

The left rail lists the five ordered stages. Each stage shows relevant rule and warning counts when returned by the backend. It does not use horizontal tabs.

### Rule inventory and editor

The center region displays rules belonging to the active stage. Search, status, scope, and priority filters are available. Selecting a rule opens an inline editor in the same workspace; create and update do not use a large modal.

### Live Trace

The right region explains the active preview:

- original and canonical SKU;
- rules applied at each stage;
- normalized inputs and their sources;
- selected product group and template;
- blockers and recommended fix;
- vendor product and cost-center candidates;
- auto-match confidence and estimated cost.

The UI uses readable names and codes. Database identifiers are retained only as secondary technical metadata when needed for support.

### Rule impact samples

The lower region displays conflict results, sampled affected order items, and before/after output. It must label these records as samples; the current backend does not provide an exact global affected-item count.

### Resolve queue

The queue is a compact panel in the same workspace. It supports search and filters for Shop, blocker, config code, product type, marketplace, and age. Selecting an item loads it into Live Trace. A successful selection or resolve offers an automatic move to the next queue item.

## Interaction Flow

1. The operator selects a Shop and enters a SKU or selects an unmatched item.
2. The frontend requests a read-only preview and renders the returned trace.
3. The recommended fix opens the responsible pipeline stage and relevant rules.
4. Create or update remains a local draft until the operator explicitly saves.
5. Before save, the frontend requests rule preview and conflict detection.
6. Exact conflicts block save. Broader scope overlaps produce a warning that the operator may acknowledge.
7. A successful write refreshes the inventory and rule history.
8. The workspace rechecks only the active item. It never silently rechecks the full backlog.
9. Batch recheck remains an explicit write action and previews its bounded scope before submission.
10. When valid candidates exist, an authorized operator can select a vendor product and cost center from Live Trace and persist the fulfillment plan.

The UI must not expose a distinct `Confirm mapping` action because the current `/confirm` endpoint is only a compatibility alias for manual selection and does not perform a real `CONFIRMED` transition.

## Component Boundaries

- `MappingWorkspacePage`: owns route-level context and coordinates queries.
- `MappingContextBar`: edits Shop, marketplace, SKU, and Order Item context.
- `MappingPipelineNav`: presents the ordered stages and warning counts.
- `RuleInventoryPanel`: lists and filters rules for the active stage.
- `RuleEditorPanel`: handles create and update drafts inline.
- `LiveTracePanel`: renders backend preview evidence and candidates.
- `RuleImpactSamples`: renders preview, conflict, and sample impact evidence.
- `ResolveQueuePanel`: lists unmatched items and loads their context.
- `RuleHistoryModal`: lazy-mounts rule audit history only when requested.

API calls and query keys live under the mapping feature. UI components consume normalized view models rather than raw response envelopes.

## State And Performance

- Server state uses TanStack Query with stable query keys.
- Draft form state remains local to `RuleEditorPanel`.
- Search fields use the shared debounced search component.
- Heavy panels and history content mount only when opened.
- Selecting a rule or editing a draft must not rerender the entire unmatched queue.
- Queries run from explicit context changes, not scroll or render loops.
- Preview requests are cancelled or ignored when their context is superseded.

## Error And Feedback UX

- Required-field and format validation appears beside the field.
- Rule conflicts and scope overlaps remain inline beside the preview.
- Successful writes use the shared success product toast.
- Failed actions use the shared error product toast with a concrete backend reason and retry only when safe.
- Workspace load failures remain inline with a retry action.
- Dirty editors warn before closing, changing rule, or changing pipeline stage.
- Empty, loading, and unauthorized states use existing shared foundations.

## Backend Changes

No backend change is required for the first implementation. Existing APIs are sufficient for the approved workspace.

A backend change is allowed only when implementation proves that a human-readable reference required by the operator is missing. The frontend must not work around missing names by displaying opaque identifiers. Exact global rule-impact counting is outside V1; sampled impact remains explicitly labelled.

## Reuse From The Previous Frontend

Reuse behavior and contract knowledge from the existing Mapping feature:

- API endpoint coverage and query invalidation intent;
- response mappers;
- rule field metadata;
- conflict and history flows;
- queue auto-next behavior.

Do not copy its MUI JSX or horizontal-tab structure into the Ant Design foundation.

## Verification

- Unit tests cover API serialization, response mapping, and pipeline-to-rule-type mapping.
- Component tests cover pipeline navigation, permissions, context preservation, and dirty-state protection.
- Interaction tests cover rule create/update, conflict blocking, overlap acknowledgement, item recheck, and manual candidate selection.
- A small route smoke test verifies lazy routing and permission-gated navigation without importing the entire application route tree.
- Final checkpoint runs focused tests, lint, typecheck, and production build.

## Acceptance Criteria

- An authorized operator can trace a blocked order item to the responsible pipeline stage without leaving the workspace.
- Rule changes show before/after output and conflict evidence before they are persisted.
- Saving a rule never silently triggers a full-backlog recheck.
- Candidate selection persists through the backend and advances the operator to the next item when requested.
- Read-only users can inspect all evidence but cannot see or execute write actions.
- Seller and team-leader navigation does not expose the Mapping workspace without `MAPPING:READ`.
- No user-facing surface relies on raw database identifiers as its primary label.
