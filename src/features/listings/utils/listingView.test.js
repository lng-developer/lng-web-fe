import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getListingWorkspaceView, LISTING_WORKSPACE_VIEWS } from './listingView.js'

describe('listing workspace view', () => {
  it('uses listing management as the default listings page', () => {
    assert.equal(getListingWorkspaceView(''), LISTING_WORKSPACE_VIEWS.LISTINGS)
    assert.equal(getListingWorkspaceView('?view=unknown'), LISTING_WORKSPACE_VIEWS.LISTINGS)
  })

  it('opens catalog setup slices from cost center navigation query presets', () => {
    assert.equal(
      getListingWorkspaceView('?view=product-types'),
      LISTING_WORKSPACE_VIEWS.PRODUCT_TYPES,
    )
    assert.equal(
      getListingWorkspaceView('?view=internal-templates'),
      LISTING_WORKSPACE_VIEWS.INTERNAL_TEMPLATES,
    )
  })
})
