import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'

export default function LeaveAttachmentDialog({ open, loading = false, error, onClose, onSubmit }) {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (file) onSubmit(file)
        }}
      >
        <DialogTitle>{t('hrTime.attachments.title', { defaultValue: 'Attach file' })}</DialogTitle>
        <DialogContent className="grid gap-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            required
            fullWidth
            type="file"
            slotProps={{ inputLabel: { shrink: true } }}
            label={t('hrTime.fields.attachment', { defaultValue: 'Attachment' })}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="submit" variant="contained" disabled={!file || loading}>
            {t('hrTime.actions.upload', { defaultValue: 'Upload' })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
