export const orderWorkbenchCompactCellPaddingClass = 'px-2 py-3'

export const orderWorkbenchColumns = [
  { key: 'orderId', labelKey: 'orders.table.orderId', width: '178px', align: 'left' },
  {
    key: 'status',
    labelKey: 'orders.table.status',
    width: '112px',
    align: 'center',
    cellPaddingClass: orderWorkbenchCompactCellPaddingClass,
  },
  { key: 'createdAt', labelKey: 'orders.table.createdAt', width: '120px', align: 'center' },
  { key: 'orderDate', labelKey: 'orders.table.orderDate', width: '120px', align: 'center' },
  { key: 'shippingType', labelKey: 'orders.table.shippingType', width: '130px', align: 'center' },
  { key: 'customer', labelKey: 'orders.table.customer', width: '210px', align: 'center' },
  {
    key: 'basecost',
    labelKey: 'orders.table.basecost',
    width: '88px',
    align: 'right',
    cellPaddingClass: orderWorkbenchCompactCellPaddingClass,
  },
  {
    key: 'store',
    labelKey: 'orders.table.store',
    width: '150px',
    align: 'center',
    cellPaddingClass: orderWorkbenchCompactCellPaddingClass,
  },
  {
    key: 'handling',
    labelKey: 'orders.table.handling',
    width: '78px',
    align: 'center',
    cellPaddingClass: orderWorkbenchCompactCellPaddingClass,
  },
  {
    key: 'case',
    labelKey: 'orders.table.case',
    width: '104px',
    align: 'center',
    cellPaddingClass: orderWorkbenchCompactCellPaddingClass,
  },
  {
    key: 'actions',
    labelKey: 'orders.table.actions',
    width: '120px',
    align: 'center',
    cellPaddingClass: orderWorkbenchCompactCellPaddingClass,
  },
]

export const orderWorkbenchTableMinWidth = '1410px'

export const orderWorkbenchDetailPaddingClass = 'px-4'
