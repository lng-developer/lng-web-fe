import { Chip } from '@mui/material'

import { getOrderStatusTone } from '@/features/orders/utils/orderStatus'

export default function OrderStatusChip({ color, label, status, tone }) {
  const resolvedTone = tone || color || getOrderStatusTone(status)
  const paletteByTone = {
    success: 'success',
    warning: 'warning',
    danger: 'error',
  }
  const paletteColor = paletteByTone[resolvedTone] || paletteByTone.success

  return (
    <Chip
      label={label}
      size="small"
      sx={(theme) => ({
        height: 24,
        bgcolor: theme.palette[paletteColor].light,
        border: `1px solid ${theme.palette[paletteColor].main}`,
        color: theme.palette[paletteColor].main,
        fontWeight: 500,
        '& .MuiChip-label': { px: 1 },
      })}
    />
  )
}
