# Scale Table Text Display Design

## Goal

Improve text display in the Scale table without changing API contracts or row behavior.

## Decisions

- Order ID is never truncated. Its grid track uses content sizing so the complete badge remains visible.
- Shop names display at most 16 characters, followed by `...` when longer. A tooltip exposes the complete name.
- QC By always renders as a badge with the complete name on one line. Its grid track uses content sizing to avoid clipping or wrapping.
- The behavior applies consistently to Amazon and Etsy Scale tabs.

## Approach

Use a small pure display helper for the exact character-limit rule instead of relying only on CSS width truncation. Keep layout and visual styling in Tailwind classes, following `CONVENTIONS.md`.

## Verification

- Unit-test short, exact-length, long, empty, and non-string shop names.
- Run focused tests, ESLint, production build, Prettier check, and `git diff --check`.
