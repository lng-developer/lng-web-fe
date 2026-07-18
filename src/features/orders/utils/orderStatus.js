export function getOrderStatusTone(status) {
  if (['CANCELLED', 'REFUNDED', 'FAILED'].includes(status)) return 'danger'
  if (['PROCESSING', 'PARTIALLY_SHIPPED', 'ON_HOLD'].includes(status)) return 'warning'
  return 'success'
}
