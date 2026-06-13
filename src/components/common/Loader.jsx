import { Box, CircularProgress } from '@mui/material'

export default function Loader() {
  return (
    <Box className="flex h-full min-h-40 w-full items-center justify-center">
      <CircularProgress />
    </Box>
  )
}
