import { useTranslation } from 'react-i18next'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmColor = 'error',
  loading = false,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      {title && <DialogTitle>{title}</DialogTitle>}
      <DialogContent>
        {typeof description === 'string' ? <Typography>{description}</Typography> : description}
      </DialogContent>
      <DialogActions className="px-6 pb-4">
        <Button onClick={onClose} color="inherit" disabled={loading}>
          {cancelLabel || t('common.cancel')}
        </Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm} disabled={loading}>
          {confirmLabel || t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
