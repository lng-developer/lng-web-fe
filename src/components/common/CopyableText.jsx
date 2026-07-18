import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Popover, Stack, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import { SNACKBAR_VARIANTS } from '@/constants/app'

export default function CopyableText({ emptyValue = '-', sx, value, variant = 'body2' }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [anchorEl, setAnchorEl] = useState(null)
  const text = String(value || '').trim()

  if (!text || text === emptyValue) {
    return <Typography variant={variant}>{emptyValue}</Typography>
  }

  async function handleCopy(event) {
    event.preventDefault()
    event.stopPropagation()
    setAnchorEl(event.currentTarget)

    try {
      await navigator.clipboard.writeText(text)
      enqueueSnackbar(t('common.copied', { defaultValue: 'Copied' }), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
    } catch {
      enqueueSnackbar(t('common.copyFailed', { defaultValue: 'Could not copy' }), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={handleCopy}
        sx={(theme) => ({
          appearance: 'none',
          bgcolor: 'transparent',
          border: 0,
          color: 'inherit',
          cursor: 'copy',
          font: 'inherit',
          maxWidth: '100%',
          p: 0,
          textAlign: 'inherit',
          '&:hover': {
            color: theme.palette.primary.main,
          },
          ...sx,
        })}
      >
        <Typography variant={variant} sx={{ overflowWrap: 'anywhere' }}>
          {text}
        </Typography>
      </Box>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 1.5,
              maxWidth: 320,
              p: 1.25,
            },
          },
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            {t('common.copied', { defaultValue: 'Copied' })}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
            {text}
          </Typography>
        </Stack>
      </Popover>
    </>
  )
}
