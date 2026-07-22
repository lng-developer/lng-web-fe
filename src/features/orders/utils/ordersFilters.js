import dayjs from 'dayjs'

import { orderTabs } from '../data/ordersData.js'

function clean(value) {
  return String(value ?? '').trim()
}

export function getOrdersChannel(search = '') {
  const channel = new URLSearchParams(search).get('channel')
  return channel === 'amazon' || channel === 'etsy' ? channel : null
}

export function getOrdersTab(search = '') {
  const tab = new URLSearchParams(search).get('tab')
  return orderTabs.some((item) => item.key === tab) ? tab : 'all'
}

export function readOrdersFilters(search = '') {
  const params = new URLSearchParams(search)
  const getPositiveInteger = (key, fallback) => Math.max(Number(params.get(key)) || fallback, 1)
  const getDate = (key) => {
    const value = params.get(key)
    const date = value ? dayjs(value) : null
    return date?.isValid?.() ? date : null
  }

  return {
    search: params.get('search') || '',
    channel: getOrdersChannel(search) || 'all',
    shopId: params.get('shopId') || 'all',
    seller: params.get('seller') || 'all',
    dateRange: { start: getDate('dateFrom'), end: getDate('dateTo') },
    page: getPositiveInteger('page', 1),
    limit: Math.min(getPositiveInteger('limit', 10), 100),
  }
}

export function buildOrdersUrl(search = '', pathname = '/portal/orders', updates = {}) {
  const params = new URLSearchParams(search)
  const setParam = (key, value, defaultValue = '') => {
    const normalized = String(value ?? '').trim()
    if (!normalized || normalized === defaultValue) params.delete(key)
    else params.set(key, normalized)
  }

  if (Object.hasOwn(updates, 'tab')) setParam('tab', updates.tab, 'all')
  if (Object.hasOwn(updates, 'page')) setParam('page', Math.max(Number(updates.page) || 1, 1), '1')
  if (Object.hasOwn(updates, 'limit')) {
    setParam('limit', Math.min(Math.max(Number(updates.limit) || 10, 1), 100), '10')
  }
  if (Object.hasOwn(updates, 'search')) setParam('search', updates.search)
  if (Object.hasOwn(updates, 'channel')) {
    if (updates.channel === 'amazon' || updates.channel === 'etsy')
      params.set('channel', updates.channel)
    else params.delete('channel')
  }
  if (Object.hasOwn(updates, 'shopId')) setParam('shopId', updates.shopId, 'all')
  if (Object.hasOwn(updates, 'seller')) setParam('seller', updates.seller, 'all')
  if (Object.hasOwn(updates, 'dateRange')) {
    setParam('dateFrom', updates.dateRange?.start?.format?.('YYYY-MM-DD') || '')
    setParam('dateTo', updates.dateRange?.end?.format?.('YYYY-MM-DD') || '')
  }

  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}`
}

export function buildSellerOptions(rows = []) {
  const sellers = [...new Set(rows.map((row) => clean(row.seller)).filter(Boolean))].sort()

  return [
    { value: 'all', labelKey: 'orders.values.sellers.all' },
    ...sellers.map((seller) => ({ value: seller, label: seller })),
  ]
}

export function buildOrderFilterChips(filters = {}) {
  return [
    ['search', 'orders.filters.search', clean(filters.search)],
    ['channel', 'orders.filters.channel', filters.channel === 'all' ? '' : clean(filters.channel)],
    ['shopId', 'orders.filters.shop', filters.shopId === 'all' ? '' : clean(filters.shopId)],
    ['seller', 'orders.filters.seller', filters.seller === 'all' ? '' : clean(filters.seller)],
  ]
    .filter(([, , value]) => value)
    .map(([key, labelKey, value]) => ({ key, labelKey, value }))
}
