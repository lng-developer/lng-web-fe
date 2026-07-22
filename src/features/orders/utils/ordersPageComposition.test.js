import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

function readOrdersPageModuleSource() {
  return readFileSync(new URL('../pages/OrdersPage.jsx', import.meta.url), 'utf8')
}

function readOrdersTableSource() {
  return readFileSync(new URL('../components/OrdersTable.jsx', import.meta.url), 'utf8')
}

function readOrderExpandedDetailSource() {
  const url = new URL('../components/OrderExpandedDetail.jsx', import.meta.url)
  assert.equal(existsSync(url), true)
  return readFileSync(url, 'utf8')
}

function readOrderDialogsSource() {
  const url = new URL('../components/OrderDialogs.jsx', import.meta.url)
  assert.equal(existsSync(url), true)
  return readFileSync(url, 'utf8')
}

function readOrdersPageSource() {
  return `${readOrdersPageModuleSource()}\n${readOrderExpandedDetailSource()}\n${readOrdersTableSource()}\n${readOrderDialogsSource()}`
}

function readOrdersControlsSource() {
  const url = new URL('../components/OrdersControls.jsx', import.meta.url)
  assert.equal(existsSync(url), true)
  return readFileSync(url, 'utf8')
}

function readOrderWorkbenchColumnsSource() {
  const layoutUrl = new URL('../components/orderWorkbenchColumns.js', import.meta.url)
  assert.equal(existsSync(layoutUrl), true)
  return readFileSync(layoutUrl, 'utf8')
}

test('orders table declares columns as shared operations table config', () => {
  const columnsUrl = new URL('../components/orderWorkbenchColumns.js', import.meta.url)
  assert.equal(existsSync(columnsUrl), true)

  const columnsSource = readFileSync(columnsUrl, 'utf8')
  assert.equal(columnsSource.includes('export const orderWorkbenchColumns'), true)
  assert.equal(columnsSource.includes("key: 'orderId'"), true)
  assert.equal(columnsSource.includes("key: 'expand'"), false)
  assert.equal(columnsSource.includes("key: 'actions'"), true)
  assert.equal(columnsSource.includes('labelKey'), true)
  assert.equal(columnsSource.includes('width'), true)
})

