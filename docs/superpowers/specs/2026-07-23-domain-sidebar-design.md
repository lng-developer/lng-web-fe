# Domain Sidebar Design

## Goal

Replace the legacy department-workspace portal navigation with one permission-aware, operational domain sidebar while retaining the real Portal | HR context switch.

## Approved portal information architecture

```
Dashboard
Commerce
  All Orders
  Catalog
    Listings
    Product Types
    Internal Templates
  Shops & Channels
Fulfillment
  Scale & Production
  Quality Control
  Vendor Submissions
  Shipping
Design Workspace
  Design Tasks
Supply & Data
  Vendors
  Product Cost
  SKU Mapping
Insights
  Reports
  Monitoring
    API Coverage
    Audit Log
System
  Users & Roles
```

HR remains a separate navigation context with My Time, Requests, Attendance, Schedule, and Employees. It is not merged into System; System owns application accounts and permissions while HR owns employee operations.

## Behaviour and constraints

- Every leaf keeps an existing mounted route and its current backend permission requirement.
- Navigation must not split Orders, Scale, QC, or Reports by Amazon/Etsy. Marketplace selection stays inside the destination screen.
- `All Orders` points to `/portal/orders` and is active only when `channel` is absent.
- `Catalog` owns Listing, Product Types, and Internal Templates. The latter two retain the existing `view` query presets.
- Reports uses `/portal/reports`; Monitoring groups the two mounted operational surfaces, API Coverage and Audit Log.
- Portal and HR context detection, tab keyboard focus, permission filtering, and safe first-visible navigation must stay intact.
- Use existing MUI components, the shared route constants, current auth permission helper, and existing translation files. Add no dependency and no new route.

## Out of scope

- Redesigning destination pages, their marketplace filters, their API contracts, or the Portal/HR visual shell.
- Introducing a generic Monitoring page or a new backend permission.
