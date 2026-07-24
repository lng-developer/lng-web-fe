import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const listingsPageUrl = new URL('./ListingsPage.jsx', import.meta.url)
const listingsPageExists = existsSync(listingsPageUrl)
const source = listingsPageExists ? readFileSync(listingsPageUrl, 'utf8') : ''
const routesSource = readFileSync(new URL('../../../routes/index.jsx', import.meta.url), 'utf8')
const routeConstantsSource = readFileSync(
  new URL('../../../constants/routes.js', import.meta.url),
  'utf8',
)
const sidebarSource = readFileSync(
  new URL('../../../layouts/sidebarNavigation.js', import.meta.url),
  'utf8',
)
const listingViewUrl = new URL('../utils/listingView.js', import.meta.url)
const internalTemplatesPageUrl = new URL('./InternalTemplatesPage.jsx', import.meta.url)
const internalTemplatesPageExists = existsSync(internalTemplatesPageUrl)
const productTypesPageUrl = new URL('./ProductTypesPage.jsx', import.meta.url)
const productTypesPageExists = existsSync(productTypesPageUrl)
const productTypesPageSource = productTypesPageExists
  ? readFileSync(productTypesPageUrl, 'utf8')
  : ''
const internalTemplateDialogSource = readFileSync(
  new URL('../components/dialogs/InternalTemplateDialog.jsx', import.meta.url),
  'utf8',
)

