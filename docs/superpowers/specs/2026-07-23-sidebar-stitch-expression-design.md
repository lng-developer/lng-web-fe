# Sidebar Stitch Expression Design

## Goal

Keep the current LNG sidebar palette, density, Portal | HR switch, route model, and permission filtering while expressing its hierarchy in the compact operational language shown by the Stitch reference.

## Approved hierarchy treatment

- A leaf remains an interactive navigation row with a 16px outlined blue/neutral icon.
- A domain parent with direct operational children is a non-interactive uppercase section label with no icon: Fulfillment, Design Workspace, Supply & Data, Insights, System, and HR Time.
- A functional parent with nested child routes remains a non-interactive row with a 16px icon and visible child inset: Catalog and Monitoring.
- All parents remain expanded. There is no expand/collapse state, chevron, keyboard target, or animation.
- Direct leaves stay at the root inset (16px); children use the existing 32px inset; grandchildren use the existing 48px inset.
- Remove the already-unneeded Commerce parent. All Orders, Catalog, and Shops & Channels stay direct Portal entries.

## Stitch-aligned icon map

Use only installed MUI outlined icons. Do not add an icon dependency.

| Navigation item    | Icon                    |
| ------------------ | ----------------------- |
| Dashboard          | `DashboardOutlined`     |
| All Orders         | `ShoppingCartOutlined`  |
| Catalog            | `Inventory2Outlined`    |
| Listings           | `ViewListOutlined`      |
| Product Types      | `CategoryOutlined`      |
| Internal Templates | `DescriptionOutlined`   |
| Shops & Channels   | `StorefrontOutlined`    |
| Scale & Production | `ConstructionOutlined`  |
| Quality Control    | `FactCheckOutlined`     |
| Vendor Submissions | `OutboxOutlined`        |
| Shipping           | `LocalShippingOutlined` |
| Design Tasks       | `BrushOutlined`         |
| Vendors            | `BusinessOutlined`      |
| Product Cost       | `PaymentsOutlined`      |
| SKU Mapping        | `LinkOutlined`          |
| Reports            | `AssessmentOutlined`    |
| Monitoring         | `MonitorHeartOutlined`  |
| API Coverage       | `ApiOutlined`           |
| Audit Log          | `HistoryOutlined`       |
| Users & Roles      | `PeopleAltOutlined`     |

## Implementation boundaries

- Change only `AppSidebar` rendering/styles, its icon map, and the focused sidebar composition tests.
- Preserve `sidebarNavigation.js` routes, IDs, labels, permission arrays, active-route behavior, and all Portal/HR context rules.
- Preserve keyboard focus for actual links and context tabs. Parent labels must not be focusable controls.
- Do not introduce new dependencies, routes, translation keys, or data/API work.
