import { Box, Typography } from '@mui/material'

import { getOrderDetailDisplayValue } from '@/features/orders/utils/orderDetailDisplay'

export default function OrderDetailField({ label, value, valueAlign = 'right' }) {
  const displayValue = getOrderDetailDisplayValue(value)
  const isTextValue = typeof displayValue === 'string' || typeof displayValue === 'number'
  const alignStart = valueAlign === 'left'

  return (
    <Box className="grid min-w-0 grid-cols-[minmax(112px,0.85fr)_minmax(0,1fr)] items-start gap-1.5">
      <Typography variant="body2" className="min-w-0 break-words !text-ink-muted">
        {label}
      </Typography>
      {isTextValue ? (
        <Typography
          variant="body2"
          className={`min-w-0 break-words [overflow-wrap:anywhere] !font-medium ${
            alignStart ? '!text-left' : '!text-right'
          }`}
        >
          {displayValue}
        </Typography>
      ) : (
        <Box className={`min-w-0 ${alignStart ? 'justify-self-start' : 'justify-self-end'}`}>
          {displayValue}
        </Box>
      )}
    </Box>
  )
}