test('orders page consumes the shared operations layout system', () => {
  const source = readOrdersPageSource()
  const controlsSource = readOrdersControlsSource()

  assert.equal(source.includes("from '@/components/operations'"), true)
  assert.equal(source.includes('<OperationsPageShell'), true)
  assert.equal(source.includes("t('orders.title')"), false)
  assert.equal(controlsSource.includes('<OperationsToolbar'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('<OperationsPagination'), true)
  assert.equal(source.includes('<OrderTableGrid'), false)
  assert.equal(source.includes('function TableHeader'), false)
  assert.equal(source.includes('function OrdersTableSkeleton'), false)
})

test('orders page keeps operational queues out of the table footer', () => {
  const source = readOrdersPageSource()

  assert.equal(source.includes('<CasesTab'), false)
  assert.equal(source.includes('<ExceptionsTab'), false)
  assert.equal(source.includes('<ImportIssuesTab'), false)
  assert.equal(source.includes('label="Workflow"'), false)
})

test('orders controls own tabs and toolbar without owning server queries', () => {
  const pageSource = readOrdersPageSource()
  const controlsSource = readOrdersControlsSource()

  assert.equal(pageSource.includes("from '@/features/orders/components/OrdersControls'"), true)
  assert.equal(pageSource.includes('function OrderTabs'), false)
  assert.equal(pageSource.includes('function FilterBar'), false)
  assert.equal(controlsSource.includes('export function OrdersTabs'), true)
  assert.equal(controlsSource.includes('export function OrdersToolbar'), true)
  assert.equal(controlsSource.includes('useOrderWorkbenchQuery'), false)
  assert.equal(controlsSource.includes('useOrderSummaryQuery'), false)
})

test('OrdersTable owns row rendering and exposes one page-facing component', () => {
  const pageSource = readOrdersPageModuleSource()
  const tableUrl = new URL('../components/OrdersTable.jsx', import.meta.url)
  assert.equal(existsSync(tableUrl), true)
  const tableSource = readFileSync(tableUrl, 'utf8')

  assert.equal(pageSource.includes("from '@/features/orders/components/OrdersTable'"), true)
  assert.equal(pageSource.includes('function renderOrderWorkbenchCell'), false)
  assert.equal(pageSource.includes('function CustomerCell'), false)
  assert.equal(tableSource.includes('export default'), true)
  assert.equal(tableSource.includes('<OperationsTable'), true)
  assert.equal(tableSource.includes('useOrderWorkbenchQuery'), false)
})

test('expanded order detail owns item presentation without importing page orchestration', () => {
  const detailSource = readOrderExpandedDetailSource()
  const tableSource = readOrdersTableSource()

  assert.equal(detailSource.includes('export default OrderExpandedDetail'), true)
  assert.equal(detailSource.includes('function ProductInfo'), true)
  assert.equal(detailSource.includes('function FulfillmentInfo'), true)
  assert.equal(detailSource.includes('OrdersPage'), false)
  assert.equal(tableSource.includes('function ExpandedOrderDetail'), false)
})

test('order dialogs own modal flows without owning workbench queries', () => {
  const dialogSource = readOrderDialogsSource()
  const pageSource = readOrdersPageModuleSource()
  const tableSource = readOrdersTableSource()
  const controlsSource = readOrdersControlsSource()

  ;['ImportOrdersDialog', 'UpdateCustomerDialog', 'UpdateShippingDialog', 'OpenCaseDialog'].forEach(
    (name) => {
      assert.equal(dialogSource.includes(`export function ${name}`), true)
    },
  )
  assert.equal(dialogSource.includes('useOrderWorkbenchQuery'), false)
  assert.equal(pageSource.includes('function ImportOrdersModal'), false)
  assert.equal(controlsSource.includes('function ImportOrdersModal'), false)
  assert.equal(tableSource.includes('function UpdateCustomerModal'), false)
  assert.equal(tableSource.includes('function UpdateShippingModal'), false)
  assert.equal(tableSource.includes('function OpenCaseModal'), false)
})

test('orders header keeps tabs and filters compact without heavy active blocks', () => {
  const controlsSource = readOrdersControlsSource()
  const tabsSource = controlsSource.slice(
    controlsSource.indexOf('export function OrdersTabs'),
    controlsSource.indexOf('export function OrdersToolbar'),
  )
  const filterSource = controlsSource.slice(
    controlsSource.indexOf('export function OrdersToolbar'),
    controlsSource.length,
  )

  assert.equal(tabsSource.includes("flex: '1 1 0'"), false)
  assert.equal(tabsSource.includes('bgcolor: active ? theme.palette.primary.light'), false)
  assert.equal(tabsSource.includes('borderBottom: `1px solid ${theme.palette.divider}`'), true)
  assert.equal(tabsSource.includes("flex: '0 0 auto'"), true)
  assert.equal(tabsSource.includes('height: 40'), true)
  assert.equal(tabsSource.includes("lineHeight: '18px'"), true)
  assert.equal(filterSource.includes('filterOptions.channels'), false)
  assert.equal(filterSource.includes("updateFilter('channel'"), false)
  assert.equal(filterSource.includes('minmax(240px, 1.35fr)'), true)
  assert.equal(filterSource.includes("justifySelf: { xs: 'stretch', lg: 'end' }"), true)
  assert.equal(filterSource.includes('minWidth: 112'), true)
})

test('orders page keeps tab, pagination, and filters in the url for reloads', () => {
  const source = readOrdersPageSource()
  const filtersSource = readFileSync(new URL('./ordersFilters.js', import.meta.url), 'utf8')

  assert.equal(source.includes('readOrdersFilters(location.search)'), true)
  assert.equal(source.includes('getOrdersTab(location.search)'), true)
  assert.equal(filtersSource.includes('export function buildOrdersUrl'), true)
  assert.equal(filtersSource.includes("Object.hasOwn(updates, 'dateRange')"), true)
})

test('orders refresh reloads both table data and tab counts', () => {
  const source = readOrdersPageSource()

  assert.equal(source.includes('const handleRefreshOrders = useCallback'), true)
  assert.equal(source.includes('const refetchOrders = ordersQuery.refetch'), true)
  assert.equal(source.includes('const refetchOrderSummary = orderSummaryQuery.refetch'), true)
  assert.equal(source.includes('refetchOrders()'), true)
  assert.equal(source.includes('refetchOrderSummary()'), true)
  assert.equal(source.includes('onRefresh={handleRefreshOrders}'), true)
})

test('orders page opens item timeline lazily from the status cell', () => {
  const source = readOrdersPageSource()
  const tableSource = readOrdersTableSource()
  const timelineSource = tableSource.slice(
    tableSource.indexOf('function OrderTimelineButton'),
    tableSource.indexOf('function RowActionButton'),
  )

  assert.equal(source.includes('useOrderTimelineQuery'), false)
  assert.equal(source.includes('useOrderItemTimelineQuery'), true)
  assert.equal(source.includes('enabled: Boolean(orderItemId && timelineAnchor)'), true)
  assert.equal(source.includes('function OrderInfoPopover'), true)
  assert.equal(source.includes('<OrderTimelineButton'), true)
  assert.equal(timelineSource.includes('<OrderInfoPopover'), true)
  assert.equal(timelineSource.includes('<Popover'), false)
  assert.equal(source.includes('row.actorLabel'), true)
  assert.equal(source.includes('row.message ?'), true)
  assert.equal(source.includes("gridTemplateColumns: '18px minmax(0, 1fr)'"), true)

  const statusCellSource = source.slice(
    source.indexOf("if (column.key === 'status')"),
    source.indexOf("if (column.key === 'createdAt')"),
  )
  assert.equal(statusCellSource.includes('direction="row"'), true)
  assert.equal(statusCellSource.includes("flexDirection: 'row'"), false)
})

test('expanded order item detail keeps item fields read-only and actions grouped', () => {
  const source = readOrdersPageSource()
  const detailSource = readOrderExpandedDetailSource()

  assert.equal(source.includes('function CompactInput'), false)
  assert.equal(detailSource.includes('const itemDetails = order.itemDetails?.length'), true)
  assert.equal(detailSource.includes('itemDetails.map'), true)
  assert.equal(detailSource.includes('orders.actions.update'), false)
  assert.equal(source.includes('function ReadOnlyValue'), true)
  assert.equal(source.includes('function ActionsCard'), false)
  assert.equal(source.includes('title="Order actions"'), false)
  assert.equal(source.includes('title="Order item actions"'), false)
})

test('order table splits customer, case, and other row actions by column', () => {
  const source = readOrdersPageSource()
  const columnsSource = readOrderWorkbenchColumnsSource()

  assert.equal(columnsSource.includes("key: 'case'"), true)
  assert.equal(columnsSource.includes("key: 'actions'"), true)
  assert.equal(source.includes('<CustomerCell'), true)
  assert.equal(source.includes('<OrderCaseAction'), true)
  assert.equal(source.includes('<OrderOtherActions'), true)
  assert.equal(source.includes('<OrderRowActions'), false)
  assert.equal(source.includes("setCaseAction({ type: 'create' })"), false)
  assert.equal(source.includes("aria-label={t('orders.updateCustomer.title')}"), false)
  assert.equal(source.includes('label="Validate"'), false)
  assert.equal(source.includes('label="Buyer"'), true)
  assert.equal(source.includes('label="Case"'), true)
  assert.equal(source.includes('label="Retest"'), false)
  assert.equal(source.includes('SwapHorizOutlinedIcon'), true)
  assert.equal(source.includes('variant="outlined"'), true)
  assert.equal(source.includes('Replace'), true)
  assert.equal(source.includes('label="Service"'), false)
  assert.equal(source.includes('label="Workflow"'), false)
  assert.equal(source.includes('label="Recheck vendor"'), true)
  assert.equal(source.includes('label="Ready"'), false)
  assert.equal(source.includes('label="Cancel"'), false)
  assert.equal(source.includes('caseStatus'), true)
  assert.equal(source.includes('caseTitle'), true)
  assert.equal(source.includes('onCreated={handleCaseCreated}'), true)
  assert.equal(source.includes('caseTitle || caseStatus'), true)
  assert.equal(source.includes('Boolean(caseTitle)'), true)
  assert.equal(source.includes('onRefresh?.()'), true)
})

test('order table summary row uses dense fixed operational columns', () => {
  const source = readOrdersPageSource()
  const columnsSource = readOrderWorkbenchColumnsSource()

  assert.equal(source.includes('64px 256px'), false)
  assert.equal(source.includes('const tableColumns ='), false)
  assert.equal(columnsSource.includes("width: '178px'"), true)
  assert.equal(columnsSource.includes("width: '210px'"), true)
  assert.equal(source.includes('orderWorkbenchColumns.map'), true)
  assert.equal(source.includes("justifyContent: 'center'"), true)
})

test('case and actions columns stay compact and centered', () => {
  const source = readOrdersPageSource()
  const columnsSource = readOrderWorkbenchColumnsSource()
  const otherActionsSource = source.slice(
    source.indexOf('function OrderOtherActions'),
    source.indexOf('function DateCell'),
  )

  assert.equal(columnsSource.includes("key: 'case'"), true)
  assert.equal(columnsSource.includes("key: 'actions'"), true)
  assert.equal(columnsSource.includes("width: '120px'"), true)
  assert.equal(columnsSource.includes("orderWorkbenchTableMinWidth = '1410px'"), true)
  assert.equal(otherActionsSource.includes("justifyContent: 'center'"), true)
})

test('narrow order columns use compact padding so centered content does not overflow', () => {
  const columnsSource = readOrderWorkbenchColumnsSource()

  assert.equal(columnsSource.includes('orderWorkbenchCompactCellPaddingClass'), true)
  assert.equal(columnsSource.includes('orderWorkbenchIconCellPaddingClass'), false)
  assert.equal(columnsSource.includes("key: 'expand'"), false)
  ;['status', 'basecost', 'store', 'handling', 'case', 'actions'].forEach((key) => {
    const columnStart = columnsSource.indexOf(`key: '${key}'`)
    assert.notEqual(columnStart, -1)
    const columnEnd = columnsSource.indexOf('}', columnStart)
    const columnSource = columnsSource.slice(columnStart, columnEnd)
    assert.equal(
      columnSource.includes('cellPaddingClass: orderWorkbenchCompactCellPaddingClass'),
      true,
    )
  })
})

test('order table keeps header fixed and aligns header cells with row data', () => {
  const source = readOrdersPageSource()
  const columnsSource = readOrderWorkbenchColumnsSource()

  assert.equal(source.includes('const tableHeaders = ['), false)
  assert.equal(source.includes('orderTableHeaders'), false)
  assert.equal(columnsSource.includes("key: 'orderId'"), true)
  assert.equal(columnsSource.includes("labelKey: 'orders.table.orderId'"), true)
  assert.equal(columnsSource.includes("width: '178px'"), true)
  assert.equal(columnsSource.includes("key: 'customer'"), true)
  assert.equal(columnsSource.includes("labelKey: 'orders.table.customer'"), true)
  assert.equal(columnsSource.includes("width: '210px'"), true)
  const customerStart = columnsSource.indexOf("key: 'customer'")
  const customerEnd = columnsSource.indexOf('}', customerStart)
  const customerSource = columnsSource.slice(customerStart, customerEnd)
  assert.equal(customerSource.includes("align: 'center'"), true)
  assert.equal(columnsSource.includes("key: 'basecost'"), true)
  assert.equal(columnsSource.includes("labelKey: 'orders.table.basecost'"), true)
  assert.equal(columnsSource.includes("width: '88px'"), true)
  assert.equal(columnsSource.includes("align: 'right'"), true)
  assert.equal(source.includes('function OrdersTableBody'), false)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('orderWorkbenchTableMinWidth'), true)
})

