import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { StatusBadge } from '@/components/operations'
import {
  usePodModuleQuery,
  usePodModuleSummaryQuery,
} from '@/features/pod-workbench/api/podWorkbench.queries'
import { POD_MODULES } from '@/features/pod-workbench/data/podModules'
import { getListItems, mapApiRowForModule } from '@/features/pod-workbench/utils/podRows'

const statusColor = {
  approved: 'success',
  active: 'success',
  ready: 'success',
  reconciled: 'success',
  pending: 'warning',
  'pending approval': 'warning',
  'needs mapping': 'warning',
  'candidate found': 'info',
  scaling: 'info',
  mismatch: 'error',
  failed: 'error',
  'qc failed': 'error',
  'missing psd': 'error',
}

function getStatusTone(status) {
  const color = statusColor[String(status).toLowerCase()] || 'default'
  return { success: 'success', warning: 'warning', error: 'danger' }[color] || 'neutral'
}

function MetricCard({ label, value }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 800 }}>
        {value}
      </Typography>
    </Paper>
  )
}

function ActionButton({ children, href, variant }) {
  return (
    <Button
      component={href ? RouterLink : 'button'}
      to={href || undefined}
      variant={variant}
      sx={{ borderRadius: 1.5, fontWeight: 800, minHeight: 40, px: 2.5 }}
    >
      {children}
    </Button>
  )
}

function SetupSteps({ steps }) {
  if (!steps?.length) return null

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', md: `repeat(${steps.length}, minmax(0, 1fr))` },
        }}
      >
        {steps.map((step, index) => (
          <Box
            key={step}
            sx={{
              alignItems: 'center',
              bgcolor: index === 0 ? 'primary.light' : 'background.default',
              border: '1px solid',
              borderColor: index === 0 ? 'primary.main' : 'divider',
              borderRadius: 1.5,
              display: 'flex',
              gap: 1,
              minHeight: 48,
              px: 1.5,
            }}
          >
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: index === 0 ? 'primary.main' : 'background.paper',
                border: '1px solid',
                borderColor: index === 0 ? 'primary.main' : 'divider',
                borderRadius: '50%',
                color: index === 0 ? 'primary.contrastText' : 'text.secondary',
                display: 'inline-flex',
                fontWeight: 900,
                height: 24,
                justifyContent: 'center',
                width: 24,
              }}
            >
              {index + 1}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {step}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

function ApiContracts({ contracts, t }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Stack spacing={0.5} sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('podWorkbench.apiContracts.title')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('podWorkbench.apiContracts.description')}
        </Typography>
      </Stack>
      <Divider />
      <Stack spacing={1} sx={{ maxHeight: 260, overflow: 'auto', p: 2 }}>
        {contracts.map((contract) => (
          <Box
            key={`${contract.method}-${contract.path}`}
            sx={{
              alignItems: 'center',
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', lg: '120px minmax(0,1fr) 160px' },
            }}
          >
            <Chip
              label={contract.method}
              size="small"
              sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 800 }}
            />
            <Typography
              component="code"
              sx={{
                color: 'text.primary',
                fontFamily: 'monospace',
                overflowWrap: 'anywhere',
              }}
            >
              {contract.path}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {contract.usage}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}

function WorkbenchTable({ columns, loading, rows, selectedId, onSelect }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 880 }}>
          <Box
            sx={{
              bgcolor: 'background.default',
              display: 'grid',
              gap: 1,
              gridTemplateColumns:
                'minmax(170px,1.3fr) 100px minmax(130px,1fr) minmax(150px,1fr) 120px 110px',
              px: 2,
              py: 1.25,
            }}
          >
            {columns.map((column) => (
              <Typography
                key={column}
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 800 }}
              >
                {column}
              </Typography>
            ))}
          </Box>
          {loading
            ? Array.from({ length: 5 }, (_, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns:
                      'minmax(170px,1.3fr) 100px minmax(130px,1fr) minmax(150px,1fr) 120px 110px',
                    px: 2,
                    py: 1.5,
                  }}
                >
                  {columns.map((column) => (
                    <Skeleton key={column} height={24} />
                  ))}
                </Box>
              ))
            : rows.map((row) => {
                const active = row.id === selectedId

                return (
                  <Box
                    key={row.id}
                    component="button"
                    type="button"
                    onClick={() => onSelect(row.id)}
                    sx={{
                      all: 'unset',
                      bgcolor: active ? 'primary.light' : 'background.paper',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 1,
                      gridTemplateColumns:
                        'minmax(170px,1.3fr) 100px minmax(130px,1fr) minmax(150px,1fr) 120px 110px',
                      px: 2,
                      py: 1.5,
                      width: '100%',
                      '&:hover': { bgcolor: active ? 'primary.light' : 'background.default' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {row.title || row.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.platform}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.owner}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.issue}
                    </Typography>
                    <StatusBadge tone={getStatusTone(row.status)}>{row.status}</StatusBadge>
                    <Typography variant="body2" color="text.secondary">
                      {row.updatedAt}
                    </Typography>
                  </Box>
                )
              })}
        </Box>
      </Box>
    </Paper>
  )
}

