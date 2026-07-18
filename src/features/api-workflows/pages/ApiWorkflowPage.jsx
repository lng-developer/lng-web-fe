import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'

import { useWorkflowActionMutation } from '@/features/api-workflows/api/apiWorkflow.mutations'
import { useWorkflowListQuery } from '@/features/api-workflows/api/apiWorkflow.queries'
import { API_WORKFLOWS } from '@/features/api-workflows/data/apiWorkflows'
import { getListItems, mapWorkflowRows } from '@/features/api-workflows/utils/apiWorkflowRows'

function formatJson(value) {
  return JSON.stringify(value ?? {}, null, 2)
}

function getRawValue(raw, keys) {
  for (const key of keys) {
    const value = raw?.[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return ''
}

function getDefaultParamValue(name, row) {
  const raw = row?.raw || {}
  if (raw[name]) return raw[name]
  if (name === 'id') return row?.id || ''
  if (name === 'orderId') return getRawValue(raw, ['orderId', 'externalOrderId']) || row?.id || ''
  if (name === 'orderItemId') return getRawValue(raw, ['orderItemId', 'itemId']) || ''
  if (name === 'productionTaskId')
    return getRawValue(raw, ['productionTaskId', 'taskId']) || row?.id || ''
  if (name === 'vendorSubmissionId')
    return getRawValue(raw, ['vendorSubmissionId']) || row?.id || ''
  if (name === 'provider') return getRawValue(raw, ['provider', 'providerKey', 'vendorProvider'])
  return ''
}

function buildInitialParams(action, row) {
  return Object.fromEntries(
    action.endpoint.paramNames.map((name) => [name, getDefaultParamValue(name, row)]),
  )
}

function ApiActionDialog({ action, mutation, onClose, row, workflowId }) {
  const { t } = useTranslation()
  const [bodyText, setBodyText] = useState(action?.body || '{}')
  const [params, setParams] = useState(() => buildInitialParams(action, row))
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const hasBody = !['GET', 'DELETE'].includes(action.endpoint.method)

  const handleRun = () => {
    const missingParam = action.endpoint.paramNames.find((name) => !params[name])
    if (missingParam) {
      setError(t('apiWorkflows.errors.missingParam', { param: missingParam }))
      return
    }

    setError('')
    setResult(null)
    mutation.mutate(
      { action, bodyText, params, workflowId },
      {
        onError: (nextError) => setError(nextError.message),
        onSuccess: (response) => setResult(response),
      },
    )
  }

  return (
    <Dialog open maxWidth="md" fullWidth onClose={onClose}>
      <DialogTitle>{action.label}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {action.endpoint.method} {action.endpoint.path}
          </Typography>
          {action.endpoint.paramNames.map((name) => (
            <TextField
              key={name}
              label={name}
              size="small"
              value={params[name] || ''}
              onChange={(event) =>
                setParams((current) => ({ ...current, [name]: event.target.value }))
              }
            />
          ))}
          {hasBody && (
            <TextField
              label={t('apiWorkflows.fields.jsonBody')}
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              multiline
              minRows={6}
              size="small"
              spellCheck={false}
              sx={{ '& textarea': { fontFamily: 'monospace' } }}
            />
          )}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {result ? (
            <Box
              component="pre"
              sx={(theme) => ({
                bgcolor: alpha(theme.palette.info.main, 0.08),
                border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`,
                borderRadius: 1,
                maxHeight: 260,
                overflow: 'auto',
                p: 1.5,
                whiteSpace: 'pre-wrap',
              })}
            >
              {formatJson(result)}
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('apiWorkflows.actions.close')}</Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleRun}>
          {t('apiWorkflows.actions.run')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function RawDrawer({ actionMutation, onAction, onClose, row, tab }) {
  const { t } = useTranslation()

  return (
    <Drawer anchor="right" open={Boolean(row)} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 560 }, p: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">{row?.title || t('apiWorkflows.detail.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {tab.label}
            </Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {tab.actions.map((action) => (
              <Button
                key={action.label}
                size="small"
                variant="outlined"
                disabled={actionMutation.isPending}
                onClick={() => onAction(action, row)}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
          <Box
            component="pre"
            sx={(theme) => ({
              bgcolor: theme.palette.background.default,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              maxHeight: 'calc(100vh - 180px)',
              overflow: 'auto',
              p: 1.5,
              whiteSpace: 'pre-wrap',
            })}
          >
            {formatJson(row?.raw)}
          </Box>
        </Stack>
      </Box>
    </Drawer>
  )
}

export default function ApiWorkflowPage({ workflowId }) {
  const { t } = useTranslation()
  const workflow = API_WORKFLOWS[workflowId]
  const [activeTabId, setActiveTabId] = useState(workflow?.tabs[0]?.id || '')
  const [search, setSearch] = useState('')
  const [selectedRow, setSelectedRow] = useState(null)
  const [actionState, setActionState] = useState(null)
  const activeTab = workflow?.tabs.find((tab) => tab.id === activeTabId) || workflow?.tabs[0]
  const query = useMemo(() => ({ limit: 25, q: search.trim() || undefined }), [search])
  const listQuery = useWorkflowListQuery(workflow?.id, activeTab, query, {
    enabled: Boolean(workflow),
  })
  const actionMutation = useWorkflowActionMutation(workflow?.id)
  const rows = useMemo(() => mapWorkflowRows(getListItems(listQuery.data)), [listQuery.data])

  if (!workflow || !activeTab) {
    return (
      <Alert severity="error">{t('apiWorkflows.errors.unknownWorkflow', { workflowId })}</Alert>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h1">{workflow.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {workflow.description}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Tabs
            value={activeTab.id}
            variant="scrollable"
            scrollButtons="auto"
            onChange={(_, nextValue) => {
              setActiveTabId(nextValue)
              setSelectedRow(null)
            }}
          >
            {workflow.tabs.map((tab) => (
              <Tab key={tab.id} label={tab.label} value={tab.id} />
            ))}
          </Tabs>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}
          >
            <TextField
              placeholder={t('apiWorkflows.searchPlaceholder')}
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: { md: 360 } }}
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip size="small" label={t('apiWorkflows.rowsCount', { count: rows.length })} />
              <Tooltip title={t('apiWorkflows.actions.refresh')}>
                <IconButton size="small" onClick={() => listQuery.refetch()}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          {listQuery.isFetching ? <LinearProgress /> : null}
          {listQuery.isError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {listQuery.error.message}
            </Alert>
          ) : null}
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('apiWorkflows.table.item')}</TableCell>
                  <TableCell>{t('apiWorkflows.table.status')}</TableCell>
                  <TableCell>{t('apiWorkflows.table.owner')}</TableCell>
                  <TableCell>{t('apiWorkflows.table.updated')}</TableCell>
                  <TableCell align="right">{t('apiWorkflows.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover selected={selectedRow?.id === row.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {row.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>{row.updatedAt}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setSelectedRow(row)}>
                        {t('apiWorkflows.actions.open')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!listQuery.isFetching && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('apiWorkflows.empty')}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Stack>

      <RawDrawer
        actionMutation={actionMutation}
        row={selectedRow}
        tab={activeTab}
        onAction={(action, row) => setActionState({ action, row })}
        onClose={() => setSelectedRow(null)}
      />
      {actionState ? (
        <ApiActionDialog
          action={actionState.action}
          mutation={actionMutation}
          row={actionState.row}
          workflowId={workflow.id}
          onClose={() => setActionState(null)}
        />
      ) : null}
    </Box>
  )
}
