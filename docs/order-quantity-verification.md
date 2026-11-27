# Order quantity verification on develop

The quantity action edits internal order and production quantities. It does not change Amazon or customer-paid amounts.

Use isolated test data: development and production may share a database.

1. Open an order item with write access, before vendor dispatch readiness.
2. Select Edit quantity, enter a different positive integer and a reason, then save.
3. Verify the order item and production quantity agree; artwork and task status remain unchanged.
4. Verify estimated costs and finance reflect the quantity, while customer-paid amounts stay unchanged.
5. Verify history records the old/new quantity, actor and reason.
6. Reimport the marketplace report and verify the manual quantity remains.
7. Verify stale edits, other sellers' items, terminal items and existing vendor submissions are rejected.

If finance recalculation fails after commit, the response explicitly says quantity was saved. Refresh before retrying; do not assume the quantity change rolled back.