test('order table uses shared OperationsTable for header, rows, skeletons, and expansion', () => {
  const source = readOrdersPageSource()
  const tableSource = readOrdersTableSource()
  const ordersTableSource = tableSource.slice(
    tableSource.indexOf('function OrdersTable'),
    tableSource.indexOf('export default OrdersTable'),
  )

  assert.equal(
    source.includes("import OrderTableGrid from '@/features/orders/components/OrderTableGrid'"),
    false,
  )
  assert.equal(source.includes('gridTemplateColumns: tableColumns'), false)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('renderExpandedRow'), true)
  assert.equal(source.includes('const alwaysExpanded = () => true'), true)
  assert.equal(ordersTableSource.includes('getRowExpanded={alwaysExpanded}'), true)
  assert.equal(ordersTableSource.includes('expandedOrderIds'), false)
  assert.equal(ordersTableSource.includes('onToggleOrder'), false)
})

test('expanded order detail shares table horizontal padding', () => {
  const source = readOrdersPageSource()
  const columnsSource = readOrderWorkbenchColumnsSource()
  const detailSource = source.slice(
    source.indexOf('function OrderExpandedDetail'),
    source.indexOf('function OrdersTable'),
  )

  assert.equal(columnsSource.includes('orderWorkbenchDetailPaddingClass'), true)
  assert.equal(detailSource.includes('orderWorkbenchDetailPaddingClass'), true)
  assert.equal(detailSource.includes('px: 3'), false)
})

