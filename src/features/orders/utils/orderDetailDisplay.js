import { isValidElement } from 'react'

export function getOrderDetailDisplayValue(value) {
  if (isValidElement(value)) return value
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(getOrderDetailDisplayValue).filter(Boolean).join(', ')
  }
  if (typeof value === 'object') {
    const displayKey = ['label', 'name', 'value'].find(
      (key) => value[key] !== null && value[key] !== undefined && value[key] !== '',
    )
    return displayKey ? getOrderDetailDisplayValue(value[displayKey]) : JSON.stringify(value)
  }

  return String(value)
}
