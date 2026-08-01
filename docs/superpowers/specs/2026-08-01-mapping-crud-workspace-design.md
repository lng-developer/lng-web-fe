# Mapping CRUD Workspace Design

## Goal

Turn Mapping into one operational workspace with six internal tabs. The Workbench identifies blocked order items and directs operators to the correct rule tab. The other five tabs provide consistent CRUD workflows without exposing database identifiers.

## Information Architecture

The sidebar contains one `Mapping` entry. The page contains these tabs:

1. Workbench
2. SKU normalization
3. Product mapping
4. Data semantics
5. Value aliases
6. Vendor routing

The selected tab is stored in the `tab` query parameter. Existing legacy Mapping URLs redirect to the matching tab and preserve relevant context parameters.

## Workbench

The Workbench is a blocked-item queue, not a rule editor.

- A compact toolbar contains Shop, Marketplace, search, blocked stage, age, Clear filters, and Recheck actions.
- Summary counters show the total blocked items grouped by stage.
- The queue shows order number, SKU, shop, blocked stage, reason, age, and status.
- Selecting an item shows its processing path: SKU, Product, Inputs, Vendor, Ready.
- The detail area shows only business-readable values required to understand the blockage.
- `Open rule` navigates to the correct rule tab and carries the order item context.

## Rule Tab Pattern

All five rule tabs reuse the same structure:

- Compact title and description.
- One toolbar containing search, Shop, Status, tab-specific filters, Clear filters, and `Create rule`.
- Summary text for total, active, inactive, and conflicts; no oversized KPI cards.
- Dense paginated table using business names and codes.
- Row click opens the Update modal.
- History remains an explicit icon action with a tooltip.
- Enable/Disable is available from the row action menu.

Tab-specific table data:

| Tab               | Essential columns                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| SKU normalization | Segment index, segment role, matching values, output action, replacement, priority, shop, status |
| Product mapping   | Config code, marketplace product type, product group, internal template, shop, priority, status  |
| Data semantics    | Semantic role, match value, match type, product group, shop, priority, status                    |
| Value aliases     | Semantic role, raw value, normalized value, match type, shop, priority, status                   |
| Vendor routing    | Product group, vendor, ASIN/config, size, color, shop, priority, status                          |

## Create and Update Modal

- Create and Update use the same centered modal with a two-column form.
- The modal is wide enough to avoid horizontal scrolling.
- Required validation is limited to fields required by the backend contract.
- Product group, internal template, vendor, and shop use searchable selects with readable labels.
- MongoDB ObjectIDs are internal option values only and are never rendered as labels or helper text.
- Internal template options are filtered by the selected product group.
- Changing form values clears the previous preview and conflict result.
- Operators must run Preview and conflict validation before Save is enabled.
- Save success closes the modal, refreshes the table, and displays the product success toast.
- API errors remain in the modal and preserve all entered values.

## Disable and Delete Semantics

- Disable is the normal removal action and changes the rule status to `INACTIVE`.
- Inactive rules can be enabled again.
- Disable requires a confirmation dialog explaining the operational impact.
- Permanent delete is shown only when the backend confirms that the rule has never been used or referenced.
- Permanent delete requires a destructive confirmation and remains recorded in the audit log.
- Until that backend capability exists, the UI exposes Enable/Disable only.

## Data and Permission Rules

- Read actions require `MAPPING:READ`.
- Create, update, enable, disable, reorder, and permanent delete require `MAPPING:WRITE`.
- Controls are hidden or disabled from backend-provided permissions, never hardcoded role names.
- Reference dropdown data reuses existing Catalog and Vendor APIs.
- Loading, empty, and error states stay local to the table or modal that owns them.

## Performance

- Only the active tab mounts its heavy table.
- Reference options load when a relevant editor opens and remain cached by TanStack Query.
- Search input updates immediately while table filtering uses the shared 200 ms debounce.
- Modal state is isolated so opening an editor does not rerender the full Workbench queue.

## Verification

- Unit tests cover tab routing, filter parameter construction, readable reference labels, and status mutations.
- Component tests cover Create, Update, validation, preview/conflict gating, preserved values after errors, and Enable/Disable confirmation.
- One lightweight route smoke test confirms the canonical Mapping page and legacy redirects.
- Browser verification covers all six tabs in Vietnamese and English, light and dark themes, and confirms that no ObjectID is visibly rendered.

## Out of Scope

- Bulk rule editing.
- Import/export of rule configuration.
- A separate sidebar route for each rule type.
- Permanent delete before the backend provides safe usage checks.