test('expanded order product summary is compact and omits raw psd id', () => {
  const source = readOrdersPageSource()
  const productInfoSource = source.slice(
    source.indexOf('function ProductInfo'),
    source.indexOf('function CustomizationInfo'),
  )
  const fulfillmentSource = source.slice(
    source.indexOf('function FulfillmentInfo'),
    source.indexOf('function NotePanel'),
  )

  assert.equal(productInfoSource.includes('gap-4'), true)
  assert.equal(productInfoSource.includes('gap-6'), false)
  assert.equal(productInfoSource.includes('orders.fields.psdId'), false)
  assert.equal(productInfoSource.includes("color={product.psdColor || 'danger'}"), true)
  assert.equal(fulfillmentSource.includes('orders.fields.new'), false)
  assert.equal(fulfillmentSource.includes('LocalShippingOutlinedIcon'), false)
  assert.equal(fulfillmentSource.includes('UpdateShippingModal'), false)
  assert.equal(fulfillmentSource.includes("gridTemplateColumns: '120px minmax(220px, 1fr)'"), true)
  assert.equal(fulfillmentSource.includes('QTY'), true)
  assert.equal(fulfillmentSource.includes('Cost Center'), true)
  assert.equal(fulfillmentSource.includes("gridColumn: '1 / -1'"), false)
  assert.equal(fulfillmentSource.includes('!text-ink-muted'), true)
  assert.equal(fulfillmentSource.includes('sx={{ fontWeight: 500 }}'), false)
  assert.equal(fulfillmentSource.includes('maxWidth={300}'), false)
  assert.equal(fulfillmentSource.includes('maxWidth={76}'), true)
  assert.equal(fulfillmentSource.includes('OK'), false)
  assert.equal(
    source.includes('<ReadOnlyValue value={fulfillment.fulfillName} multiline rows={2} />'),
    true,
  )
  assert.equal(fulfillmentSource.includes('orders.fields.carrier'), false)
  assert.equal(fulfillmentSource.includes('fulfillment.carrierKey'), false)
  assert.equal(
    fulfillmentSource.includes(
      '<ReadOnlyValue value={fulfillment.fulfillName} multiline rows={3} />',
    ),
    false,
  )
})

