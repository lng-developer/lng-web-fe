function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function filterVendors(vendors, search) {
  const normalizedSearch = normalize(search)

  if (!normalizedSearch) {
    return vendors
  }

  return vendors.filter((vendor) =>
    [vendor.name, vendor.fulfillmentType, vendor.status].some((value) =>
      normalize(value).includes(normalizedSearch),
    ),
  )
}

export function filterVendorProducts(products, { search = '', vendor = 'all' } = {}) {
  const normalizedSearch = normalize(search)
  const normalizedVendor = normalize(vendor)

  return products.filter((product) => {
    const matchesVendor =
      normalizedVendor === 'all' || normalize(product.vendorCode) === normalizedVendor

    if (!matchesVendor) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return [
      product.name,
      product.vendorName,
      product.productId,
      product.vendorCode,
      product.productType,
    ].some((value) => normalize(value).includes(normalizedSearch))
  })
}

export function getVendorProductPages(currentPage, totalPages) {
  const safeTotalPages = Math.max(Number(totalPages) || 1, 1)
  const safeCurrentPage = Math.min(Math.max(Number(currentPage) || 1, 1), safeTotalPages)

  if (safeTotalPages <= 7) {
    return Array.from({ length: safeTotalPages }, (_item, index) => index + 1)
  }

  if (safeCurrentPage <= 2) {
    return [1, 2, 3, 4, 5, '...', safeTotalPages]
  }

  const pages = [1]
  const start = Math.max(safeCurrentPage - 1, 2)
  const end = Math.min(safeCurrentPage + 1, safeTotalPages - 1)

  if (start > 2) {
    pages.push('...')
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < safeTotalPages - 1) {
    pages.push('...')
  }

  pages.push(safeTotalPages)

  return pages
}

export function paginateVendorProducts(products, page, pageSize) {
  const safePageSize = Math.max(Number(pageSize) || 10, 1)
  const safePage = Math.max(Number(page) || 1, 1)
  const start = (safePage - 1) * safePageSize

  return products.slice(start, start + safePageSize)
}
