import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import { IconButton, InputAdornment, Skeleton, TextField, Tooltip, Typography } from '@mui/material'

import { useDebounce } from '@/hooks/useDebounce'

import { useVendorsQuery } from '../api/vendors.queries'

const fulfillmentTypeClasses = {
  fba: 'bg-info text-white',
  fbm: 'bg-ink-muted text-white',
  pod: 'bg-danger text-white',
  dropship: 'bg-secondary text-white',
  custom: 'bg-warning text-white',
}

const statusClasses = {
  active: 'border-success bg-surface text-success',
  inactive: 'border-border-strong bg-surface text-ink-muted',
}

function Pill({ children, className = '' }) {
  return (
    <span
      className={`inline-flex h-5 min-w-14 items-center justify-center rounded-full border px-2 text-[11px] font-bold ${className}`}
    >
      {children}
    </span>
  )
}

export default function VendorListPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { data, isError, isPending } = useVendorsQuery({
    page: 1,
    limit: 100,
    search: debouncedSearch,
  })
  const vendors = data?.items || []

  return (
    <div className="flex min-h-full flex-col bg-surface p-2">
      <Typography component="h1" variant="h4" className="text-2xl font-bold text-ink-strong">
        {t('vendors.list.title')}
      </Typography>

      <div className="mt-6">
        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('vendors.searchPlaceholder')}
          className="w-full max-w-72 bg-surface"
          slotProps={{
            input: {
              className: 'h-10 rounded-lg text-sm',
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="text-ink-muted" fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </div>

      <section className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full border-collapse">
          <thead className="bg-surface-subtle">
            <tr>
              {['name', 'fulfillmentType', 'active', 'actions'].map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="h-12 whitespace-nowrap px-4 text-left text-[11px] font-bold uppercase text-ink-muted"
                >
                  {t(`vendors.list.columns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending
              ? Array.from({ length: 5 }, (_item, index) => (
                  <tr key={index} className="h-14 border-t border-border bg-surface">
                    {Array.from({ length: 4 }, (_cell, cellIndex) => (
                      <td key={cellIndex} className="px-4">
                        <Skeleton variant="text" height={20} />
                      </td>
                    ))}
                  </tr>
                ))
              : null}
            {!isPending && isError ? (
              <tr className="h-14 border-t border-border bg-surface">
                <td colSpan={4} className="px-4 text-sm text-danger">
                  {t('vendors.states.loadError')}
                </td>
              </tr>
            ) : null}
            {!isPending && !isError && vendors.length === 0 ? (
              <tr className="h-14 border-t border-border bg-surface">
                <td colSpan={4} className="px-4 text-sm text-ink-muted">
                  {t('vendors.states.empty')}
                </td>
              </tr>
            ) : null}
            {!isPending && !isError
              ? vendors.map((vendor) => (
                  <tr key={vendor.id} className="h-14 border-t border-border bg-surface">
                    <td className="whitespace-nowrap px-4 text-sm font-medium text-ink-secondary">
                      {vendor.name}
                    </td>
                    <td className="whitespace-nowrap px-4">
                      <Pill
                        className={`border-transparent ${
                          fulfillmentTypeClasses[vendor.fulfillmentType] ||
                          'bg-neutral-bg text-ink-secondary'
                        }`}
                      >
                        {t(`vendors.values.fulfillmentType.${vendor.fulfillmentType}`, {
                          defaultValue: vendor.rawFulfillmentType || vendor.fulfillmentType,
                        })}
                      </Pill>
                    </td>
                    <td className="whitespace-nowrap px-4">
                      <Pill className={statusClasses[vendor.status]}>
                        {t(`vendors.values.status.${vendor.status}`, {
                          defaultValue: vendor.rawStatus || vendor.status,
                        })}
                      </Pill>
                    </td>
                    <td className="whitespace-nowrap px-4">
                      <div className="flex items-center gap-1">
                        <Tooltip title={t('vendors.actions.edit')}>
                          <IconButton
                            aria-label={t('vendors.actions.edit')}
                            size="small"
                            className="text-ink-muted"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('vendors.actions.delete')}>
                          <IconButton
                            aria-label={t('vendors.actions.delete')}
                            size="small"
                            className="text-danger"
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </section>
    </div>
  )
}
