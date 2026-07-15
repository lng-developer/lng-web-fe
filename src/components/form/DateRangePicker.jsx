import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  Box,
  Button,
  ButtonBase,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Popover,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

import dayjs from '@/lib/dayjs'

import { DATE_RANGE_PRESETS, getDateRangePreset } from './dateRangePresets'

const DATE_RANGE_PRESET_OPTIONS = [
  DATE_RANGE_PRESETS.TODAY,
  DATE_RANGE_PRESETS.YESTERDAY,
  DATE_RANGE_PRESETS.LAST_7_DAYS,
  DATE_RANGE_PRESETS.LAST_30_DAYS,
]

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
          const isStart = rangeStart && day.isSame(rangeStart, 'day')
          const isEnd = rangeEnd && day.isSame(rangeEnd, 'day')
          const isInRange =
            rangeStart &&
            rangeEnd &&
            day.isAfter(rangeStart, 'day') &&
            day.isBefore(rangeEnd, 'day')
          const isEdge = isStart || isEnd

          return (
            <ButtonBase
              key={day.format('YYYY-MM-DD')}
              component="button"
              type="button"
              role="gridcell"
              aria-label={day.locale(locale).format('DD/MM/YYYY')}
              aria-selected={Boolean(isEdge || isInRange)}
              disabled={disabled}
              onMouseEnter={() => onDayHover(day)}
              onFocus={() => onDayHover(day)}
              onClick={() => onDayClick(day)}
              className={`flex h-9 w-9 items-center justify-center box-border text-[0.8125rem] ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              }`}
              sx={{
                color: isEdge ? 'common.white' : !isCurrentMonth ? 'text.disabled' : 'text.primary',
                bgcolor: isEdge ? 'primary.main' : isInRange ? 'primary.light' : 'transparent',
                borderRadius: isEdge ? '50%' : 0,
                border: isToday && !isEdge ? '1px solid' : 'none',
                borderColor: 'primary.main',
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                  borderRadius: '50%',
                },
                '&:hover:not(.Mui-disabled)': !isEdge
                  ? { bgcolor: isInRange ? 'primary.light' : 'action.hover', borderRadius: '50%' }
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
  const generatedId = useId()
  const inputId = `date-range-${generatedId}`
  const muiTheme = useTheme()
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('sm'))
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

  const handlePresetSelect = (preset) => {
    const nextRange = getDateRangePreset(preset)
    setDraft(nextRange)
    onChange?.(nextRange)
    handleClose()
  }

  const isPresetActive = (preset) => {
    if (!draft.start || !draft.end) return false

    const presetRange = getDateRangePreset(preset)
    return draft.start.isSame(presetRange.start, 'day') && draft.end.isSame(presetRange.end, 'day')
  }

  const displayText =
    value.start && value.end
      ? `${value.start.format('DD/MM/YYYY')} - ${value.end.format('DD/MM/YYYY')}`
      : ''

  const leftMonth = baseMonth
  const range = { start: draft.start, end: draft.end }

  return (
    <Box className={fullWidth ? 'w-full' : 'w-[260px]'}>
      {label && (
        <Typography
          component="label"
          htmlFor={inputId}
          variant="caption"
          color="text.secondary"
          className="mb-[3px] block"
        >
          {label}
        </Typography>
      )}
      <OutlinedInput
        fullWidth
        id={inputId}
        readOnly
        value={displayText}
        placeholder={placeholder ?? t('dateRangePicker.placeholder')}
        onClick={handleOpen}
        error={error}
        disabled={disabled}
        endAdornment={
          <InputAdornment position="end">
            <CalendarTodayIcon fontSize="small" />
          </InputAdornment>
        }
        className={disabled ? 'cursor-default' : 'cursor-pointer'}
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
        slotProps={{
          paper: {
            className: 'mt-2 rounded-3xl p-4 shadow-lg',
          },
        }}
      >
        <Box className="flex flex-col gap-4 sm:flex-row">
          <Box className="flex shrink-0 gap-1 overflow-x-auto border-b border-default pb-3 sm:flex-col sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
            {DATE_RANGE_PRESET_OPTIONS.map((preset) => {
              const active = isPresetActive(preset)

              return (
                <Button
                  key={preset}
                  type="button"
                  variant="text"
                  size="small"
                  aria-pressed={active}
                  onClick={() => handlePresetSelect(preset)}
                  className={`shrink-0 !justify-start !rounded-lg !px-3 !py-2 !normal-case ${
                    active
                      ? '!bg-primary-light !font-semibold !text-primary'
                      : '!text-ink-secondary hover:!bg-page'
                  }`}
                >
                  {t(`dateRangePicker.presets.${preset}`)}
                </Button>
              )
            })}
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between" className="mb-2">
              <IconButton size="small" onClick={() => setBaseMonth((m) => m.subtract(1, 'month'))}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setBaseMonth((m) => m.add(1, 'month'))}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Stack direction={isDesktop ? 'row' : 'column'} className="gap-6">
              <MonthGrid
                monthStart={leftMonth}
                locale={i18n.language}
                range={range}
                hoverDay={hoverDay}
                onDayHover={setHoverDay}
                onDayClick={handleDayClick}
                disabled={disabled}
              />
              {isDesktop && (
                <MonthGrid
                  monthStart={baseMonth.add(1, 'month')}
                  locale={i18n.language}
                  range={range}
                  hoverDay={hoverDay}
                  onDayHover={setHoverDay}
                  onDayClick={handleDayClick}
                  disabled={disabled}
                />
              )}
            </Stack>
            <Stack direction="row" justifyContent="flex-end" className="mt-4 gap-2">
              <Button variant="text" onClick={handleClear}>
                {t('dateRangePicker.clear')}
              </Button>
              <Button variant="contained" onClick={handleApply}>
                {t('dateRangePicker.apply')}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Popover>
    </Box>
  )
}
