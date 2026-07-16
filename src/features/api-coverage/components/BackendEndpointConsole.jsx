import { useMemo, useState } from 'react'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'

import {
  BACKEND_ENDPOINT_MODULES,
  BACKEND_ENDPOINTS,
  materializeEndpointPath,
} from '@/features/api-coverage/data/backendEndpoints'
import { apiClient } from '@/services/axiosInstance'

function parseJson(value) {
  if (!value.trim()) return {}
  return JSON.parse(value)
}

function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

async function runEndpoint({ endpoint, params, queryText, bodyText }) {
  const path = materializeEndpointPath(endpoint, params)
  const query = parseJson(queryText)
  const body = parseJson(bodyText)
  const method = endpoint.method.toLowerCase()

  if (method === 'get' || method === 'delete') {
    return apiClient[method](path, { params: query }).then(unwrapApiData)
  }

  return apiClient[method](path, body, { params: query }).then(unwrapApiData)
}

export default function BackendEndpointConsole({
  description = 'Run backend endpoints through the shared FE API client.',
  moduleIds,
  title = 'Backend API Console',
}) {
  const allowedModules = moduleIds?.length ? moduleIds : BACKEND_ENDPOINT_MODULES
  const [moduleId, setModuleId] = useState(allowedModules[0])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [params, setParams] = useState({})
  const [queryText, setQueryText] = useState('{}')
  const [bodyText, setBodyText] = useState('{}')
  const [localError, setLocalError] = useState('')

  const endpoints = useMemo(
    () =>
      BACKEND_ENDPOINTS.filter((endpoint) => allowedModules.includes(endpoint.moduleId)).filter(
        (endpoint) =>
          endpoint.moduleId === moduleId &&
          `${endpoint.method} ${endpoint.path}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [allowedModules, moduleId, search],
  )
  const selectedEndpoint =
    endpoints.find((endpoint) => endpoint.id === selectedId) || endpoints[0] || null
  const mutation = useMutation({ mutationFn: runEndpoint })

  function resetRequestState() {
    setParams({})
    setQueryText('{}')
    setBodyText('{}')
    setLocalError('')
    mutation.reset()
  }

  function handleRun() {
    if (!selectedEndpoint) return
    const missingParam = selectedEndpoint.paramNames.find((name) => !params[name])
    if (missingParam) {
      setLocalError(`Missing path param: ${missingParam}`)
      mutation.reset()
      return
    }
    setLocalError('')
    mutation.mutate({ endpoint: selectedEndpoint, params, queryText, bodyText })
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 112px)' }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="api-module-label">Module</InputLabel>
              <Select
                label="Module"
                labelId="api-module-label"
                value={moduleId}
                onChange={(event) => {
                  setModuleId(event.target.value)
                  setSelectedId('')
                  resetRequestState()
                }}
              >
                {allowedModules.map((module) => (
                  <MenuItem key={module} value={module}>
                    {module}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Search endpoint"
              size="small"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setSelectedId('')
                resetRequestState()
              }}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Paper>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: '420px 1fr' } }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 640, overflow: 'auto' }}>
            <Stack spacing={0.75} sx={{ p: 1 }}>
              {endpoints.map((endpoint) => {
                const active = selectedEndpoint?.id === endpoint.id
                return (
                  <Button
                    key={endpoint.id}
                    color={active ? 'primary' : 'inherit'}
                    onClick={() => {
                      setSelectedId(endpoint.id)
                      resetRequestState()
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      minHeight: 44,
                      textAlign: 'left',
                      textTransform: 'none',
                    }}
                    variant={active ? 'contained' : 'text'}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Chip label={endpoint.method} size="small" />
                      <Typography
                        component="code"
                        sx={{ fontFamily: 'monospace', fontSize: 12, overflowWrap: 'anywhere' }}
                      >
                        {endpoint.path}
                      </Typography>
                    </Stack>
                  </Button>
                )
              })}
            </Stack>
          </Paper>

          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
              {selectedEndpoint ? (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip color="primary" label={selectedEndpoint.method} />
                    <Typography
                      component="code"
                      sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}
                    >
                      {selectedEndpoint.path}
                    </Typography>
                  </Stack>

                  {selectedEndpoint.paramNames.map((name) => (
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

                  <TextField
                    label="Query JSON"
                    minRows={3}
                    multiline
                    value={queryText}
                    onChange={(event) => setQueryText(event.target.value)}
                  />
                  {selectedEndpoint.method === 'GET' ||
                  selectedEndpoint.method === 'DELETE' ? null : (
                    <TextField
                      label="Body JSON"
                      minRows={5}
                      multiline
                      value={bodyText}
                      onChange={(event) => setBodyText(event.target.value)}
                    />
                  )}
                  <Button
                    disabled={mutation.isPending}
                    onClick={handleRun}
                    startIcon={<PlayArrowIcon />}
                    variant="contained"
                  >
                    {mutation.isPending ? 'Running...' : 'Run endpoint'}
                  </Button>
                </Stack>
              ) : (
                <Alert severity="info">No endpoint matches the current filters.</Alert>
              )}
            </Paper>

            {localError ? <Alert severity="warning">{localError}</Alert> : null}
            {mutation.isError ? (
              <Alert severity="error">{mutation.error?.message || 'Request failed.'}</Alert>
            ) : null}
            {mutation.isSuccess ? (
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'background.default', px: 2, py: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Response
                  </Typography>
                </Box>
                <Box
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    m: 0,
                    maxHeight: 360,
                    overflow: 'auto',
                    p: 2,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {JSON.stringify(mutation.data, null, 2)}
                </Box>
              </Paper>
            ) : null}
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}
