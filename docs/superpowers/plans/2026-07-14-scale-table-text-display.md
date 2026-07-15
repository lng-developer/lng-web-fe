# Scale Table Text Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show complete Order IDs and QC names while shortening long shop names to 16 characters with an ellipsis and tooltip.

**Architecture:** Add a pure display helper for deterministic shop-name shortening, then apply content-sized grid tracks and non-wrapping badges in the existing Scale table. No API or data mapper changes are required.

**Tech Stack:** React 19, MUI Tooltip, Tailwind CSS 4, node:test.

---

### Task 1: Add Shop Name Display Helper

**Files:**

- Create: `src/features/scale/utils/scaleDisplay.js`
- Create: `src/features/scale/utils/scaleDisplay.test.js`

- [ ] Write tests for values shorter than, equal to, and longer than 16 characters, plus empty and non-string values.
- [ ] Run `node --test src/features/scale/utils/scaleDisplay.test.js` and verify the missing helper causes RED.
- [ ] Implement `truncateDisplayText(value, maxLength)` so only long values receive `...`.
- [ ] Re-run the focused test and verify GREEN.

### Task 2: Apply Table Display Rules

**Files:**

- Modify: `src/features/scale/pages/ScalePage.jsx`

- [ ] Change Order ID and QC By grid tracks to content sizing.
- [ ] Render Order ID with a non-truncating, non-wrapping badge.
- [ ] Render Shop through the 16-character helper and show the full value in a tooltip only when shortened.
- [ ] Render QC By through a non-truncating, non-wrapping badge for both Amazon and Etsy.
- [ ] Add a reusable single-line text renderer with ellipsis and full-value tooltip.
- [ ] Apply `min-w-0 overflow-hidden` to all regular header and row cells.
- [ ] Let the table content wrapper grow horizontally so content-sized columns scroll instead of overlapping adjacent columns.

### Task 3: Verify

**Files:**

- Test: `src/features/scale/utils/scaleDisplay.test.js`
- Test: `src/features/scale/utils/scaleApi.test.js`

- [ ] Run focused Scale tests.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run Prettier check and `git diff --check`.

### Task 4: Truncate And Copy Order ID

**Files:**

- Modify: `src/features/scale/utils/scaleDisplay.js`
- Modify: `src/features/scale/utils/scaleDisplay.test.js`
- Modify: `src/features/scale/pages/ScalePage.jsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

- [ ] Write failing tests for Clipboard API success and document fallback behavior.
- [ ] Implement a copy helper that always copies the complete source value.
- [ ] Display at most 19 Order ID characters followed by `...` and preserve the complete value in the tooltip.
- [ ] Make the badge keyboard-accessible and show bilingual success/error snackbars.

### Task 5: Align Body Cells With Header Tracks

**Files:**

- Modify: `src/features/scale/pages/ScalePage.jsx`
- Test: `src/features/scale/utils/scaleTableLayout.test.js`

- [ ] Add a source-level regression test that requires one parent table grid, `grid-cols-subgrid` on header/loading/data rows, and full-column span on expanded detail.
- [ ] Run `node --test src/features/scale/utils/scaleTableLayout.test.js` and verify RED against the current independent row grids.
- [ ] Move `tableGridClass` to the shared table wrapper and make header, loading rows, and data rows span and inherit all tracks through `grid-cols-subgrid`.
- [ ] Make loading/error/empty states and expanded detail panels span all parent columns.
- [ ] Re-run the regression test and focused Scale tests, then run ESLint, production build, Prettier check, and `git diff --check`.

### Task 6: Remove Group And Assignment Status Columns

**Files:**

- Modify: `src/features/scale/constants/scaleConstants.js`
- Modify: `src/features/scale/pages/ScalePage.jsx`
- Test: `src/features/scale/utils/scaleTableLayout.test.js`

- [ ] Add a failing regression test for the remaining nine-column contract.
- [ ] Remove Group ID, Group Type, and Assignment from the header configuration and shared grid tracks.
- [ ] Remove the corresponding row cells and unused assignment-status display helpers while retaining the Scale By control.
- [ ] Run focused Scale tests, ESLint, production build, Prettier check, and `git diff --check`.

### Task 7: Distribute Table Columns Evenly

**Files:**

- Modify: `src/features/scale/pages/ScalePage.jsx`
- Test: `src/features/scale/utils/scaleTableLayout.test.js`

- [ ] Add a failing regression test requiring a full-width wrapper and equal fractional data tracks.
- [ ] Keep the expand track content-sized and distribute the remaining width across eight `minmax(0, 1fr)` tracks.
- [ ] Preserve the existing parent-grid/subgrid relationship for header, loading, and data rows.
- [ ] Run focused Scale tests, ESLint, production build, Prettier check, and `git diff --check`.
