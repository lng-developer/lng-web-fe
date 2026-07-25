import { useTranslation } from 'react-i18next'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Alert, Box, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material'

function diagnosticText(diagnostic) {
  if (typeof diagnostic === 'string') return diagnostic
  return diagnostic?.message || diagnostic?.code || ''
}

export default function RuleEvaluationPanel({ conflicts = [], error, pending = false, preview }) {
  const { t } = useTranslation()
  const conflictItems = Array.isArray(conflicts) ? conflicts : conflicts?.conflicts || []
  const samples = preview?.samples || []
  const diagnostics = preview?.diagnostics || []

  return (
    <Paper variant="outlined" className="overflow-hidden">
      <Box className="border-b border-default px-4 py-3">
        <Typography variant="subtitle1">{t('mapping.evaluation.title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('mapping.evaluation.description')}
        </Typography>
      </Box>
      {pending ? <LinearProgress aria-label={t('mapping.evaluation.running')} /> : null}
      <Stack spacing={1.5} className="p-4">
        {error ? <Alert severity="error">{t(error, { defaultValue: error })}</Alert> : null}
        {diagnostics.map((diagnostic, index) => (
          <Alert key={`${diagnosticText(diagnostic)}-${index}`} severity="info">
            {diagnosticText(diagnostic)}
          </Alert>
        ))}
        {conflictItems.map((conflict) => (
          <Alert key={conflict.id} severity={conflict.severity === 'ERROR' ? 'error' : 'warning'}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} className="sm:items-center">
              <Typography variant="body2" className="flex-1">
                {t(`mapping.evaluation.conflictReasons.${conflict.reason}`, {
                  defaultValue: conflict.reason,
                })}
              </Typography>
              <Chip
                label={t('mapping.evaluation.priority', { value: conflict.priority })}
                size="small"
              />
            </Stack>
          </Alert>
        ))}
        {samples.map((sample) => (
          <Box
            key={`${sample.input}-${sample.output}`}
            className="grid grid-cols-1 gap-2 rounded-lg border border-default p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center"
          >
            <Typography variant="body2" className="break-all">
              {sample.input}
            </Typography>
            <ArrowForwardIcon color="action" fontSize="small" />
            <Typography variant="body2" className="break-all font-semibold">
              {sample.output}
            </Typography>
            <Chip
              color={sample.matched ? 'success' : 'default'}
              label={
                sample.matched
                  ? t('mapping.evaluation.matched')
                  : t('mapping.evaluation.notMatched')
              }
              size="small"
            />
          </Box>
        ))}
        {!pending && !error && !diagnostics.length && !conflictItems.length && !samples.length ? (
          <Typography variant="body2" color="text.secondary">
            {t('mapping.evaluation.empty')}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  )
}
