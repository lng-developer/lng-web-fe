import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  Box,
  ButtonBase,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Popover,
  Stack,
  Typography,
} from '@mui/material'

import dayjs from '@/lib/dayjs'

export default function MonthPicker({
  value, // Format: YYYY-MM
  onChange,
  label,
  placeholder,
  error,
  helperText,
  disabled,
  fullWidth = false,
  required = false,
  size,
  className,
}) {
  const { i18n } = useTranslation()
  const generatedId = useId()
  const inputId = `month-picker-${generatedId}`
  const [anchorEl, setAnchorEl] = useState(null)

  const currentVal = value ? dayjs(`${value}-01`) : null
  const [baseYear, setBaseYear] = useState(() => (currentVal ?? dayjs()).year())

  const open = Boolean(anchorEl)

  const handleOpen = (event) => {
    if (disabled) return
    setBaseYear((currentVal ?? dayjs()).year())
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleMonthClick = (monthIndex) => {
    const selected = dayjs().year(baseYear).month(monthIndex)
    onChange?.(selected.format('YYYY-MM'))
    handleClose()
  }

  const displayText = currentVal && currentVal.isValid() ? currentVal.format('MM/YYYY') : ''
  const months = Array.from({ length: 12 }, (_, i) =>
    dayjs().month(i).locale(i18n.language).format('MMM'),
  )

  return (
    <Box className={`${fullWidth ? 'w-full' : 'w-[260px]'} ${className || ''}`}>
      {label && (
        <Typography
          component="label"
          htmlFor={inputId}
          variant="caption"
          color="text.secondary"
          className="mb-[3px] block"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </Typography>
      )}
      <OutlinedInput
        fullWidth
        size={size}
        id={inputId}
        readOnly
        value={displayText}
        placeholder={placeholder ?? 'MM/YYYY'}
        onClick={handleOpen}
        error={error}
        disabled={disabled}
        endAdornment={
          <InputAdornment position="end">
            <IconButton edge="end" onClick={handleOpen} disabled={disabled} size="small">
              <CalendarTodayIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        }
        className={disabled ? 'cursor-default' : 'cursor-pointer'}
        sx={{
          bgcolor: 'surface.main',
          '& input': { cursor: 'pointer' },
        }}
      />
      {helperText && (
        <Typography
          variant="caption"
          color={error ? 'error.main' : 'text.secondary'}
          className="mt-[3px] block leading-[1.35]"
        >
          {helperText}
        </Typography>
      )}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: { mt: 1, p: 2, borderRadius: 2, width: 280 },
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <IconButton onClick={() => setBaseYear((y) => y - 1)} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={600}>
            {baseYear}
          </Typography>
          <IconButton onClick={() => setBaseYear((y) => y + 1)} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Stack>
        <div className="grid grid-cols-3 gap-2">
          {months.map((monthName, index) => {
            const isSelected =
              currentVal && currentVal.year() === baseYear && currentVal.month() === index
            const isCurrentMonth = dayjs().year() === baseYear && dayjs().month() === index

            return (
              <ButtonBase
                key={monthName}
                onClick={() => handleMonthClick(index)}
                className="py-2 px-3 rounded-md box-border capitalize text-sm font-medium"
                sx={{
                  color: isSelected ? 'common.white' : 'text.primary',
                  bgcolor: isSelected ? 'primary.main' : 'transparent',
                  border: isCurrentMonth && !isSelected ? '1px solid' : 'none',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: isSelected ? 'primary.main' : 'action.hover',
                  },
                }}
              >
                {monthName}
              </ButtonBase>
            )
          })}
        </div>
      </Popover>
    </Box>
  )
}
