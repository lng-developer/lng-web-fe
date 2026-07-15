import { useTranslation } from 'react-i18next'
import CloseIcon from '@mui/icons-material/Close'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'

export default function QcDecisionDialog({
  decision,
  loading,
  note,
  onClose,
  onConfirm,
  onNoteChange,
  open,
  orderId,
}) {
  const { t } = useTranslation()
  const isPassed = decision === 'PASSED'

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle className="pr-12 text-lg font-semibold text-ink-strong">
        {t(isPassed ? 'qc.decision.passTitle' : 'qc.decision.rejectTitle')}
        <IconButton
          aria-label={t('qc.decision.close')}
          disabled={loading}
          onClick={onClose}
          className="!absolute !right-3 !top-3 !text-ink-muted"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-3">
        <Typography variant="body2" className="text-sm text-ink-secondary">
          {t(isPassed ? 'qc.decision.passDescription' : 'qc.decision.rejectDescription', {
            orderId,
          })}
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          label={t('qc.decision.note')}
          placeholder={t('qc.decision.notePlaceholder')}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions className="flex gap-3 px-6 pb-6 pt-2">
        <Button variant="outlined" onClick={onClose} disabled={loading} className="h-10 px-5">
          {t('qc.decision.cancel')}
        </Button>
        <Button
          variant="contained"
          color={isPassed ? 'success' : 'error'}
          onClick={onConfirm}
          disabled={loading}
          className="h-10 px-5"
        >
          {loading
            ? t('qc.decision.saving')
            : t(isPassed ? 'qc.decision.confirmPass' : 'qc.decision.confirmReject')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
