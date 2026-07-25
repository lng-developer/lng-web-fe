import { useTranslation } from 'react-i18next'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'

import { useMappingRuleHistoryQuery } from '@/features/mapping/api/mapping.queries'
import { mapMappingRuleHistory } from '@/features/mapping/utils/mappingMappers'

function formatTimestamp(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

export default function RuleHistoryDialog({ onClose, open, rule, type }) {
  const { t } = useTranslation()
  const historyQuery = useMappingRuleHistoryQuery(type, rule?.id, {
    enabled: Boolean(open && type && rule?.id),
  })
  const history = mapMappingRuleHistory(historyQuery.data)

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={onClose}
      aria-describedby="mapping-rule-history-description"
      aria-labelledby="mapping-rule-history-title"
    >
      <DialogTitle id="mapping-rule-history-title">
        {t('mapping.history.title', { rule: rule?.label })}
      </DialogTitle>
      <DialogContent dividers>
        <Typography id="mapping-rule-history-description" variant="body2" color="text.secondary">
          {t('mapping.history.description')}
        </Typography>
        {historyQuery.isFetching ? (
          <LinearProgress aria-label={t('mapping.history.loading')} className="mt-3" />
        ) : null}
        {historyQuery.error ? (
          <Alert severity="error" className="mt-3">
            {historyQuery.error.message}
          </Alert>
        ) : null}
        {!historyQuery.isFetching && !historyQuery.error && history.length === 0 ? (
          <Typography color="text.secondary" className="py-8 text-center" variant="body2">
            {t('mapping.history.empty')}
          </Typography>
        ) : null}
        <Stack spacing={1.5} className="mt-3">
          {history.map((entry) => (
            <Paper key={entry.id} variant="outlined" className="p-3">
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                className="sm:items-center"
              >
                <Chip
                  color={entry.event === 'STATUS_CHANGED' ? 'warning' : 'default'}
                  label={t(`mapping.history.events.${entry.event}`, {
                    defaultValue: entry.event,
                  })}
                  size="small"
                />
                <Typography className="flex-1" color="text.secondary" variant="caption">
                  {formatTimestamp(entry.createdAt)}
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  {t('mapping.history.actor', {
                    actor: t(`mapping.history.actors.${entry.actor}`, {
                      defaultValue: entry.actor,
                    }),
                  })}
                </Typography>
              </Stack>
              {entry.changes.length === 0 ? (
                <Typography color="text.secondary" className="mt-2" variant="body2">
                  {t('mapping.history.noFieldChanges')}
                </Typography>
              ) : (
                <Stack spacing={1} className="mt-3">
                  {entry.changes.map((change) => (
                    <Box key={change.field}>
                      <Typography color="text.secondary" variant="caption">
                        {t(`mapping.history.fields.${change.field}`, {
                          defaultValue: change.field,
                        })}
                      </Typography>
                      <Stack direction="row" spacing={1} className="items-center">
                        <Typography className="min-w-0 flex-1 break-words" variant="body2">
                          {change.before}
                        </Typography>
                        <ArrowForwardIcon color="action" fontSize="small" />
                        <Typography
                          className="min-w-0 flex-1 break-words font-semibold"
                          variant="body2"
                        >
                          {change.after}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
