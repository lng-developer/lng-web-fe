import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('./ListingPage.jsx', import.meta.url), 'utf8')

describe('ListingPage composition', () => {
  it('keeps listing management under the page header without a duplicate section header', () => {
    assert.equal(source.includes('listings.management.title'), false)
    assert.equal(source.includes('listings.management.description'), false)
  })

  it('does not force horizontal scrolling in the listing management surface', () => {
    assert.equal(source.includes('minWidth="1280px"'), false)
    assert.equal(source.includes('min-w-80'), false)
    assert.equal(source.includes('xl:grid-cols-[112px'), false)
    assert.equal(source.includes('flex-[1_1_260px]'), false)
    assert.equal(source.includes('sm:w-44'), false)
    assert.equal(source.includes('<OperationsTable'), false)
  })

  it('keeps the listing page chrome compact', () => {
    assert.equal(source.includes('px-6 py-7'), false)
    assert.equal(source.includes('min-h-full bg-page px-4 py-3'), false)
    assert.equal(source.includes('mt-7 grid'), false)
    assert.equal(source.includes('mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4'), false)
    assert.equal(source.includes('<section className="mt-6 overflow-hidden'), false)
  })

  it('keeps listing actions in the table header instead of the page header', () => {
    assert.equal(source.includes('{showProductTypes || showInternalTemplates ? ('), true)
    assert.equal(source.includes(": t('listings.title')"), false)
    assert.equal(source.includes('function ListingStatusTabs'), true)
    assert.equal(source.includes('<ListingStatusTabs'), true)
    assert.equal(source.includes('variant="text"'), true)
    assert.equal(source.includes('borderBottom: active'), true)
    assert.equal(source.includes('alpha(theme.palette.primary.main, 0.06)'), true)
    assert.equal(source.includes("'border-primary text-primary'"), false)
    assert.equal(source.includes('flex shrink-0 flex-wrap items-center gap-2'), true)
    assert.equal(source.includes('<OperationsTabs'), false)
  })

  it('renders a dense grouped listing table inspired by the operations reference', () => {
    assert.equal(source.includes('colSpan={3}'), true)
    assert.equal(source.includes('Template'), true)
    assert.equal(source.includes('PSD Status'), true)
    assert.equal(source.includes('PSD ID'), false)
    assert.equal(source.includes('Asin / Product ID'), true)
    assert.equal(source.includes('min-w-[1360px]'), true)
    assert.equal(source.includes('sticky top-0 z-20'), true)
    assert.equal(source.includes('font-extrabold uppercase tracking-wide text-ink-strong'), true)
  })

  it('does not hardcode All in the variant column', () => {
    assert.equal(source.includes("listing.variant || 'All'"), false)
    assert.equal(source.includes("listing.variant || '-'"), true)
  })
})
