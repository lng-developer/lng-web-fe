# Etsy Tracking Center Command Design

## Intent

Reuse Tracking Center for Etsy batch tracking. An online Etsy agent can preview eligible shipment rows and queue one `UPLOAD_TRACKING` command; the extension is the only component that pushes to Etsy.

## Chosen approach

Add a `Push Etsy tracking` action beside the existing `Preview Fulfillments` action only for online Etsy agents. Reuse the row/list layout, but use an Etsy-specific preview modal and endpoint contract; the existing Amazon submission modal stays unchanged.

## Command contract

`POST /api/integration/extension-commands/commands`

```json
{
  "type": "UPLOAD_TRACKING",
  "shopId": "ObjectId",
  "agentId": "ObjectId",
  "items": [
    { "orderId": "4231418315", "trackingNumber": "9214490374008505076402", "carrier": "USPS" }
  ]
}
```

- `items` is required only for `UPLOAD_TRACKING`, contains 1–200 rows, and each row belongs to the selected shop.
- The backend claims Etsy `UPLOAD_TRACKING` commands and returns the items unchanged to the authenticated extension.
- The FE preview applies the existing carrier rule: `VIETTEL_POST` with a tracking number beginning `92` or `42` becomes `USPS`.

## UI behavior

- Disabled when the Etsy agent is offline or no eligible shipment exists.
- The modal shows ready, invalid and already-confirmed counts; only ready rows can be queued.
- Queue confirmation is explicit and reports the command ID. It does not push Etsy tracking from the browser.

## Non-goals

- Do not alter Amazon Tracking Center behavior.
- Do not bulk rewrite shipment carrier data.
- Do not add a second direct Etsy-push path in Portal.
