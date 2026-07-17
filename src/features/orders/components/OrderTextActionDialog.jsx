import { useState } from 'react'
import { Button, Dialog, Stack, TextField, Typography } from '@mui/material'

export default function OrderTextActionDialog({
  confirmLabel = 'Save',
  label,
  loading = false,
  onClose,
  onSubmit,
  open,
  required = false,
  title,
}) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const cleaned = value.trim()
    if (required && !cleaned) return
    onSubmit(cleaned)
    setValue('')
  }

  const handleClose = () => {
    setValue('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Typography variant="h6">{title}</Typography>
        <TextField
          label={label}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button variant="outlined" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={loading || (required && !value.trim())}
            onClick={handleSubmit}
          >
            {confirmLabel}
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  )
}
