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
      <AppBar position="fixed" sx={{ zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1 }}>
        <Toolbar className="gap-2">
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleSidebar}
            aria-label={t('theme.toggleSidebar')}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" className="flex-1">
            {t('app.name')}
          </Typography>
          <IconButton color="inherit" onClick={toggleThemeMode} aria-label={t('theme.toggleMode')}>
            {themeMode === THEME_MODES.DARK ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <ToggleButtonGroup
            value={language}
            exclusive
            size="small"
            onChange={(_event, value) => value && handleChangeLanguage(value)}
            className="bg-surface"
          >
            <ToggleButton value={LANGUAGES.VI}>VI</ToggleButton>
            <ToggleButton value={LANGUAGES.EN}>EN</ToggleButton>
          </ToggleButtonGroup>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'persistent' : 'temporary'}
        open={sidebarOpen}
        onClose={closeSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' } }}
      >
        <Toolbar />
        <List>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              end
              onClick={!isDesktop ? closeSidebar : undefined}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={t(item.labelKey)} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        className={`mt-16 flex-1 p-4 transition-[margin] duration-200 md:p-6 ${
          sidebarOpen ? 'md:ml-[240px]' : 'md:ml-0'
        }`}
      >
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  )
}
