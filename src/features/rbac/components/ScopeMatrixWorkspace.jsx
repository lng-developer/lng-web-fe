import { useMemo, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'

import { getScopeMatrixCell } from '../utils/scopedOverridesDisplay'
import {
  canDeactivateScope,
  filterScopeItems,
  getScopeDisplayName,
  SCOPE_STATUS_OPTIONS,
  SCOPE_TYPE_FILTER_OPTIONS,
} from '../utils/scopesDisplay'
import { getScopeParent, ScopeTypeBadge, UserRoleChip } from './shared'

export default function ScopeMatrixWorkspace({
  roles,
  scopes,
  scopesQuery,
  rules,
  rulesQuery,
  filters,
  canWrite,
  scopeMutationPending,
  onFiltersChange,
  onEditReplacement,
  onCreateScope,
  onEditScope,
  onToggleScope,
  t,
}) {
  const [selectedCell, setSelectedCell] = useState(null)
  const filteredScopes = useMemo(() => filterScopeItems(scopes, filters), [filters, scopes])
  const matrixScopes = filteredScopes.filter((scope) => scope.status === 'active')
  const groupedScopes = useMemo(() => {
    const groups = new Map()
    for (const scope of matrixScopes) {
      groups.set(scope.scopeType, [...(groups.get(scope.scopeType) ?? []), scope])
    }
    return [...groups]
  }, [matrixScopes])
  const columns = groupedScopes.flatMap(([, items]) => items)

  return (
    <Stack className="gap-5">
      <Paper elevation={0} className="overflow-hidden rounded-xl border border-border bg-surface">
        <Box className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <Box>
            <Typography variant="h6" className="font-semibold text-ink">
              {t('rbac.matrix.title')}
            </Typography>
            <Typography variant="body2" className="mt-1 text-ink-muted">
              {t('rbac.matrix.hint')}
            </Typography>
          </Box>
          <Stack direction="row" className="flex-wrap gap-2">
            {groupedScopes.map(([scopeType, items]) => (
              <Chip
                key={scopeType}
                size="small"
                variant="outlined"
                label={`${scopeType}: ${items.length}`}
              />
            ))}
          </Stack>
        </Box>

        {rulesQuery.isError ? (
          <Box className="p-6 text-center">
            <Typography variant="body2" className="text-ink-muted">
              {rulesQuery.error?.message || t('rbac.common.loadError')}
            </Typography>
            <Button size="small" className="!mt-2" onClick={() => rulesQuery.refetch()}>
              {t('common.retry')}
            </Button>
          </Box>
        ) : columns.length && roles.length ? (
          <Box className="overflow-x-auto">
            <Box
              className="min-w-max"
              sx={{
                display: 'grid',
                gridTemplateColumns: `220px repeat(${columns.length}, 132px)`,
              }}
            >
              <Box className="sticky left-0 z-10 border-b border-r border-border bg-page p-3">
                <Typography variant="caption" className="font-semibold text-ink-muted">
                  {t('rbac.matrix.roles')}
                </Typography>
              </Box>
              {columns.map((scope) => (
                <Box
                  key={`${scope.scopeType}:${scope.scopeId}`}
                  className="border-b border-r border-border bg-page p-3"
                >
                  <ScopeTypeBadge scopeType={scope.scopeType} />
                  <Typography
                    variant="caption"
                    className="mt-2 block truncate font-semibold text-ink"
                  >
                    {getScopeDisplayName(scope)}
                  </Typography>
                </Box>
              ))}

              {roles.flatMap((role) => [
                <Box
                  key={`${role.id}:label`}
                  className="sticky left-0 z-10 flex min-h-20 items-center border-b border-r border-border bg-surface p-3"
                >
                  <Box className="min-w-0">
                    <Typography variant="body2" className="truncate font-semibold text-ink">
                      {role.name || role.code}
                    </Typography>
                    <Typography variant="caption" className="font-mono text-ink-muted">
                      {role.code}
                    </Typography>
                  </Box>
                </Box>,
                ...columns.map((scope) => {
                  const cell = getScopeMatrixCell(rules, role, scope)
                  const selected =
                    selectedCell?.role?.id === role.id &&
                    selectedCell?.scope?.scopeType === scope.scopeType &&
                    selectedCell?.scope?.scopeId === scope.scopeId

                  return (
                    <Box
                      key={`${role.id}:${scope.scopeType}:${scope.scopeId}`}
                      className="flex min-h-20 items-center justify-center border-b border-r border-border p-2"
                    >
                      <Button
                        variant={selected ? 'contained' : 'outlined'}
                        color={cell.hasReplacement ? 'primary' : 'inherit'}
                        className="!min-h-11 !min-w-24 !normal-case"
                        aria-label={t('rbac.matrix.cellLabel', {
                          role: role.name || role.code,
                          scope: getScopeDisplayName(scope),
                          count: cell.permissionCount,
                        })}
                        onClick={() => setSelectedCell({ role, scope, ...cell })}
                      >
                        {cell.hasReplacement
                          ? t('rbac.matrix.permissionCount', { count: cell.permissionCount })
                          : t('rbac.matrix.inherited')}
                      </Button>
                    </Box>
                  )
                }),
              ])}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" className="p-6 text-center text-ink-muted">
            {rulesQuery.isPending ? t('rbac.common.loading') : t('rbac.matrix.empty')}
          </Typography>
        )}

        {selectedCell && (
          <Box className="border-t border-border bg-page p-4">
            <Stack direction="row" className="flex-wrap items-center justify-between gap-4">
              <Box>
                <Box className="flex flex-wrap items-center gap-2">
                  <UserRoleChip role={selectedCell.role.code || selectedCell.role.name} />
                  <ScopeTypeBadge scopeType={selectedCell.scope.scopeType} />
                </Box>
                <Typography variant="body2" className="mt-2 font-semibold text-ink">
                  {getScopeDisplayName(selectedCell.scope)}
                </Typography>
                <Typography variant="caption" className="text-ink-muted">
                  {selectedCell.hasReplacement
                    ? t('rbac.matrix.replacementSummary', {
                        count: selectedCell.permissionCount,
                      })
                    : t('rbac.matrix.noReplacement')}
                </Typography>
              </Box>
              {canWrite && (
                <Button
                  variant="contained"
                  startIcon={<TuneOutlinedIcon />}
                  onClick={() => onEditReplacement(selectedCell)}
                >
                  {t('rbac.matrix.editReplacement')}
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </Paper>

      <Paper elevation={0} className="overflow-hidden rounded-xl border border-border bg-surface">
        <Box className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-end lg:justify-between">
          <Box>
            <Typography variant="h6" className="font-semibold text-ink">
              {t('rbac.matrix.directoryTitle')}
            </Typography>
            <Typography variant="body2" className="mt-1 text-ink-muted">
              {t('rbac.matrix.directoryHint')}
            </Typography>
          </Box>
          <Stack direction="row" className="flex-wrap gap-2">
            <TextField
              size="small"
              value={filters.search}
              placeholder={t('rbac.scopes.searchPlaceholder')}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
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
            <FormControl size="small" className="min-w-36">
              <Select
                displayEmpty
                value={filters.scopeType}
                onChange={(event) => onFiltersChange({ ...filters, scopeType: event.target.value })}
              >
                <MenuItem value="">{t('rbac.scopes.filter.allTypes')}</MenuItem>
                {SCOPE_TYPE_FILTER_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" className="min-w-36">
              <Select
                displayEmpty
                value={filters.status}
                onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}
              >
                <MenuItem value="">{t('rbac.scopes.filter.allStatus')}</MenuItem>
                {SCOPE_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {canWrite && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateScope}>
                {t('rbac.scopes.actions.addScope')}
              </Button>
            )}
          </Stack>
        </Box>

        {scopesQuery.isError ? (
          <Box className="p-6 text-center">
            <Typography variant="body2" className="text-ink-muted">
              {scopesQuery.error?.message || t('rbac.common.loadError')}
            </Typography>
            <Button size="small" className="!mt-2" onClick={() => scopesQuery.refetch()}>
              {t('common.retry')}
            </Button>
          </Box>
        ) : filteredScopes.length ? (
          <Box className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
            {filteredScopes.map((scope) => {
              const deactivationBlocked = scope.status === 'active' && !canDeactivateScope(scope)

              return (
                <Box key={scope.id} className="min-h-40 bg-surface p-4">
                  <Stack direction="row" className="items-start justify-between gap-3">
                    <Box className="min-w-0">
                      <ScopeTypeBadge scopeType={scope.scopeType} />
                      <Typography variant="body1" className="mt-3 truncate font-semibold text-ink">
                        {getScopeDisplayName(scope)}
                      </Typography>
                      <Typography variant="caption" className="block truncate text-ink-muted">
                        {getScopeParent(scope)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t(
                        scope.status === 'active'
                          ? 'rbac.scopes.status.active'
                          : 'rbac.scopes.status.inactive',
                      )}
                    />
                  </Stack>
                  <Stack direction="row" className="mt-4 items-center justify-between gap-3">
                    <Typography variant="body2" className="text-ink-muted">
                      {t('rbac.scopes.assignmentCount', { count: scope.assignmentCount ?? 0 })}
                    </Typography>
                    <Box className="flex items-center gap-1">
                      {canWrite && (
                        <Button
                          size="small"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => onEditScope(scope)}
                        >
                          {t('common.edit')}
                        </Button>
                      )}
                      <Tooltip
                        title={
                          deactivationBlocked
                            ? t('rbac.scopes.deactivateBlocked', {
                                count: scope.assignmentCount ?? 0,
                              })
                            : ''
                        }
                      >
                        <span>
                          <Switch
                            checked={scope.status === 'active'}
                            disabled={!canWrite || scopeMutationPending || deactivationBlocked}
                            slotProps={{
                              input: {
                                'aria-label': t('rbac.scopes.columns.status'),
                              },
                            }}
                            onChange={(event) => onToggleScope(scope, event.target.checked)}
                          />
                        </span>
                      </Tooltip>
                    </Box>
                  </Stack>
                </Box>
              )
            })}
          </Box>
        ) : (
          <Typography variant="body2" className="p-6 text-center text-ink-muted">
            {scopesQuery.isPending ? t('rbac.common.loading') : t('rbac.common.noResults')}
          </Typography>
        )}
      </Paper>
    </Stack>
  )
}
