import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readPageSource() {
  return readFileSync(new URL('./ScalePage.jsx', import.meta.url), 'utf8')
}

function readEnglishLocale() {
  return JSON.parse(
    readFileSync(new URL('../../../i18n/locales/en/common.json', import.meta.url), 'utf8'),
  )
}

test('Scale table translates the seller column label', () => {
  const locale = readEnglishLocale()

  assert.equal(locale.scale.table.columns.seller, 'Seller')
})

test('Scale page uses the shared operations shell controls around its existing grid table', () => {
  const source = readPageSource()

  assert.equal(source.includes("from '@/components/operations'"), true)
  assert.equal(source.includes('<OperationsPageShell'), true)
  assert.equal(source.includes('<OperationsToolbar'), true)
  assert.equal(source.includes('<OperationsTabs'), true)
  assert.equal(source.includes('variant="underline"'), true)
  assert.equal(source.includes('grid w-full grid-cols-1 items-center gap-2'), true)
  assert.equal(source.includes('xl:w-fit xl:max-w-full'), true)
  assert.equal(source.includes('<OperationsTable'), false)
  assert.match(source, /className=\{`grid w-full min-w-full \$\{tableGridClass\}`\}/)
})

test('Scale page does not render a platform filter', () => {
  const source = readPageSource()

  assert.equal(source.includes('subTabs.map'), false)
  assert.equal(source.includes('onChange={handleSubTabChange}'), false)
  assert.equal(source.includes('SCALE_SUB_TABS'), true)
})

test('Scale page derives the active channel from the current URL search', () => {
  const source = readPageSource()

  assert.equal(
    source.includes(
      'const activeSubTab = dashboardSearch.activeSubTab || SCALE_SUB_TABS.GROUP_TASK',
    ),
    true,
  )
  assert.equal(source.includes('const [activeSubTab] = useState'), false)
  assert.equal(source.includes('salesChannelCode'), true)
})

test('Scale refreshes only the current task and summary queries', () => {
  const source = readPageSource()

  assert.equal(source.includes('activeQuery.refetch()'), true)
  assert.equal(source.includes('summaryQuery.refetch()'), true)
  assert.equal(source.includes('queryClient.invalidateQueries({ queryKey: scaleKeys.all })'), false)
})

test('Scale page always renders each task detail like the Orders page', () => {
  const source = readPageSource()

  assert.equal(source.includes('expandedTaskIds'), false)
  assert.equal(source.includes('toggleExpandedTaskIds'), false)
  assert.equal(source.includes('scale.actions.expand'), false)
  assert.equal(source.includes('{expanded ? renderDetailPanel(task) : null}'), false)
  assert.equal(source.includes('{renderDetailPanel(task)}'), true)
})

test('Scale detail uses the five-column workflow layout with notes separated', () => {
  const source = readPageSource()

  assert.equal(source.includes('min-w-[1540px]'), false)
  assert.equal(source.includes('lg:grid-cols-[repeat(5,minmax(0,1fr))]'), true)
  assert.equal(source.includes("t('scale.detail.skuVariantSeller')"), false)
  assert.equal(source.includes("t('scale.detail.customization')"), true)
  assert.equal(source.includes("t('scale.detail.quantity')"), true)
  assert.equal((source.match(/t\('scale\.detail\.csNote'\)/g) || []).length, 1)
})

test('Scale detail removes the unused task status section', () => {
  const source = readPageSource()

  assert.equal(source.includes("t('scale.detail.taskStatus')"), false)
  assert.equal(
    source.indexOf("t('scale.detail.costCenter')") < source.indexOf("t('scale.detail.quantity')") &&
      source.indexOf("t('scale.detail.costCenter')") < source.indexOf("t('scale.detail.csNote')"),
    true,
  )
})

