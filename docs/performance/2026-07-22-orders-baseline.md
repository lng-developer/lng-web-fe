# Orders Targeted Evolution Baseline

Captured on 2026-07-22 against the local `/portal/orders` route on branch `refactor/orders-targeted-evolution-impl`.

## Automated checks

| Check                                                         | Exit code | Observed result                                                                                                                   |
| ------------------------------------------------------------- | --------: | --------------------------------------------------------------------------------------------------------------------------------- |
| Source lint: `npx eslint src vite.config.js eslint.config.js` |         0 | 0 lint findings                                                                                                                   |
| Node tests: `node --test "src/**/*.test.js"`                  |         1 | 492 tests: 491 passed, 1 failed, 0 skipped; 1285.148 ms. The unrelated API-coverage test is missing four `/api/reports/*` routes. |
| Production build: `npm run build`                             |         0 | 1437 modules transformed; completed in 1.17 s                                                                                     |
| Orders chunk: `dist/assets/OrdersPage-B6NpeweW.js`            |         0 | 89,257 bytes (89.25 kB; 26.26 kB gzip)                                                                                            |

## Operator journeys

Request counts below are local API requests, including CORS preflight requests.

| Journey                                       | Request count | Observation                                                                                                                                                    |
| --------------------------------------------- | ------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial load                                  |             6 | `OPTIONS` and `GET` for `/api/shops?page=1&limit=100`, `/api/orders/workbench?page=1&limit=10&tab=ALL`, and `/api/orders/summary`; 814 records shown.          |
| Change channel tab                            |             2 | Selecting `New Orders` requested `OPTIONS` and `GET /api/orders/workbench?page=1&limit=10&tab=NEW_ORDER`; URL became `?tab=new`.                               |
| Change seller filter                          |             4 | Selecting `J2510 Design QC Lead` requested `OPTIONS` and `GET` for the seller-scoped workbench and summary endpoints; response displayed `0 records`.          |
| Change page                                   |             2 | Moving to page 2 requested `OPTIONS` and `GET /api/orders/workbench?page=2&limit=10&tab=NEW_ORDER`; URL became `?tab=new&page=2`.                              |
| Expand one order row                          |             0 | Returned rows already rendered their detail panels. No dedicated expand control was present; clicking order ID `4088418130` copied it and made no API request. |
| Open and close customer dialog without saving |             0 | `Buyer` opened `Update Customer` for Nicole Capulli; `Cancel` closed it with no mutation request.                                                              |

## Visual captures

- Desktop (1440x900): `docs/performance/2026-07-22-orders-baseline-desktop-1440x900.png`
- Mobile (390x844): `docs/performance/2026-07-22-orders-baseline-mobile-390x844.png`
