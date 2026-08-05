# Report Executive Overview Design

## Goal

Replace the wide daily bar chart with a responsive executive dashboard that shows the latest 30 days by default and never expands the page horizontally.

## Design

- Keep currency summaries separate.
- Show four KPI cards, then a responsive revenue trend with at most five axis labels.
- Default to the latest 30 days. Aggregate by day for ranges up to 60 days and by week for longer ranges.
- Place buyer signals and operational blockers beside or below the trend depending on available width.
- Keep detailed seller, team, channel, and vendor tables in their existing tabs.
- Preserve current scoped-report API and permission behavior.

## Constraints

- Reuse React, Ant Design, TanStack Query, Day.js, and existing tokens.
- Add no chart dependency.
- No page-level horizontal scrolling at desktop widths.
- Loading and API error behavior remains contextual.

## Verification

- Test the real `workspace` loader contract.
- Test the 30-day default query and long-range aggregation.
- Run focused Report tests, lint, typecheck, build, and a runtime overflow measurement.
