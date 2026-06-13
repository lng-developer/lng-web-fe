import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Popover,
  Stack,
  Typography,
} from '@mui/material'

import dayjs from '@/lib/dayjs'

const CELL_SIZE = 36

// Sinh lưới 6 tuần x 7 ngày cho 1 tháng, tuần bắt đầu từ Thứ Hai.
function buildMonthMatrix(monthStart) {
  const offset = (monthStart.day() + 6) % 7
  const gridStart = monthStart.subtract(offset, 'day')
  return Array.from({ length: 42 }, (_, index) => gridStart.add(index, 'day'))
}

// 2024-01-01 là Thứ Hai - dùng làm mốc để lấy tên viết tắt 2 ký tự của 7 ngày trong tuần theo locale.
function buildWeekdayLabels(locale) {
  const monday = dayjs('2024-01-01').locale(locale)
  return Array.from({ length: 7 }, (_, index) => monday.add(index, 'day').format('dd'))
}

function MonthGrid({ monthStart, locale, range, hoverDay, onDayHover, onDayClick, disabled }) {
  const days = buildMonthMatrix(monthStart)
  const weekdays = buildWeekdayLabels(locale)
  const { start, end } = range
  const previewEnd = end ?? hoverDay
  const rangeStart = start && previewEnd && start.isAfter(previewEnd, 'day') ? previewEnd : start
  const rangeEnd =
    start && previewEnd ? (start.isAfter(previewEnd, 'day') ? start : previewEnd) : null

  return (
    <Stack spacing={1} sx={{ width: CELL_SIZE * 7 }}>
      <Typography
        variant="body2"
        fontWeight={600}
        textAlign="center"
        sx={{ textTransform: 'capitalize' }}
      >
        {monthStart.locale(locale).format('MMMM YYYY')}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(7, ${CELL_SIZE}px)` }}>
        {weekdays.map((weekday, index) => (
          <Typography
            key={`${weekday}-${index}`}
            variant="caption"
            color="text.secondary"
            textAlign="center"
            sx={{ textTransform: 'capitalize', py: 0.5 }}
          >
            {weekday}
          </Typography>
        ))}
        {days.map((day) => {
          const isCurrentMonth = day.month() === monthStart.month()
          const isToday = day.isSame(dayjs(), 'day')
          const isStart = rangeStart && day.isSame(rangeStart, 'day')
          const isEnd = rangeEnd && day.isSame(rangeEnd, 'day')
          const isInRange =
            rangeStart &&
            rangeEnd &&
            day.isAfter(rangeStart, 'day') &&
            day.isBefore(rangeEnd, 'day')
          const isEdge = isStart || isEnd

          return (
            <Box
              key={day.format('YYYY-MM-DD')}
              onMouseEnter={() => onDayHover(day)}
              onClick={() => !disabled && onDayClick(day)}
              sx={{
                height: CELL_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'default' : 'pointer',
                fontSize: '0.8125rem',
                color: isEdge ? '#FFFFFF' : !isCurrentMonth ? 'text.disabled' : 'text.primary',
                bgcolor: isEdge ? 'primary.main' : isInRange ? 'primary.light' : 'transparent',
                borderRadius: isEdge ? '50%' : 0,
                border: isToday && !isEdge ? '1px solid' : 'none',
                borderColor: 'primary.main',
                boxSizing: 'border-box',
                '&:hover': !isEdge
                  ? { bgcolor: isInRange ? 'primary.light' : 'action.hover', borderRadius: '50%' }
                  : undefined,
              }}
            >
              {day.date()}
            </Box>
          )
        })}
      </Box>
    </Stack>
  )
}

/**
 * Component/Date Range Picker (Figma "LNG v2"): trigger là 1 OutlinedInput (border.default,
 * focus brand.primary + Focus/Ring - dùng chung styleOverrides MuiOutlinedInput), mở Popover
 * chứa Component/Date Range Picker Calendar (surface.card, Elevation/Lg, radius card, 2 lưới tháng).
 */
export default function DateRangePicker({
  value = { start: null, end: null },
  onChange,
  label,
  placeholder,
  error,
  helperText,
  disabled,
  fullWidth = false,
}) {
  const { t, i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = useState(null)
  const [draft, setDraft] = useState(value)
  const [hoverDay, setHoverDay] = useState(null)
  const [baseMonth, setBaseMonth] = useState(() => (value.start ?? dayjs()).startOf('month'))

  const open = Boolean(anchorEl)

  const handleOpen = (event) => {
    setDraft(value)
    setHoverDay(null)
    setBaseMonth((value.start ?? dayjs()).startOf('month'))
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
    setHoverDay(null)
  }

  const handleDayClick = (day) => {
    setDraft((prev) => {
      if (!prev.start || (prev.start && prev.end)) {
        return { start: day, end: null }
      }
      if (day.isBefore(prev.start, 'day')) {
        return { start: day, end: prev.start }
      }
      return { start: prev.start, end: day }
    })
  }

  const handleClear = () => setDraft({ start: null, end: null })

  const handleApply = () => {
    onChange?.(draft)
    handleClose()
  }

  const displayText =
    value.start && value.end
      ? `${value.start.format('DD/MM/YYYY')} - ${value.end.format('DD/MM/YYYY')}`
      : ''

  const leftMonth = baseMonth
  const rightMonth = baseMonth.add(1, 'month')
  const range = { start: draft.start, end: draft.end }

  return (
    <Box sx={{ width: fullWidth ? '100%' : 260 }}>
      {label && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
      )}
      <OutlinedInput
        fullWidth
        readOnly
        value={displayText}
        placeholder={placeholder ?? t('dateRangePicker.placeholder')}
        onClick={handleOpen}
        error={error}
        disabled={disabled}
        endAdornment={
          <InputAdornment position="end">
            <CalendarTodayIcon fontSize="small" color="action" />
          </InputAdornment>
        }
        sx={{ cursor: disabled ? 'default' : 'pointer' }}
      />
      {helperText && (
        <Typography
          variant="caption"
          color={error ? 'error.main' : 'text.secondary'}
          sx={{ mt: 0.5, display: 'block' }}
        >
          {helperText}
        </Typography>
      )}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              p: 2,
              borderRadius: 3,
              boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)',
            },
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <IconButton size="small" onClick={() => setBaseMonth((m) => m.subtract(1, 'month'))}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setBaseMonth((m) => m.add(1, 'month'))}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={3}>
          <MonthGrid
            monthStart={leftMonth}
            locale={i18n.language}
            range={range}
            hoverDay={hoverDay}
            onDayHover={setHoverDay}
            onDayClick={handleDayClick}
            disabled={disabled}
          />
          <MonthGrid
            monthStart={rightMonth}
            locale={i18n.language}
            range={range}
            hoverDay={hoverDay}
            onDayHover={setHoverDay}
            onDayClick={handleDayClick}
            disabled={disabled}
          />
        </Stack>
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
          <Button variant="text" onClick={handleClear}>
            {t('dateRangePicker.clear')}
          </Button>
          <Button variant="contained" onClick={handleApply}>
            {t('dateRangePicker.apply')}
          </Button>
        </Stack>
      </Popover>
    </Box>
  )
}
