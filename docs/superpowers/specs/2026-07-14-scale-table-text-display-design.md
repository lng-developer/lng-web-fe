# Scale Table Text Display Design

## Goal

Improve text display in the Scale table without changing API contracts or row behavior.

## Decisions

- Order ID displays at most 18 characters followed by `...`; its tooltip keeps the complete value.
- Clicking or keyboard-activating the Order ID badge copies the complete ID and reports success or failure through bilingual snackbar feedback.
- Shop names display at most 16 characters, followed by `...` when longer. A tooltip exposes the complete name.
- QC By always renders as a badge with the complete name on one line. Its grid track uses content sizing to avoid clipping or wrapping.
- Every regular grid cell establishes an overflow boundary with `min-w-0` and `overflow-hidden`.
- Long regular text and badge values remain on one line, use ellipsis, and expose their complete value through a tooltip.
- The table container grows to its content width and uses the existing horizontal scroll region when Order ID or QC By needs more space.
- The behavior applies consistently to Amazon and Etsy Scale tabs.

## Approach

Use a small pure display helper for the exact character-limit rule instead of relying only on CSS width truncation. Keep layout and visual styling in Tailwind classes, following `CONVENTIONS.md`.

## Verification

- Unit-test short, exact-length, long, empty, and non-string shop names.
- Unit-test clipboard API and document fallback behavior for Order ID copying.
- Run focused tests, ESLint, production build, Prettier check, and `git diff --check`.
