# Mapping Multi-Page Module Design

## Goal

Separate two different operator jobs:

1. Find and unblock imported order items that cannot complete Mapping.
2. Maintain reusable Mapping rules for each pipeline behavior.

The Mapping Workbench remains the operational inbox. Rule authoring moves to focused pages so queue handling and long-lived configuration no longer compete for space or attention.

## Users And Permissions

- `MAPPING:READ` exposes Mapping navigation, Workbench evidence, rule lists, previews, impact samples, and history.
- `MAPPING:WRITE` exposes rule create/update, item recheck/resolve, bounded batch recheck, and vendor candidate selection.
- Authorization follows backend global or exact shop scope. The frontend never grants access from a hardcoded role name.
- Sellers and team leaders without Mapping permission continue to see only mapping state inside Orders.

## Routes And Navigation

Mapping becomes a sidebar group with six lazy routes:

```text
/portal/mapping/workbench
/portal/mapping/sku-rules
/portal/mapping/product-mapping
/portal/mapping/input-semantics
/portal/mapping/value-aliases
/portal/mapping/vendor-routing
```

`/portal/mapping` redirects to `/portal/mapping/workbench` for backward compatibility.

The rule pages correspond to backend rule types:

| Page            | Rule type       | Responsibility                                                           |
| --------------- | --------------- | ------------------------------------------------------------------------ |
| SKU Rules       | `skuNormalize`  | Remove or replace SKU segments and produce a canonical SKU               |
| Product Mapping | `skuConfig`     | Map config code to product group and internal template                   |
| Input Semantics | `semanticRules` | Classify imported inputs as size, color, text, image, material, or other |
| Value Aliases   | `valueAliases`  | Normalize equivalent input values                                        |
| Vendor Routing  | `vendorRouting` | Map normalized product data to vendor product and cost center            |

Rule history stays inside each rule page and does not become another route.

## Mapping Workbench

The Workbench displays every unmatched order item, regardless of whether it is blocked by SKU cleanup, product mapping, input semantics, value aliases, vendor routing, or candidate ambiguity.

### Queue

The queue supports bounded API filters for Shop, marketplace, blocker, pipeline stage, and age, plus shared debounced search for order ID, SKU, or ASIN. Selecting a row does not navigate.

Each row prioritizes readable business data:

- SKU and external order ID;
- Shop and marketplace;
- first blocking stage and reason;
- waiting age;
- readiness status.

Raw database IDs are secondary support metadata only.

### Focus View

The selected item renders:

- original and canonical SKU;
- the five-stage pipeline with completed and blocked stages;
- normalized inputs and their sources;
- product group and internal template;
- vendor product and cost-center candidates;
- current fulfillment plan state;
- recommended next action.

The Workbench does not embed a rule editor. Its action opens the responsible rule page with a minimal URL context:

```text
/portal/mapping/product-mapping?orderItemId=<id>&configCode=TS1S&returnTo=/portal/mapping/workbench
```

The URL carries identifiers needed to restore context, not mutable form payloads. The destination fetches canonical data from the backend.
`returnTo` is accepted only when it is an internal Mapping path; arbitrary URLs are ignored.

Vendor candidate selection remains in Workbench because it resolves one order item rather than defining a reusable rule.

## Rule Pages

All five pages use the same stable layout:

```text
Rule inventory | Rule editor | Preview and conflicts
```

Each page supplies only its own field definition and API rule type. Shared behavior includes:

- search and status/scope filters;
- create, select, update, activate, and deactivate;
- inline required-field validation;
- preview before save;
- exact-conflict blocking;
- acknowledged overlap warnings;
- sampled impact labels;
- lazy rule history;
- dirty-state protection;
- product success and concrete error toasts.

The editor uses readable selectors for Shop, vendor, product group, and template. It does not make operators enter opaque database IDs.

## Context Handoff And Return Flow

1. Operator selects a blocked item in Workbench.
2. Focus View identifies the first actionable blocker.
3. Operator opens the matching rule page.
4. The rule page reads `orderItemId` and relevant search hints, fetches canonical context, and pre-fills a new draft or highlights a matching rule.
5. Preview and conflict checks run explicitly before save.
6. Successful save rechecks only the originating item.
7. If resolved, the operator returns to Workbench with the item removed and the next queue item selected.
8. If another blocker remains, the result links to the next responsible rule page.
9. Cancel returns without mutating the item or rule.

Full-backlog recheck never runs implicitly. A bounded batch recheck remains an explicit Workbench action with confirmation.

## State And Performance

- TanStack Query owns server state through feature-level stable keys.
- Each route loads only its own rule list and page component.
- Workbench never requests rule inventories.
- Rule pages request order-item preview only when `orderItemId` exists.
- Search uses the shared 200 ms debounce.
- History and heavy impact content mount only when opened.
- Scroll events never trigger requests.
- Successful mutations invalidate only affected Mapping summary, rule list/history, selected preview, and unmatched queue keys.

## Error And Empty States

- Loading the queue or page data uses an inline loading state.
- Page-level load failure remains inline with a safe retry.
- Mutation failure preserves drafts and uses the shared product error toast.
- Validation stays beside the field.
- Exact conflicts and overlap warnings stay beside preview results.
- If the originating item no longer exists, the rule page remains usable and offers a return to Workbench.
- Read-only operators can inspect evidence but do not see write actions.

## Backend Contract

The implementation uses the existing `/api/mapping` endpoints for unmatched items, preview, resolve, recheck, candidate selection, five rule types, rule preview, conflicts, authorable shops, and history.

Before implementing Workbench filters, audit the unmatched-item validator and repository. If Shop, marketplace, blocker, stage, or age cannot be filtered server-side, add only those missing bounded query parameters to the backend. Client-side filtering of a single page is not acceptable because it produces incomplete operational results.

Any other backend change is allowed only if implementation proves that a required readable label is absent. The frontend must not replace missing labels with raw IDs or implement mapping decisions locally.

## Component Boundaries

- `MappingWorkbenchPage`: unmatched queue, selected item, trace, candidate selection, and route handoff.
- `MappingRulePage`: shared route shell for one rule type.
- `MappingRulePageConfig`: static field and copy configuration for the five rule pages.
- `ResolveQueuePanel`: filterable unmatched-item queue.
- `LiveTracePanel`: read-only pipeline evidence and item-level actions.
- `RuleInventoryPanel`: searchable rules for one type.
- `RuleEditorPanel`: local draft and save safety gate.
- `RuleImpactSamples`: preview and conflict evidence.
- `RuleHistoryModal`: lazy audit history.

No additional abstraction is introduced beyond the shared rule-page shell because the five pages have the same lifecycle and differ only in their rule schema.

## Verification

- Route tests cover redirect, lazy pages, permission gating, and navigation visibility.
- Workbench tests cover all blocker types, context links, candidate selection, item-only recheck, and no scroll request loop.
- Rule-page tests cover context prefill, readable options, preview/conflict gating, draft preservation, save, item recheck, and return behavior.
- API/model unit tests preserve canonical endpoint and pipeline mappings.
- Final gate runs Mapping-focused tests, lint, typecheck, and production build.

## Acceptance Criteria

- Workbench shows every order item blocked anywhere in the Mapping pipeline.
- Operator can identify the blocker and open the correct rule page without searching again.
- Rule pages contain only rule-management behavior for their own rule type.
- Successful rule save rechecks the originating item only.
- Candidate selection remains available in Workbench for item-level resolution.
- No route silently rechecks the full backlog.
- Read-only and write behavior follows backend permissions.
- No primary operator label is an opaque database ID.