test('Scale detail renders the customer image URL when available', () => {
  const source = readPageSource()

  assert.equal(source.includes('detail.product.quantity'), true)
  assert.equal(source.includes('detail.costCenter.vendor'), true)
  assert.equal(source.includes('detail.costCenter.productCost'), true)
  assert.equal(source.includes("t('scale.etsy.costCenter.productCost')"), true)
  assert.equal(source.includes('COST_CENTER_FIELD_CLASS'), true)
  assert.equal(
    source.indexOf("t('scale.detail.csNote')") < source.indexOf("t('scale.detail.action')"),
    true,
  )
  assert.equal(source.includes('grid-cols-[max-content_minmax(0,1fr)]'), false)
  assert.equal(source.includes('items-start justify-between gap-4'), false)
  assert.equal(source.includes('if (item.url)'), true)
  assert.equal(source.includes('alt={item.label}'), true)
})

test('Scale customization keeps text labels and values on one readable line', () => {
  const source = readPageSource()

  assert.equal(source.includes("item.type === 'image'"), true)
  assert.equal(source.includes('<InlineDetailValue key='), true)
  assert.equal(source.includes('label={item.label}'), true)
})

test('Scale cost center fields use content-width pills', () => {
  const source = readPageSource()

  assert.match(source, /const COST_CENTER_FIELD_CLASS = 'w-fit max-w-full'/)
  assert.equal(source.includes('inline-flex min-w-0 items-center'), true)
  assert.equal((source.match(/widthClass=\{COST_CENTER_FIELD_CLASS\}/g) || []).length, 4)
  assert.equal(source.includes('mt-2 border-t border-border/70'), false)
})

test('Scale detail keeps field and metadata text neutral', () => {
  const source = readPageSource()

  assert.doesNotMatch(source, /font-semibold text-teal/)
  assert.doesNotMatch(source, /text-link-blue/)
  assert.doesNotMatch(source, /text-pink-strong/)
})

test('Scale table emphasizes the primary scanning values', () => {
  const source = readPageSource()

  assert.match(source, /font-semibold text-ink-secondary/)
  assert.match(source, /formatCompactOrderDate\(task\.orderDate\)/)
  assert.match(source, /renderOrderStatus\(task\.orderStatus\)/)
})

test('Scale design notes save explicitly through the design-note action', () => {
  const source = readPageSource()

  assert.equal(source.includes('useUpdateScaleTaskNoteMutation'), true)
  assert.equal(source.includes('useUpdateScaleTaskCsNoteMutation'), true)
  assert.equal(source.includes("t('scale.actions.saveNote')"), true)
  assert.equal(source.includes('{ taskId: task.id, designNote }'), true)
  assert.equal(source.includes("onBlur={() => onSaveNote(task, 'cs')}"), false)
})

test('Scale exposes separate design and CS notes with independent save actions', () => {
  const source = readPageSource()

  assert.equal(source.includes('const [csNote, setCsNote] = useState'), true)
  assert.equal(source.includes('onChange={setCsNote}'), true)
  assert.equal(source.includes('{ taskId: task.id, csNote }'), true)
  assert.equal(source.includes("t('scale.etsy.notes.design')"), true)
  assert.equal((source.match(/t\('scale\.actions\.saveNote'\)/g) || []).length, 2)
})

test('Scale design note typing stays local to the detail panel', () => {
  const source = readPageSource()

  assert.equal(source.includes('const [designNote, setDesignNote] = useState'), true)
  assert.equal(source.includes('onChange={setDesignNote}'), true)
  assert.equal(source.includes('setNoteDrafts'), false)
})

test('Scale detail exposes manual position creation from the action area', () => {
  const source = readPageSource()

  assert.equal(source.includes("t('scale.manualUpload.addPosition')"), true)
  assert.equal(source.includes('fileCheckId: null'), true)
  assert.equal(source.includes("slotKey: 'FRONT'"), true)
  assert.equal(source.includes("sourceType: 'CUSTOMER_IMAGE'"), true)
})

test('Scale detail supports per-slot replace, retry, and upload state', () => {
  const source = readPageSource()

  assert.equal(source.includes("t('scale.manualUpload.replace')"), true)
  assert.equal(source.includes("t('scale.manualUpload.tryAgain')"), true)
  assert.equal(source.includes("t('scale.manualUpload.uploadFailed')"), true)
  assert.equal(source.includes('uploadErrors'), true)
  assert.equal(source.includes('getScaleSlotUploadId'), true)
  assert.equal(source.includes('uploadingSlotId === slotUploadId'), true)
})