test('cost center summary matches vendor inline through mapping API', () => {
  const source = readOrdersPageSource()
  const fulfillmentSource = source.slice(
    source.indexOf('function FulfillmentInfo'),
    source.indexOf('function NotePanel'),
  )
  const inlineSource = source.slice(
    source.indexOf('function InlineVendorMatch'),
    source.indexOf('function FulfillmentInfo'),
  )

  assert.equal(source.includes('useMappingVendorCandidatesMutation'), false)
  assert.equal(source.includes('useVendorProductsQuery'), true)
  assert.equal(source.includes('useVendorCostCentersQuery'), true)
  assert.equal(source.includes('useMappingSelectMutation'), true)
  assert.equal(source.includes('function InlineVendorMatch'), true)
  assert.equal(source.includes('function VendorMatchSummary'), true)
  assert.equal(source.includes('function ManualVendorMatchDialog'), false)
  assert.equal(fulfillmentSource.includes('InlineVendorMatch'), true)
  assert.equal(fulfillmentSource.includes('editingVendorMatch'), true)
  assert.equal(fulfillmentSource.includes('VendorMatchSummary'), true)
  assert.equal(fulfillmentSource.includes('getMappingRecheckFeedback(result)'), true)
  assert.equal(fulfillmentSource.includes('editingVendorMatch ? ('), true)
  assert.equal(fulfillmentSource.includes('orders.actions.matchVendor'), false)
  assert.equal(inlineSource.includes('searchVendorCandidatesRef'), false)
  assert.equal(inlineSource.includes('vendorCandidatesMutation.mutate'), false)
  assert.equal(inlineSource.includes('cleanManualMatchValue(fulfillment.vendorProduct)'), true)
  assert.equal(inlineSource.includes('fulfillment.vendorProductId ||'), true)
  assert.equal(inlineSource.includes('productQuery.data?.items'), true)
  assert.equal(inlineSource.includes('productTypeGroupId: fulfillment.productTypeGroupId'), true)
  assert.equal(inlineSource.includes("search: vendorProductId ? '' : debouncedSearch"), true)
  assert.equal(inlineSource.includes('const isCurrentVendorSelected'), false)
  assert.equal(inlineSource.includes('vendorLookupActive'), true)
  assert.equal(inlineSource.includes('vendorOptionsOpen'), true)
  assert.equal(inlineSource.includes('const activateVendorLookup = useCallback'), true)
  assert.equal(inlineSource.includes('const refreshVendorLookup = useCallback'), true)
  assert.equal(inlineSource.includes('refetchVendorProducts()'), true)
  assert.equal(
    inlineSource.includes(
      '{ enabled: Boolean(fulfillment.productTypeGroupId && vendorLookupActive) }',
    ),
    true,
  )
  assert.equal(inlineSource.includes('debouncedSearch.trim().length >= 2'), false)
  assert.equal(inlineSource.includes('costCenterQuery.data?.items'), true)
  assert.equal(inlineSource.includes('{ enabled: Boolean(vendorProductId) }'), true)
  assert.equal(
    inlineSource.includes('{ enabled: Boolean(vendorProductId && vendorLookupActive) }'),
    false,
  )
  assert.equal(inlineSource.includes('selectMutation.mutate'), true)
  assert.equal(inlineSource.includes('hasUnsavedCandidate'), true)
  assert.equal(inlineSource.includes('setSavedVendorProductId'), true)
  assert.equal(inlineSource.includes('setSavedVendorCostCenterId'), true)
  assert.equal(
    inlineSource.includes('disabled={!hasUnsavedCandidate || selectMutation.isPending}'),
    true,
  )
  assert.equal(inlineSource.includes('<Autocomplete'), true)
  assert.equal(inlineSource.includes('open={vendorOptionsOpen}'), true)
  assert.equal(inlineSource.includes('onOpen={activateVendorLookup}'), true)
  assert.equal(inlineSource.includes('onClose={() => setVendorOptionsOpen(false)}'), true)
  assert.equal(inlineSource.includes('openOnFocus'), true)
  assert.equal(inlineSource.includes('autoHighlight'), true)
  assert.equal(inlineSource.includes('fullWidth'), true)
  assert.equal(inlineSource.includes('filterOptions={(options) => options}'), true)
  assert.equal(inlineSource.includes('noOptionsText='), true)
  assert.equal(inlineSource.includes('orders.manualVendorMatch.noProductType'), true)
  assert.equal(
    inlineSource.includes(
      'const showMissingProductTypeHelp = vendorLookupActive && !hasProductTypeGroup',
    ),
    true,
  )
  assert.equal(
    inlineSource.includes('error={Boolean(errorMessage || showMissingProductTypeHelp)}'),
    true,
  )
  assert.equal(inlineSource.includes('onFocus={refreshVendorLookup}'), true)
  assert.equal(inlineSource.includes('onClick={refreshVendorLookup}'), true)
  assert.equal(inlineSource.includes('orders.manualVendorMatch.missingProductTypeHelp'), true)
  assert.equal(inlineSource.includes('renderOption='), true)
  assert.equal(source.includes('formatManualVendorProductMeta'), true)
  assert.equal(inlineSource.includes('maxWidth: 220'), true)
})

