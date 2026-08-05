# Visual Manual Slot Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace technical slot metadata inputs with visual print-position cards, automatic metadata generation, and drag-and-drop upload.

**Architecture:** Keep the existing multipart API unchanged. `ManualSlotUploadModal` owns the small preset map and custom-key normalization; `ProductionWorkbenchPage` only passes existing task slot keys so the modal can hide duplicate presets. Ant Design supplies the form, selectable cards, upload behavior, and accessibility primitives.

**Tech Stack:** React, TypeScript, Ant Design, SCSS modules, i18next, Vitest, Testing Library.

## Global Constraints

- Keep the existing manual scaled-output API contract unchanged.
- Reuse Ant Design components and current modal/query patterns.
- Do not add a preset-management screen, dependency, or new backend model.
- The backend remains the final authority for key validation and duplicate prevention.
- Produce one implementation commit after all checks pass.

---

### Task 1: Visual slot selection and automatic metadata

**Files:**

- Modify: `src/features/portal/production/pages/ManualSlotUploadModal.tsx`
- Create: `src/features/portal/production/pages/ManualSlotUploadModal.module.scss`
- Modify: `src/features/portal/production/pages/ProductionWorkbenchPage.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Test: `src/test/portal/production/pages/ManualSlotUploadModal.test.tsx`

**Interfaces:**

- Consumes: existing `ManualScaledOutput` with `{ file, slotKey, slotLabel? }`.
- Adds prop: `existingSlotKeys?: readonly string[]` on `ManualSlotUploadModal`.
- Produces preset selection `{ slotKey, slotLabel }` and custom selection `CUSTOM_${normalizeSlotName(name)}` without changing `onSubmit`.

- [ ] **Step 1: Replace the current component test with failing behavior tests**

Keep the existing render setup and add these focused cases:

```tsx
it('submits mapped metadata for a visual preset', async () => {
  const onSubmit = vi.fn()
  const file = new File(['scaled'], 'front.png', { type: 'image/png' })
  render(<ManualSlotUploadModal open onClose={vi.fn()} onSubmit={onSubmit} />)

  fireEvent.click(screen.getByRole('radio', { name: 'Front' }))
  fireEvent.change(document.querySelector('input[type="file"]')!, {
    target: { files: [file] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add print position' }))

  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith({
      file,
      slotKey: 'FRONT',
      slotLabel: 'Front',
    }),
  )
})

it('derives a stable key for a custom Vietnamese position', async () => {
  const onSubmit = vi.fn()
  const file = new File(['scaled'], 'collar.png', { type: 'image/png' })
  render(<ManualSlotUploadModal open onClose={vi.fn()} onSubmit={onSubmit} />)

  fireEvent.click(screen.getByRole('radio', { name: 'Other position' }))
  fireEvent.change(screen.getByLabelText('Position name'), {
    target: { value: 'Viền cổ trước' },
  })
  fireEvent.change(document.querySelector('input[type="file"]')!, {
    target: { files: [file] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add print position' }))

  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith({
      file,
      slotKey: 'CUSTOM_VIEN_CO_TRUOC',
      slotLabel: 'Viền cổ trước',
    }),
  )
})

it('hides existing presets and keeps submit disabled until complete', () => {
  render(
    <ManualSlotUploadModal
      open
      existingSlotKeys={['FRONT']}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
    />,
  )

  expect(screen.queryByRole('radio', { name: 'Front' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add print position' })).toBeDisabled()
})
```

- [ ] **Step 2: Run the component test and confirm it fails for the removed technical flow**

Run:

```powershell
npx vitest run src/test/portal/production/pages/ManualSlotUploadModal.test.tsx
```

Expected: FAIL because visual radio options, `existingSlotKeys`, custom normalization, and the new copy do not exist.

- [ ] **Step 3: Implement the preset map, normalization, and visual form**

Define the preset data in `ManualSlotUploadModal.tsx`; no separate configuration layer is needed:

```tsx
const SLOT_PRESETS = [
  ['FRONT', 'front'],
  ['BACK', 'back'],
  ['LEFT_CHEST', 'leftChest'],
  ['LEFT_SLEEVE', 'leftSleeve'],
  ['RIGHT_SLEEVE', 'rightSleeve'],
] as const

function normalizeSlotName(value: string) {
  return value
    .replace(/[đĐ]/g, (letter) => (letter === 'đ' ? 'd' : 'D'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}
```

Use `Radio.Group` with card-like labels for the available presets and a `CUSTOM` option. Filter presets once with a `Set` built from `existingSlotKeys`. When `CUSTOM` is selected, render one required `Input` labeled **Position name**. Replace the button-wrapped upload with `Upload.Dragger`, keeping `beforeUpload={() => false}`, `maxCount={1}`, and current single-file state.

On submit, map values without exposing editable technical fields:

```tsx
const preset = SLOT_PRESETS.find(([key]) => key === values.position)
const slotLabel =
  values.position === 'CUSTOM'
    ? values.customLabel!.trim()
    : t(`portal.production.manualSlot.positions.${preset![1]}`)

onSubmit({
  file,
  slotKey:
    values.position === 'CUSTOM' ? `CUSTOM_${normalizeSlotName(slotLabel)}` : values.position,
  slotLabel,
})
```

Disable submit until a position and file are selected, and additionally until a non-empty custom label exists for `CUSTOM`. Keep the current loading and reset behavior. Put only layout and placement-marker styles in `ManualSlotUploadModal.module.scss`: responsive two/three-column card grid, selected border/background, compact product silhouette, upload zone, and summary row.

- [ ] **Step 4: Pass current slot keys and update localized copy**

In `ProductionWorkbenchPage.tsx`, pass the task slots already visible in the drawer:

```tsx
<ManualSlotUploadModal
  open={manualSlotOpen}
  saving={manualUpload.isPending}
  existingSlotKeys={checks.map((check) => check.slotKey)}
  onClose={() => setManualSlotOpen(false)}
  onSubmit={(input) => manualUpload.mutate(input)}
/>
```

Replace technical `slotKey`/`slotLabel` translations with localized keys for `choosePosition`, `positions.front`, `positions.back`, `positions.leftChest`, `positions.leftSleeve`, `positions.rightSleeve`, `positions.custom`, `customLabel`, `dropFile`, `technicalDetails`, and `submit`. Vietnamese user-facing copy uses **vị trí in** rather than **slot**; English uses **print position**.

- [ ] **Step 5: Run the focused tests**

Run:

```powershell
npx vitest run src/test/portal/production/pages/ManualSlotUploadModal.test.tsx src/test/portal/production/api/productionApi.test.ts
```

Expected: all modal and existing multipart API tests PASS.

- [ ] **Step 6: Run repository verification**

Run:

```powershell
npm run lint
npm run build
```

Expected: both commands exit with code 0.

- [ ] **Step 7: Create the single implementation commit**

Stage only the production manual-upload implementation, its tests, translations, and this plan; preserve unrelated working-tree changes:

```powershell
git add -- src/features/portal/production/pages/ManualSlotUploadModal.tsx src/features/portal/production/pages/ManualSlotUploadModal.module.scss src/features/portal/production/pages/ProductionWorkbenchPage.tsx src/features/portal/production/api/productionApi.ts src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/portal/production/pages/ManualSlotUploadModal.test.tsx src/test/portal/production/api/productionApi.test.ts docs/superpowers/plans/2026-08-01-visual-manual-slot-upload.md
git diff --cached --check
git commit -m "feat(production): add visual manual slot upload"
```
