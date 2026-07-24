import { StatusBadge } from '@/components/operations'
import { getOrderStatusTone } from '@/features/orders/utils/orderStatus'

export default function OrderStatusChip({ color, label, status, tone }) {
  const resolvedTone = tone || color || getOrderStatusTone(status)
  return <StatusBadge tone={resolvedTone}>{label}</StatusBadge>
}