test('shipping type update uses a dedicated shipping service modal and endpoint', () => {
  const source = readOrdersPageSource()
  const modalSource = source.slice(
    source.indexOf('export function UpdateShippingDialog'),
    source.indexOf('export function OpenCaseDialog'),
  )
  const shippingCellSource = source.slice(
    source.indexOf('function ShippingTypeCell'),
    source.indexOf('function DateCell'),
  )

  assert.equal(source.includes('export function UpdateShippingDialog'), true)
  assert.equal(shippingCellSource.includes('LocalShippingOutlinedIcon'), true)
  assert.equal(shippingCellSource.includes('UpdateShippingDialog'), true)
  assert.equal(shippingCellSource.includes('orders.updateShipping.title'), true)
  assert.equal(shippingCellSource.includes('height: 24'), true)
  assert.equal(modalSource.includes('useUpdateOrderShippingServiceMutation'), true)
  assert.equal(modalSource.includes('useUpdateOrderShippingAddressMutation'), false)
  assert.equal(modalSource.includes('useUpdateOrderBuyerMutation'), false)
  assert.equal(modalSource.includes('orderId: order.apiId'), true)
  assert.equal(modalSource.includes('level: formValues.level'), true)
  assert.equal(modalSource.includes('name: formValues.name'), false)
  assert.equal(source.includes('shippingServiceLevelOptions'), true)
  assert.equal(source.includes('shippingServiceLevelNotes'), true)
  assert.equal(modalSource.includes('<Select'), true)
  assert.equal(modalSource.includes('name="level"'), true)
  assert.equal(modalSource.includes('levelOptions.map'), true)
  assert.equal(modalSource.includes('name="name"'), false)
  assert.equal(modalSource.includes('NotificationsIcon'), true)
  assert.equal(modalSource.includes("t('orders.actions.update')"), true)
  assert.equal(modalSource.includes('orders.updateShipping.success'), true)
})

test('expanded order detail keeps read-only inputs short and shows customization link', () => {
  const source = readOrdersPageSource()
  const customizationSource = source.slice(
    source.indexOf('function CustomizationInfo'),
    source.indexOf('function ReadOnlyValue'),
  )
  const readOnlyValueSource = source.slice(
    source.indexOf('function ReadOnlyValue'),
    source.indexOf('function FulfillmentInfo'),
  )

  assert.equal(customizationSource.includes('orders.fields.customizationUrl'), true)
  assert.equal(customizationSource.includes('customizationUrlValue'), true)
  assert.equal(customizationSource.includes('target="_blank"'), true)
  assert.equal(customizationSource.includes('component="a"'), true)
  assert.equal(customizationSource.includes('fontWeight: 700'), true)
  assert.equal(customizationSource.includes('minWidth: 0'), false)
  assert.equal(readOnlyValueSource.includes('function ReadOnlyValue({ maxWidth = 220'), true)
  assert.equal(readOnlyValueSource.includes('maxWidth,'), true)
  assert.equal(readOnlyValueSource.includes("width: '100%'"), true)
  assert.equal(readOnlyValueSource.includes('minHeight: multiline ? rows * 24 + 12 : 34'), true)
  assert.equal(readOnlyValueSource.includes('minHeight: multiline ? rows * 30 + 18 : 40'), false)
})

