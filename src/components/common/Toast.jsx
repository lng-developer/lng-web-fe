import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import ErrorIcon from '@mui/icons-material/Error'
import InfoIcon from '@mui/icons-material/Info'
import WarningIcon from '@mui/icons-material/Warning'
import { IconButton, Stack, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

const TOAST_STYLES = {
  success: {
    border: 'border-l-success',
    icon: 'text-success',
  },
  error: {
    border: 'border-l-danger',
    icon: 'text-danger',
  },
  warning: {
    border: 'border-l-warning',
    icon: 'text-warning',
  },
  info: {
    border: 'border-l-info',
    icon: 'text-info',
  },
}

// Component/Toast (Figma "LNG v2"): nền surface.card, viền trái 4px theo màu trạng thái,
// shadow Elevation/Lg, radius 8, rộng 360px. Đăng ký qua SnackbarProvider `Components`
// trong AppProviders.jsx để thay SnackbarContent mặc định của notistack.
function ToastContent({ id, message, variant, icon }) {
  const { t } = useTranslation()
  const { closeSnackbar } = useSnackbar()
  const styles = TOAST_STYLES[variant]

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      className={`w-[360px] max-w-full rounded-lg border-l-4 bg-surface px-4 py-3 shadow-lg ${styles.border}`}
    >
      <Stack className={styles.icon}>{icon}</Stack>
      <Typography variant="body2" className="flex-1 text-ink">
        {message}
      </Typography>
      <IconButton size="small" onClick={() => closeSnackbar(id)} aria-label={t('common.close')}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Stack>
  )
}

export const SuccessToast = forwardRef(function SuccessToast({ id, message }, ref) {
  return (
    <div ref={ref}>
      <ToastContent
        id={id}
        message={message}
        variant="success"
        icon={<CheckCircleIcon fontSize="small" />}
      />
    </div>
  )
})

export const ErrorToast = forwardRef(function ErrorToast({ id, message }, ref) {
  return (
    <div ref={ref}>
      <ToastContent
        id={id}
        message={message}
        variant="error"
        icon={<ErrorIcon fontSize="small" />}
      />
    </div>
  )
})

export const WarningToast = forwardRef(function WarningToast({ id, message }, ref) {
  return (
    <div ref={ref}>
      <ToastContent
        id={id}
        message={message}
        variant="warning"
        icon={<WarningIcon fontSize="small" />}
      />
    </div>
  )
})

export const InfoToast = forwardRef(function InfoToast({ id, message }, ref) {
  return (
    <div ref={ref}>
      <ToastContent id={id} message={message} variant="info" icon={<InfoIcon fontSize="small" />} />
    </div>
  )
})
