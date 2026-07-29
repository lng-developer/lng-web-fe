import { useId, useState } from 'react'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import {
  Box,
  ButtonBase,
  FormHelperText,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Popover,
  Typography,
} from '@mui/material'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const MERIDIEMS = ['AM', 'PM']

function parseTime(value) {
  if (!value) return { hour: null, minute: null, meridiem: null }
  const [h24, m] = value.split(':')
  if (!h24 || !m) return { hour: null, minute: null, meridiem: null }
  const h = parseInt(h24, 10)
  const meridiem = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return {
    hour: String(hour12).padStart(2, '0'),
    minute: m,
    meridiem,
  }
}

function get24Hour(hour, meridiem) {
  let h = parseInt(hour, 10)
  if (meridiem === 'PM' && h !== 12) h += 12
  if (meridiem === 'AM' && h === 12) h = 0
  return String(h).padStart(2, '0')
}

export default function TimePicker({
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
  const generatedId = useId()
  const inputId = `time-picker-${generatedId}`
  const [anchorEl, setAnchorEl] = useState(null)
  const internalState = parseTime(value)

  const open = Boolean(anchorEl)

  const handleOpen = (event) => {
    if (disabled) return
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleChange = (part, val) => {
    const newState = {
      hour: internalState.hour || '12',
      minute: internalState.minute || '00',
      meridiem: internalState.meridiem || 'AM',
      [part]: val,
    }
    const h24 = get24Hour(newState.hour, newState.meridiem)
    onChange?.(`${h24}:${newState.minute}`)
  }

  let displayText = '--:-- --'
  if (internalState.hour && internalState.minute && internalState.meridiem) {
    displayText = `${internalState.hour}:${internalState.minute} ${internalState.meridiem}`
  }

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
        placeholder={placeholder ?? '--:-- --'}
        onClick={handleOpen}
        error={error}
        disabled={disabled}
        endAdornment={
          <InputAdornment position="end">
            <IconButton edge="end" onClick={handleOpen} disabled={disabled} size="small">
              <AccessTimeIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        }
        sx={(theme) => ({
          bgcolor: 'background.paper',
          cursor: disabled ? 'default' : 'pointer',
          '& .MuiInputBase-input': {
            cursor: disabled ? 'default' : 'pointer',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: open ? theme.palette.primary.main : undefined,
          },
        })}
      />
      {helperText && (
        <FormHelperText error={error} className="mx-[14px] mt-[3px]">
          {helperText}
        </FormHelperText>
      )}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            className: 'mt-1 rounded-sm border border-default shadow-lg',
            style: { display: 'flex', height: 240 },
          },
        }}
      >
        <Box
          className="w-[60px] overflow-y-auto border-r border-default"
          sx={{
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {HOURS.map((h) => (
            <ButtonBase
              key={h}
              className={`flex h-[38px] w-full items-center justify-center text-[15px] ${
                internalState.hour === h ? 'bg-primary text-white font-semibold' : 'hover:bg-page'
              }`}
              onClick={() => handleChange('hour', h)}
            >
              {h}
            </ButtonBase>
          ))}
        </Box>
        <Box
          className="w-[60px] overflow-y-auto border-r border-default"
          sx={{
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {MINUTES.map((m) => (
            <ButtonBase
              key={m}
              className={`flex h-[38px] w-full items-center justify-center text-[15px] ${
                internalState.minute === m ? 'bg-primary text-white font-semibold' : 'hover:bg-page'
              }`}
              onClick={() => handleChange('minute', m)}
            >
              {m}
            </ButtonBase>
          ))}
        </Box>
        <Box
          className="w-[60px] overflow-y-auto"
          sx={{
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {MERIDIEMS.map((m) => (
            <ButtonBase
              key={m}
              className={`flex h-[38px] w-full items-center justify-center text-[15px] ${
                internalState.meridiem === m
                  ? 'bg-primary text-white font-semibold'
                  : 'hover:bg-page'
              }`}
              onClick={() => handleChange('meridiem', m)}
            >
              {m}
            </ButtonBase>
          ))}
        </Box>
      </Popover>
    </Box>
  )
}
