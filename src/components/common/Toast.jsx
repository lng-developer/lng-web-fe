import { forwardRef } from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import ErrorIcon from '@mui/icons-material/Error'
import InfoIcon from '@mui/icons-material/Info'
import WarningIcon from '@mui/icons-material/Warning'
import { IconButton, Stack, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

// Component/Toast (Figma "LNG v2"): nền surface.card, viền trái 4px theo màu trạng thái,
// shadow Elevation/Lg, radius 8, rộng 360px. Đăng ký qua SnackbarProvider `Components`
// trong AppProviders.jsx để thay SnackbarContent mặc định của notistack.
function ToastContent({ id, message, color, icon }) {
  const { closeSnackbar } = useSnackbar()

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        width: 360,
        maxWidth: '100%',
        p: '12px 16px',
        borderRadius: 2,
        borderLeft: 4,
        borderLeftColor: color,
        bgcolor: 'background.paper',
        boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)',
      }}
    >
      <Stack sx={{ color }}>{icon}</Stack>
      <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
        {message}
      </Typography>
      <IconButton size="small" onClick={() => closeSnackbar(id)} aria-label="close">
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
        color="success.main"
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
        color="error.main"
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
        color="warning.main"
        icon={<WarningIcon fontSize="small" />}
      />
    </div>
  )
})

export const InfoToast = forwardRef(function InfoToast({ id, message }, ref) {
  return (
    <div ref={ref}>
      <ToastContent
        id={id}
        message={message}
        color="info.main"
        icon={<InfoIcon fontSize="small" />}
      />
    </div>
  )
})