test('expanded order detail reuses shared inline values and image previews', () => {
  const source = readOrdersPageSource()

  assert.match(source, /import ImagePreview from '@\/components\/common\/ImagePreview'/)
  assert.match(source, /import InlineDetailValue from '@\/components\/common\/InlineDetailValue'/)
  assert.match(source, /<InlineDetailValue[\s\S]*field\.label/)
  assert.match(source, /<ImagePreview[\s\S]*image\.url/)
})

test('order status panel shows carrier and reuses the existing note editor', () => {
  const source = readOrdersPageSource()
  const notePanelSource = source.slice(
    source.indexOf('function NotePanel'),
    source.indexOf('function OrderExpandedDetail'),
  )

  assert.equal(notePanelSource.includes('orders.fields.status'), true)
  assert.equal(notePanelSource.includes('orders.fields.tracking'), true)
  assert.equal(notePanelSource.includes('orders.fields.carrier'), true)
  assert.equal(notePanelSource.includes('fulfillment.carrierKey'), true)
  assert.equal(notePanelSource.includes('orders.fields.note'), true)
  assert.equal(notePanelSource.includes('maxWidth={220}'), false)
  assert.equal(notePanelSource.includes('<TextField'), true)
  assert.equal(notePanelSource.includes("aria-label={t('orders.fields.note')}"), true)
  assert.equal(notePanelSource.includes('orders.fields.csNote'), false)
})

test('order id, sku, and asin are one-click copyable with full value tooltip', () => {
  const source = readOrdersPageSource()
  const orderIdCellSource = source.slice(
    source.indexOf("if (column.key === 'orderId')"),
    source.indexOf("if (column.key === 'status')"),
  )
  const productInfoSource = source.slice(
    source.indexOf('function ProductInfo'),
    source.indexOf('function CustomizationInfo'),
  )

  assert.equal(source.includes("import CopyableText from '@/components/common/CopyableText'"), true)
  assert.equal(source.includes('function CopyableValue'), false)
  assert.equal(orderIdCellSource.includes('<CopyableText value={order.id}'), true)
  assert.equal(productInfoSource.includes('value={<CopyableText value={product.sku} />}'), true)
  assert.equal(productInfoSource.includes('value={<CopyableText value={product.asin} />}'), true)
})

test('orders no longer carries an order-only table layout system', () => {
  assert.equal(existsSync(new URL('../components/OrderTableGrid.jsx', import.meta.url)), false)
  assert.equal(existsSync(new URL('../components/orderTableLayout.js', import.meta.url)), false)
})

test('customer cell keeps buyer actions adjacent to the customer name', () => {
  const source = readOrdersPageSource()
  const customerCellSource = source.slice(
    source.indexOf('function CustomerCell'),
    source.indexOf('function OrderCaseAction'),
  )

  assert.equal(customerCellSource.includes('flex: 1'), false)
  assert.equal(customerCellSource.includes('maxWidth: 150'), true)
  assert.equal(customerCellSource.includes("justifyContent: 'flex-start'"), true)
  assert.equal(customerCellSource.includes('useValidateOrderAddressMutation'), false)
  assert.equal(customerCellSource.includes('FactCheckOutlinedIcon'), false)
  assert.equal(customerCellSource.includes('label="Validate"'), false)
  assert.equal(customerCellSource.includes('label="Buyer"'), true)
})

test('order case modal creates a real case instead of hardcoding case status', () => {
  const source = readOrdersPageSource()
  const modalSource = source.slice(source.indexOf('export function OpenCaseDialog'), source.length)

  assert.equal(source.includes('const caseOptions'), false)
  assert.equal(modalSource.includes('<Select'), false)
  assert.equal(modalSource.includes('<MenuItem'), false)
  assert.equal(modalSource.includes('useCreateOrderCaseMutation'), true)
  assert.equal(modalSource.includes('useUpdateOrderCaseStatusMutation'), false)
  assert.equal(modalSource.includes("caseStatus: 'OPEN'"), false)
  assert.equal(modalSource.includes('orderItemId:'), false)
  assert.equal(modalSource.includes('title:'), true)
  assert.equal(modalSource.includes('caseType:'), true)
  assert.equal(modalSource.includes('description:'), true)
})

