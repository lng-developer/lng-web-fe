export const DESIGN_TASK_TABLE_MIN_WIDTH = '1350px'

export const designTaskCompactCellPaddingClass = 'px-2 py-3'

export function createDesignTaskColumns({ showAssignedColumn = true } = {}) {
  return [
    { key: 'orderId', label: 'Order ID', width: '300px', align: 'left' },
    {
      key: 'type',
      label: 'Type',
      width: '135px',
      align: 'center',
      cellPaddingClass: designTaskCompactCellPaddingClass,
    },
    {
      key: 'status',
      label: 'Status',
      width: '130px',
      align: 'center',
      sortable: true,
      cellPaddingClass: designTaskCompactCellPaddingClass,
    },
    {
      key: 'priority',
      label: 'Priority',
      width: '115px',
      align: 'center',
      sortable: true,
      cellPaddingClass: designTaskCompactCellPaddingClass,
    },
    showAssignedColumn ? { key: 'owner', label: 'Owner', width: '170px', align: 'left' } : null,
    { key: 'shop', label: 'Shop', width: '140px', align: 'left' },
    { key: 'file', label: 'File', width: '150px', align: 'left' },
    { key: 'updatedAt', label: 'Updated', width: '120px', align: 'center', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      width: '190px',
      align: 'center',
      cellPaddingClass: designTaskCompactCellPaddingClass,
    },
  ].filter(Boolean)
}
