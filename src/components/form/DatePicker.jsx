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

function buildMonthMatrix(monthStart) {
  const offset = (monthStart.day() + 6) % 7
  const gridStart = monthStart.subtract(offset, 'day')
  return Array.from({ length: 42 }, (_, index) => gridStart.add(index, 'day'))
}

function buildWeekdayLabels(locale) {
  const monday = dayjs('2024-01-01').locale(locale)
  return Array.from({ length: 7 }, (_, index) => monday.add(index, 'day').format('dd'))
}

function MonthGrid({ monthStart, locale, selectedDate, onDayClick, disabled }) {
  const days = buildMonthMatrix(monthStart)
  const weekdays = buildWeekdayLabels(locale)

  return (
    <Stack className="w-[252px] gap-2">
      <Typography variant="body2" fontWeight={600} textAlign="center" className="capitalize">
        {monthStart.locale(locale).format('MMMM YYYY')}
      </Typography>
      <Box
        role="grid"
        aria-label={monthStart.locale(locale).format('MMMM YYYY')}
        className="grid grid-cols-[repeat(7,36px)]"
      >
        {weekdays.map((weekday, index) => (
          <Typography
            key={`${weekday}-${index}`}
            role="columnheader"
            variant="caption"
            color="text.secondary"
            textAlign="center"
            className="py-1 capitalize"
          >
            {weekday}
          </Typography>
        ))}
        {days.map((day) => {
          const isCurrentMonth = day.month() === monthStart.month()
          const isToday = day.isSame(dayjs(), 'day')
          const isSelected = selectedDate && day.isSame(selectedDate, 'day')

          return (
            <ButtonBase
              key={day.format('YYYY-MM-DD')}
              component="button"
              type="button"
              role="gridcell"
              aria-label={day.locale(locale).format('DD/MM/YYYY')}
              aria-selected={Boolean(isSelected)}
              disabled={disabled}
              onClick={() => onDayClick(day)}
              className={`flex h-9 w-9 items-center justify-center box-border text-[0.8125rem] ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              }`}
              sx={{
                color: isSelected
                  ? 'common.white'
                  : !isCurrentMonth
                    ? 'text.disabled'
                    : 'text.primary',
                bgcolor: isSelected ? 'primary.main' : 'transparent',
                borderRadius: 1,
                border: isToday && !isSelected ? '1px solid' : 'none',
                borderColor: 'primary.main',
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                  borderRadius: 1,
                },
                '&:hover:not(.Mui-disabled)': !isSelected
                  ? { bgcolor: 'action.hover', borderRadius: 1 }
                  : undefined,
              }}
            >
              {day.date()}
            </ButtonBase>
          )
        })}
      </Box>
    </Stack>
  )
}

export default function DatePicker({
  value,
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
  const inputId = `date-picker-${generatedId}`
  const [anchorEl, setAnchorEl] = useState(null)
  const currentVal = value ? dayjs(value) : null
  const [baseMonth, setBaseMonth] = useState(() => (currentVal ?? dayjs()).startOf('month'))

  const open = Boolean(anchorEl)

  const handleOpen = (event) => {
    if (disabled) return
    setBaseMonth((currentVal ?? dayjs()).startOf('month'))
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDayClick = (day) => {
    onChange?.(day.format('YYYY-MM-DD'))
    handleClose()
  }

  const displayText = currentVal && currentVal.isValid() ? currentVal.format('DD/MM/YYYY') : ''

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
        placeholder={placeholder ?? 'DD/MM/YYYY'}
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
            sx: { mt: 1, p: 2, borderRadius: 2 },
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <IconButton
            onClick={() => setBaseMonth((prev) => prev.subtract(1, 'month'))}
            size="small"
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton onClick={() => setBaseMonth((prev) => prev.add(1, 'month'))} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Stack>
        <MonthGrid
          monthStart={baseMonth}
          locale={i18n.language}
          selectedDate={currentVal}
          onDayClick={handleDayClick}
        />
      </Popover>
    </Box>
  )
}
