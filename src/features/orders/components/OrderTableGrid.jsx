import { Box } from '@mui/material'

import {
  orderTableColumns,
  orderTablePaddingX,
} from '@/features/orders/components/orderTableLayout'

export default function OrderTableGrid({ children, minHeight, sx }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: orderTableColumns,
        minWidth: 0,
        width: '100%',
        minHeight,
        alignItems: 'center',
        px: orderTablePaddingX,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}