describe('ListingPage composition', () => {
  it('routes each catalog page independently behind catalog read access', () => {
    assert.equal(listingsPageExists, true)
    for (const [page, route] of [
      ['ListingsPage', 'PORTAL_LISTINGS'],
      ['ProductTypesPage', 'PORTAL_PRODUCT_TYPES'],
      ['InternalTemplatesPage', 'PORTAL_INTERNAL_TEMPLATES'],
    ]) {
      assert.equal(routesSource.includes(`const ${page} = lazy(`), true)
      assert.equal(routesSource.includes(`<${page} />`), true)
      assert.equal(routeConstantsSource.includes(`${route}:`), true)
      assert.equal(sidebarSource.includes(`path: ROUTES.${route}`), true)
    }

    assert.equal(routesSource.match(/\['CATALOG:READ'\]/g)?.length, 4)
    assert.equal(sidebarSource.includes('?view='), false)
    assert.equal(existsSync(listingViewUrl), false)
  })

  it('composes catalog dialogs from reusable components', () => {
    assert.equal(source.includes("from '../components/dialogs/ListingDialog'"), true)
    assert.equal(internalTemplatesPageExists, true)
    assert.equal(source.includes('function ListingDialog'), false)
    assert.equal(source.includes('showInternalTemplates'), false)
    assert.equal(source.includes('templateDialog'), false)
    assert.equal(
      productTypesPageSource.includes("from '../components/dialogs/ProductTypeDialog'"),
      true,
    )
    assert.equal(productTypesPageSource.includes('function ProductTypeDialog'), false)
  })

  it('moves product type ownership to its dedicated page', () => {
    assert.equal(productTypesPageExists, true)
    assert.equal(source.includes('showProductTypes'), false)
    assert.equal(source.includes('productTypeDialog'), false)
    assert.equal(source.includes('productTypeGroupsQuery'), false)
    assert.equal(source.includes('openCreateProductTypeDialog'), false)
    assert.equal(source.includes('productTypeSearch'), false)
  })

  it('gives listing management a compact page header', () => {
    assert.equal(source.includes("t('listings.title')"), true)
    assert.equal(
      source.includes('Manage marketplace listings, templates, and PSD readiness.'),
      true,
    )
  })

  it('does not force horizontal scrolling in the listing management surface', () => {
    assert.equal(source.includes('minWidth="1280px"'), false)
    assert.equal(source.includes('min-w-80'), false)
    assert.equal(source.includes('xl:grid-cols-[112px'), false)
    assert.equal(source.includes('flex-[1_1_260px]'), false)
    assert.equal(source.includes('sm:w-44'), false)
    assert.equal(source.includes('<OperationsTable'), false)
  })

  it('contains vertical scrolling inside the listing table', () => {
    assert.equal(source.includes('flex h-full min-h-0 flex-col overflow-hidden'), true)
    assert.equal(source.includes('header className="shrink-0'), true)
    assert.equal(source.includes('section className="shrink-0 grid'), true)
    assert.equal(
      source.includes('mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl'),
      true,
    )
    assert.equal(source.includes('flex min-h-12 shrink-0 flex-wrap items-center'), true)
    assert.equal(source.includes('OperationsToolbar className="shrink-0'), true)
    assert.equal(source.includes('min-h-0 flex-1 overflow-auto bg-surface'), true)
    assert.equal(source.includes('footer className="shrink-0'), true)
    assert.equal(source.includes('sticky top-0 z-20'), true)
    assert.equal(source.includes('h-[620px] overflow-auto'), false)
    assert.equal(source.includes('<div className="overflow-x-auto bg-surface">'), false)
  })

  it('keeps the listing page chrome compact', () => {
    assert.equal(source.includes('px-6 py-7'), false)
    assert.equal(source.includes('min-h-full bg-page px-4 py-3'), false)
    assert.equal(source.includes('mt-7 grid'), false)
    assert.equal(source.includes('mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4'), false)
    assert.equal(source.includes('<section className="mt-6 overflow-hidden'), false)
  })

  it('keeps listing actions in the table header instead of the page header', () => {
    const statusToolbarSource = source.slice(
      source.indexOf('<section className="mt-3'),
      source.indexOf('<OperationsToolbar'),
    )

    assert.equal(source.includes(": t('listings.title')"), false)
    assert.equal(source.includes('function ListingStatusTabs'), true)
    assert.equal(source.includes('<ListingStatusTabs'), true)
    assert.equal(source.includes('variant="text"'), true)
    assert.equal(source.includes('borderBottom: active'), true)
    assert.equal(source.includes('alpha(theme.palette.primary.main, 0.06)'), true)
    assert.equal(source.includes("'border-primary text-primary'"), false)
    assert.equal(
      statusToolbarSource.includes(
        'flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2',
      ),
      true,
    )
    assert.equal(statusToolbarSource.includes('px-4 py-2'), true)
    assert.equal(statusToolbarSource.includes('pt-2'), false)
    assert.equal(statusToolbarSource.includes('absolute'), false)
    assert.equal(source.includes('lg:justify-center'), false)
    assert.equal(source.includes('<OperationsTabs'), false)
    assert.equal(source.includes("{ key: 'anonymousAsin'"), false)
    assert.equal(source.includes("t('listings.messages.importMissing')"), false)
  })

  it('renders a dense grouped listing table inspired by the operations reference', () => {
    assert.equal(source.includes('colSpan={3}'), true)
    assert.equal(source.includes('Template'), true)
    assert.equal(source.includes('PSD Status'), true)
    assert.equal(source.includes('PSD ID'), false)
    assert.equal(source.includes('Asin / Product ID'), true)
    assert.equal(source.includes('min-w-[1360px]'), true)
    assert.equal(source.includes('text-[13px] font-bold text-ink-secondary'), true)
    assert.equal(source.includes('h-[96px] border-b border-border'), true)
    assert.equal(source.includes('even:bg-neutral-bg/40'), true)
  })

  it('keeps only actionable row controls visible', () => {
    assert.equal(source.includes("listing.rawQcStatus === 'DRAFT'"), true)
    assert.equal(source.includes('listings.messages.deleteMissing'), false)
    assert.equal(source.includes('More actions'), true)
    assert.equal(source.includes('<Menu'), true)
  })

  it('uses color only for missing or rejected listing states', () => {
    assert.equal(source.includes("tone={hasPsdTemplate ? 'green' : 'orange'}"), false)
    assert.equal(source.includes("tone={hasInternalTemplate ? 'teal' : 'orange'}"), false)
  })

  it('does not hardcode All in the variant column', () => {
    assert.equal(source.includes("listing.variant || 'All'"), false)
    assert.equal(source.includes("listing.variant || '-'"), true)
  })

  it('renders derived PSD readiness rather than an editable listing PSD status', () => {
    const psdCellSource = source.slice(
      source.indexOf("if (column.key === 'psdStatus')"),
      source.indexOf("if (column.key === 'store')"),
    )
    const storeCellSource = source.slice(
      source.indexOf("if (column.key === 'store')"),
      source.indexOf("if (column.key === 'seller')"),
    )
    const sellerCellSource = source.slice(
      source.indexOf("if (column.key === 'seller')"),
      source.indexOf("if (column.key === 'asinType')"),
    )

    assert.equal(source.includes("psdStatus: 'MISSING',"), false)
    assert.equal(source.includes("onChange('psdStatus'"), false)
    assert.equal(psdCellSource.includes('listing.psdReadinessSource'), false)
    assert.equal(psdCellSource.includes('listing.psdNextAction'), false)
    assert.equal(source.includes('<Badge tone="green">Ready</Badge>'), true)
    assert.equal(source.includes('<Badge tone="orange">Missing</Badge>'), true)
    assert.equal(source.includes('>Not required</span>'), false)
    assert.equal(storeCellSource.includes('<Badge'), false)
    assert.equal(sellerCellSource.includes('<Badge'), false)
  })

  it('lets operators set whether an internal template requires a PSD', () => {
    assert.equal(internalTemplateDialogSource.includes("onChange('requiresPsd'"), true)
  })
})
