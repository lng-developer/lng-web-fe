# Date Range Picker Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four immediately-applied date presets to the shared DateRangePicker without changing its public API.

**Architecture:** Put preset date calculations in a small pure utility consumed by the shared picker. The picker renders one responsive preset list and continues to own popover, draft range, manual Apply, and Clear behavior.

**Tech Stack:** React 19, MUI 9, Tailwind CSS 4, dayjs, react-i18next, Node test runner

---

### Task 1: Date preset calculations

**Files:**

- Create: `src/components/form/dateRangePresets.js`
- Create: `src/components/form/dateRangePresets.test.js`

- [ ] **Step 1: Write the failing test**

Test all four preset keys against `dayjs('2026-07-14T12:00:00')` and assert the `YYYY-MM-DD` start/end pairs: today `14/14`, yesterday `13/13`, last seven days `08/14`, and last thirty days `15 June/14 July`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/components/form/dateRangePresets.test.js`

Expected: FAIL because `dateRangePresets.js` does not exist yet.

- [ ] **Step 3: Add the minimal utility**

Export stable preset keys and `getDateRangePreset(preset, now = dayjs())`. Normalize `now` to the start of today, subtract zero, one, six, or twenty-nine calendar days, and return `{ start, end }`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/components/form/dateRangePresets.test.js`

Expected: four passing subtests and zero failures.

### Task 2: Responsive preset UI

**Files:**

- Modify: `src/components/form/DateRangePicker.jsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

- [ ] **Step 1: Add translated preset labels**

Add `today`, `yesterday`, `last7Days`, and `last30Days` under the existing `dateRangePicker` namespace in both locale files.

- [ ] **Step 2: Render presets in the popover**

Render the four options in a vertical left section on desktop and a horizontally scrollable section above the calendar on mobile. Use Tailwind classes for layout, spacing, borders, and state token colors.

- [ ] **Step 3: Apply a preset immediately**

On click, calculate the preset range, synchronize the draft, call the existing `onChange(range)`, and close the popover. Keep manual date selection, Apply, and Clear unchanged.

- [ ] **Step 4: Format and lint touched files**

Run: `npx prettier --write src/components/form/DateRangePicker.jsx src/components/form/dateRangePresets.js src/components/form/dateRangePresets.test.js src/i18n/locales/en/common.json src/i18n/locales/vi/common.json`

Run: `npx eslint src/components/form/DateRangePicker.jsx src/components/form/dateRangePresets.js src/components/form/dateRangePresets.test.js`

Expected: both commands exit with code 0.

### Task 3: Regression verification

**Files:**

- Test: `src/components/form/dateRangePresets.test.js`
- Test: `src/features/scale/utils/scaleApi.test.js`

- [ ] **Step 1: Run focused tests**

Run: `node --test src/components/form/dateRangePresets.test.js src/features/scale/utils/scaleApi.test.js`

Expected: all preset and Scale query mapping tests pass.

- [ ] **Step 2: Run project checks**

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands exit with code 0; the build may retain the existing chunk-size warning.

- [ ] **Step 3: Verify the Scale route**

Request: `http://localhost:5173/portal/fulfillment/scale`

Expected: HTTP 200 from the running Vite server.