function DetailDrawer({ moduleConfig, row, t }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        {row?.title || t('podWorkbench.detail.selectRow')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {row?.id} · {row?.platform}
      </Typography>

      <Stack spacing={1.25} sx={{ mt: 2 }}>
        {moduleConfig.detailSections.map((section) => (
          <Box key={section} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              {section}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {section === moduleConfig.detailSections[0]
                ? row?.issue
                : t('podWorkbench.detail.payloadPlaceholder')}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
        {moduleConfig.actions.map((action, index) => (
          <Button
            key={action}
            variant={index === 0 ? 'contained' : 'outlined'}
            size="small"
            sx={{ borderRadius: 1.25, fontWeight: 800 }}
          >
            {action}
          </Button>
        ))}
      </Stack>
    </Paper>
  )
}

export default function PodWorkbenchPage({ moduleId }) {
  const { t } = useTranslation()
  const moduleConfig = POD_MODULES[moduleId] || POD_MODULES.orders
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(moduleConfig.rows[0]?.id)
  const query = useMemo(() => ({ q: search || undefined, page: 1, limit: 20 }), [search])
  const moduleQuery = usePodModuleQuery(moduleConfig, query)
  const summaryQuery = usePodModuleSummaryQuery(moduleConfig, query)
  const apiRows = useMemo(
    () =>
      getListItems(moduleQuery.data).map((row, index) =>
        mapApiRowForModule(moduleConfig.id, row, index),
      ),
    [moduleConfig.id, moduleQuery.data],
  )
  const usesApiRows = apiRows.length > 0 && !moduleQuery.isError
  const rows = usesApiRows ? apiRows : moduleConfig.rows
  const selectedRow = rows.find((row) => row.id === selectedId) || rows[0]
  const metrics = moduleConfig.metrics.map(([label, fallback], index) => {
    if (index === 0 && usesApiRows) return [label, apiRows.length]
    return [label, summaryQuery.data?.[label] ?? fallback]
  })
  const sourceLabel = usesApiRows
    ? t('podWorkbench.source.apiRows', { count: apiRows.length })
    : moduleQuery.isError
      ? t('podWorkbench.source.apiError')
      : t('podWorkbench.source.noRows')

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 112px)' }}>
      <Stack spacing={2.25}>
        <Paper variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
          >
            <Box sx={{ maxWidth: 760 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                {moduleConfig.eyebrow}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
                {moduleConfig.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {moduleConfig.description}
              </Typography>
              {moduleConfig.showSourceMeta === false ? null : (
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                  <Chip
                    color={usesApiRows ? 'success' : moduleQuery.isError ? 'warning' : 'default'}
                    label={sourceLabel}
                    size="small"
                    variant={usesApiRows ? 'filled' : 'outlined'}
                  />
                  <Chip
                    component="code"
                    label={moduleConfig.primaryEndpoint}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              )}
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <ActionButton href={moduleConfig.secondaryHref} variant="outlined">
                {moduleConfig.secondaryAction}
              </ActionButton>
              <ActionButton href={moduleConfig.primaryHref} variant="contained">
                {moduleConfig.primaryAction}
              </ActionButton>
            </Stack>
          </Stack>
        </Paper>

        <SetupSteps steps={moduleConfig.setupSteps} />

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
          }}
        >
          {metrics.map(([label, value]) => (
            <MetricCard key={label} label={label} value={value} />
          ))}
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 2, p: 1 }}>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {moduleConfig.tabs.map((tab, index) => (
              <Chip
                key={tab}
                label={tab}
                color={index === 0 ? 'primary' : 'default'}
                variant={index === 0 ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Paper>

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { lg: 'center' }, justifyContent: 'space-between' }}
        >
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('podWorkbench.searchPlaceholder', {
              module: moduleConfig.title.toLowerCase(),
            })}
            size="small"
            sx={{ maxWidth: 360, width: '100%' }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {moduleConfig.filters.map((filter) => (
              <Chip key={filter} label={filter} variant="outlined" />
            ))}
            <IconButton
              aria-label={t('podWorkbench.refreshAria')}
              onClick={() => {
                moduleQuery.refetch()
                summaryQuery.refetch()
              }}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {moduleQuery.isError ? (
          <Alert severity="warning">
            {t('podWorkbench.alerts.apiError', { endpoint: moduleConfig.primaryEndpoint })}
          </Alert>
        ) : moduleConfig.showSourceMeta === false ? null : !usesApiRows &&
          !moduleQuery.isLoading ? (
          <Alert severity="info">
            {t('podWorkbench.alerts.emptyRows', { endpoint: moduleConfig.primaryEndpoint })}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 360px' },
          }}
        >
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <WorkbenchTable
              columns={moduleConfig.columns}
              loading={moduleQuery.isLoading}
              rows={rows}
              selectedId={selectedRow?.id}
              onSelect={setSelectedId}
            />
            {moduleConfig.showContracts === false ? null : (
              <ApiContracts contracts={moduleConfig.contracts} t={t} />
            )}
          </Stack>
          <DetailDrawer moduleConfig={moduleConfig} row={selectedRow} t={t} />
        </Box>
      </Stack>
    </Box>
  )
}
