import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Backdrop, Box, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import Loader from '@/components/common/Loader'
import { LAYOUT_SIZES } from '@/constants/app'
import { useUIStore } from '@/store/useUIStore'

import AppHeader from './AppHeader'
import AppSidebar, { SIDEBAR_WIDTH } from './AppSidebar'

export default function MainLayout() {
  const muiTheme = useTheme()
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'))
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const closeSidebar = useUIStore((state) => state.closeSidebar)

  return (
    <Box className="flex min-h-screen flex-col">
      <AppHeader onToggleSidebar={toggleSidebar} />

      {!isDesktop && (
        <Backdrop
          open={sidebarOpen}
          sx={(theme) => ({
            top: LAYOUT_SIZES.HEADER_HEIGHT,
            zIndex: theme.zIndex.drawer - 1,
          })}
          onClick={closeSidebar}
        />
      )}
      <AppSidebar open={sidebarOpen} onNavigate={!isDesktop ? closeSidebar : undefined} />

      <Box
        component="main"
        className="flex-1 p-4 transition-[margin] duration-200 md:p-6"
        sx={{
          marginLeft: { md: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0 },
          marginTop: `${LAYOUT_SIZES.HEADER_HEIGHT}px`,
        }}
      >
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  )
}
