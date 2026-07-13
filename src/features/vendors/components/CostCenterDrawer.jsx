import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Button,
  Drawer,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'

import StatusSwitch from '@/components/common/StatusSwitch'

function formatMoney(amount, currency) {
  if (amount === undefined || amount === null || amount === '') {
    return '-'
  }

  return `${amount} ${currency || ''}`.trim()
}

export default function CostCenterDrawer({
  costCenters,
  isError,
  isLoading,
  onAdd,
  onClose,
  onEdit,
  onToggleStatus,
  open,
  product,
  t,
  updating,
}) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div className="flex h-full w-screen max-w-5xl flex-col bg-surface">
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <Typography component="h2" variant="h5" className="font-bold text-ink-strong">
              {t('vendors.costCenters.title')}
            </Typography>
            <Typography variant="body2" className="mt-1 text-ink-muted">
              {product?.name || product?.code}
            </Typography>
          </div>
          <IconButton aria-label={t('common.close')} onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </header>

        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <Typography variant="body2" className="text-ink-muted">
            {t('vendors.costCenters.total', { total: costCenters.length })}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={onAdd}>
            {t('vendors.costCenters.actions.create')}
          </Button>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          <section className="overflow-x-auto rounded-xl border border-border bg-surface">
            <Table size="small">
              <TableHead className="bg-surface-subtle">
                <TableRow>
                  {[
                    'code',
                    'name',
                    'sku',
                    'sizeColor',
                    'baseCost',
                    'domesticShipping',
                    'status',
                    'actions',
                  ].map((column) => (
                    <TableCell
                      key={column}
                      className="h-12 whitespace-nowrap text-[11px] font-bold uppercase text-ink-muted"
                    >
                      {t(`vendors.costCenters.columns.${column}`)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }, (_item, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 8 }, (_cell, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton variant="text" height={20} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : null}
                {!isLoading && isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-danger">
                      {t('vendors.states.loadError')}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && !isError && costCenters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-ink-muted">
                      {t('vendors.states.empty')}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && !isError
                  ? costCenters.map((costCenter) => {
                      const active = costCenter.status === 'active'

                      return (
                        <TableRow key={costCenter.id}>
                          <TableCell className="whitespace-nowrap text-sm font-semibold text-ink-strong">
                            {costCenter.code}
                          </TableCell>
                          <TableCell className="min-w-52 text-sm text-ink-secondary">
                            {costCenter.name}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-ink-secondary">
                            {costCenter.sku || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-ink-secondary">
                            {[
                              costCenter.standardSize || costCenter.vendorSize,
                              costCenter.standardColor || costCenter.vendorColor,
                            ]
                              .filter(Boolean)
                              .join(' / ') || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-ink-secondary">
                            {formatMoney(costCenter.baseCostAmount, costCenter.currency)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-ink-secondary">
                            {formatMoney(
                              costCenter.domesticShipping?.economyAmount,
                              costCenter.currency,
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusSwitch
                              checked={active}
                              disabled={updating}
                              ariaLabel={t('vendors.costCenters.actions.toggleStatus')}
                              onChange={() =>
                                onToggleStatus(costCenter, active ? 'INACTIVE' : 'ACTIVE')
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title={t('vendors.actions.edit')}>
                              <IconButton
                                size="small"
                                aria-label={t('vendors.actions.edit')}
                                onClick={() => onEdit(costCenter)}
                                className="text-ink-muted"
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  : null}
              </TableBody>
            </Table>
          </section>
        </div>
      </div>
    </Drawer>
  )
}
