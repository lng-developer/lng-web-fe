export const LISTING_WORKSPACE_VIEWS = {
  LISTINGS: 'listings',
  PRODUCT_TYPES: 'product-types',
  INTERNAL_TEMPLATES: 'internal-templates',
}

const ALLOWED_LISTING_WORKSPACE_VIEWS = new Set(Object.values(LISTING_WORKSPACE_VIEWS))

export function getListingWorkspaceView(search = '') {
  const view = new URLSearchParams(search).get('view')

  return ALLOWED_LISTING_WORKSPACE_VIEWS.has(view) ? view : LISTING_WORKSPACE_VIEWS.LISTINGS
}
