import { Box, IconButton, Tooltip, Typography } from '@mui/material'

export default function OrderActionButton({ color = 'default', disabled = false, icon, label, onClick }) {
  return (
    <Tooltip title={label}>
      <Box
        component="span"
        sx={{
          alignItems: 'center',
          display: 'inline-flex',
          flexDirection: 'column',
          gap: 0.5,
          minWidth: 68,
        }}
      >
        <IconButton
          color={color}
          disabled={disabled}
          onClick={onClick}
          size="small"
          sx={(theme) => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
            height: 34,
            width: 34,
          })}
        >
          {icon}
        </IconButton>
        <Typography
          variant="caption"
          color={disabled ? 'text.disabled' : 'text.secondary'}
          sx={{ lineHeight: 1.2, maxWidth: 78, textAlign: 'center' }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  )
}
