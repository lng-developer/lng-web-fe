# Vendor submissions and shipping header alignment

## Goal

Align the Vendor Submissions and Shipping page headers with the dense operations pattern used by QC and Scale.

## Design

- Replace the generic `OperationsHeader` block with a direct, 54px-minimum operations header.
- Show the page title at the shared `h5` / `text-xl` emphasis and retain the existing subtitle as small contextual text on the same visual line.
- Move refresh from the header into each page's existing toolbar as the compact icon action used by the other operational queues.
- Do not change routes, API requests, tabs, filters, table columns, or lifecycle actions.
