import { Switch } from '@mui/material'

export default function StatusSwitch({ checked, disabled, ariaLabel, onChange }) {
  return (
    <Switch
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      slotProps={{ input: { 'aria-label': ariaLabel } }}
      sx={{
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
          bgcolor: 'success.main',
        },
        '& .MuiSwitch-switchBase.Mui-checked:hover + .MuiSwitch-track': {
          bgcolor: 'success.main',
        },
      }}
    />
  )
}