test('order case action opens a lazy case list for the order', () => {
  const source = readOrdersPageSource()
  const caseActionSource = source.slice(
    source.indexOf('function OrderCaseAction'),
    source.indexOf('function OrderOtherActions'),
  )

  assert.equal(source.includes('useOrderCasesQuery'), true)
  assert.equal(source.includes('mapOrderCaseRows'), true)
  assert.equal(caseActionSource.includes('const openNewCaseModal = (event) => {'), true)
  assert.equal(caseActionSource.includes('enabled: Boolean(orderId && casesAnchor)'), true)
  assert.equal(caseActionSource.includes('setCasesAnchor(event.currentTarget)'), true)
  assert.equal(caseActionSource.includes('mapOrderCaseRows(casesQuery.data)'), true)
  assert.equal(caseActionSource.includes('<OrderInfoPopover'), true)
  assert.equal(caseActionSource.includes('<Popover'), false)
  assert.equal(caseActionSource.includes('row.primary'), true)
  assert.equal(caseActionSource.includes('onClick={openCases}'), true)
  assert.equal(caseActionSource.includes('onClick={openNewCaseModal}'), true)
  assert.equal(caseActionSource.includes('setCasesAnchor(null)'), true)
  assert.equal(caseActionSource.includes('setCaseModalOpen(true)'), true)
})

test('orders page exposes an editable order item CS note with an explicit save action', () => {
  const source = readOrdersPageSource()

  assert.equal(source.includes('useUpdateOrderItemCsNoteMutation'), true)
  assert.equal(source.includes('function NotePanel({ fulfillment, orderItemId })'), true)
  assert.equal(source.includes("{t('orders.fields.note')}"), true)
  assert.equal(source.includes("{t('orders.fields.csNote')}"), false)
  assert.equal(source.includes('SaveOutlinedIcon'), true)
  assert.equal(
    source.includes('updateOrderItemCsNoteMutation.mutate({ orderItemId, csNote })'),
    true,
  )
})

test('orders tabs do not create a second horizontal scroll surface on mobile', () => {
  const controlsSource = readOrdersControlsSource()
  const tabsSource = controlsSource.slice(
    controlsSource.indexOf('export function OrdersTabs'),
    controlsSource.indexOf('export function OrdersToolbar'),
  )

  assert.doesNotMatch(tabsSource, /overflowX:\s*['"](?:auto|scroll)['"]/)
  assert.doesNotMatch(tabsSource, /overflow:\s*['"](?:auto|scroll)['"]/)
})

test('refresh and timeline icon actions expose labels and tooltips', () => {
  const controlsSource = readOrdersControlsSource()
  const tableSource = readOrdersTableSource()
  const refreshActionSource = controlsSource.slice(
    controlsSource.indexOf('export function OrdersToolbar'),
    controlsSource.indexOf('<Button\n          variant="contained"'),
  )
  const timelineSource = tableSource.slice(
    tableSource.indexOf('const OrderTimelineButton'),
    tableSource.indexOf('function RowActionButton'),
  )

  assert.equal(refreshActionSource.includes("aria-label={t('orders.filters.refresh')}"), true)
  assert.match(
    refreshActionSource,
    /<Tooltip\s+title=[\s\S]*?<IconButton\s+aria-label=\{t\('orders\.filters\.refresh'\)\}/,
  )
  assert.equal(timelineSource.includes('aria-label="Open order item timeline"'), true)
  assert.match(timelineSource, /<Tooltip\s+title=/)
})

test('keyboard-focused refresh and timeline controls have a visible focus indicator', () => {
  const controlsSource = readOrdersControlsSource()
  const tableSource = readOrdersTableSource()
  const refreshSource = controlsSource.slice(
    controlsSource.indexOf("<IconButton\n          aria-label={t('orders.filters.refresh')}"),
    controlsSource.indexOf('<Button\n          variant="contained"'),
  )
  const timelineSource = tableSource.slice(
    tableSource.indexOf('const OrderTimelineButton'),
    tableSource.indexOf('function RowActionButton'),
  )

  ;[refreshSource, timelineSource].forEach((source) => {
    assert.match(source, /&\.Mui-focusVisible[\s\S]*(?:boxShadow|outline|borderColor|bgcolor)/)
  })
})

test('rejected workbench queries render a scoped retry that only refetches orders', () => {
  const pageSource = readOrdersPageModuleSource()
  const tableSource = readOrdersTableSource()

  assert.equal(pageSource.includes('error={ordersQuery.isError}'), true)
  assert.equal(pageSource.includes('onRetry={refetchOrders}'), true)
  assert.equal(tableSource.includes('onRetry'), true)
  assert.match(tableSource, /onClick=\{onRetry\}/)
})
