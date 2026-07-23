# Sales-channel UI filter design

## Goal

Provide one compact sales-channel selector on Orders, Scale, and QC. The selector offers `All`, `Amazon`, and `Etsy` and drives the existing backend `salesChannelCode` query contract.

## Behaviour

- `All` is the default and is represented by an absent `channel` URL parameter and an absent `salesChannelCode` API parameter.
- `Amazon` is persisted as `channel=amazon` and mapped to `salesChannelCode=AMAZON`.
- `Etsy` is persisted as `channel=etsy` and mapped to `salesChannelCode=ETSY`.
- A selection change resets pagination to page 1, updates the browser URL without navigation, and applies to both list and summary requests.
- Existing deep links with `channel=amazon` or `channel=etsy` remain valid.

## Scope

Reuse each screen's existing MUI Select/toolbar styling; do not add dependencies or create a new shared component for three small, screen-specific controls. Replace Scale's channel-derived two-tab assumption with the selector while retaining its Etsy-specific row presentation only when Etsy is selected. No marketplace filter is included.
