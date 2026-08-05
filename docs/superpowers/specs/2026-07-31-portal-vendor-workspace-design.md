# Portal Vendor Workspace Design

## Goal

Manage global vendor reference data in one searchable, lazy tree while keeping provider credentials secure and keeping fulfillment submissions outside this module.

## Route And Permission

- Route: `/portal/vendors`
- Read requires `VENDORS:READ`.
- Create, update, status changes, and credential operations require `VENDORS:WRITE`.
- Vendor permissions are global, not shop-scoped.

## Management Tree

Use the existing shared management-tree behavior:

```text
Vendor
└── Vendor Product
    └── Cost Center
```

- The top-level search filters vendor code/name through the existing vendor list endpoint.
- Each expanded vendor branch provides product code/name search through the existing product list endpoint.
- Each expanded product branch provides cost-center code/name, SKU, and LNG-code search through the existing cost-center list endpoint.
- Vendor nodes load initially from the paginated vendor endpoint.
- Products load only when their vendor branch is expanded.
- Cost centers load only when their product branch is expanded.
- Expanding, selecting, or editing one branch must not rerender all open branches.
- Preserve expansion and selection during mutations when the affected entity still exists.
- A clear-search action restores the prior unfiltered state without closing unrelated branches.

## Vendor Node

Display:

- Code and name
- Provider key and fulfillment type when configured
- Active or inactive status
- Credential connection state
- Product count only when returned by real data; do not calculate it by fetching every branch

Actions:

- Add product
- Edit vendor
- Configure provider connection

Vendor code is immutable after creation.

## Product Node

Display the product code/name, catalog product type group, base cost/currency, production-day range, cost-center count, and status. Images use the existing media-safe URL renderer and fall back to a neutral placeholder.

Actions:

- Add cost center
- Edit product

The editor groups identity, catalog mapping, production, pricing, links/media, and status fields in a wide centered modal.

## Cost Center Node

Display code/name, SKU or LNG code, standard size/color, base cost/currency, and status. The grouped editor covers:

- Identity and vendor identifiers
- Vendor and standardized size/color
- Weight and dimensions with units
- Base, shipping, tax, and supported additional costs
- Attributes and status

Money inputs follow backend minor-unit semantics and show the selected currency clearly.

## Provider Configuration

The provider editor supports the backend auth types:

- `API_KEY`
- `ACCESS_REFRESH`
- `LOGIN_PASSWORD`

Read responses show only configured flags, status, expiry, last check, and last error. Never render or cache decrypted secrets. Empty secret fields mean keep the current secret unless the API explicitly receives a replacement. Credential refresh is an explicit icon action with confirmation and action-local loading.

## API Contract

Use the existing Vendor endpoint groups:

- Vendor list, create, detail, and update
- Product list, create, detail, and update
- Product cost-center list, create, and update
- Vendor integration read, update, and refresh

No Vendor Submission endpoint or model is consumed.

## States And Feedback

- Initial vendor list and expanded branches use separate skeletons.
- A failed child query shows Retry inside that branch without collapsing the rest of the tree.
- Create and update success use product success toasts.
- Duplicate immutable codes map to a clear field-level conflict message when backend details identify the field.
- Credential errors identify connection or authentication failure without exposing secret values.
- Dirty editors warn before close.

## Verification

- API tests cover every existing Vendor endpoint and DTO mapping used by the UI.
- Tree tests cover lazy loading, branch-local retries, stable expansion, search, clear search, and write-permission actions.
- Form tests cover grouped validation, minor-unit money mapping, duplicate conflicts, and secret preservation.
- Performance test evidence confirms opening an editor does not rerender every loaded tree row.

## Out Of Scope

- Vendor Submission, routing rules, production tasks, shipments, or finance records
- Bulk vendor spreadsheet import because no HTTP contract currently exposes it
- Shop-specific vendor access
- Displaying or retrieving decrypted credentials
