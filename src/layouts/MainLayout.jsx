import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import HomeIcon from '@mui/icons-material/Home'
import LightModeIcon from '@mui/icons-material/LightMode'
import MenuIcon from '@mui/icons-material/Menu'
import WidgetsIcon from '@mui/icons-material/Widgets'
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

import Loader from '@/components/common/Loader'
import { LANGUAGES, THEME_MODES } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { useUIStore } from '@/store/useUIStore'

const SIDEBAR_WIDTH = 240

const NAV_ITEMS = [
  { to: ROUTES.HOME, labelKey: 'nav.home', icon: <HomeIcon /> },
  { to: ROUTES.UI_KIT, labelKey: 'nav.uiKit', icon: <WidgetsIcon /> },
]

export default function MainLayout() {
  const { t, i18n } = useTranslation()
  const muiTheme = useTheme()
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'))
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const closeSidebar = useUIStore((state) => state.closeSidebar)
  const language = useUIStore((state) => state.language)
  const setLanguage = useUIStore((state) => state.setLanguage)
  const themeMode = useUIStore((state) => state.themeMode)
  const toggleThemeMode = useUIStore((state) => state.toggleThemeMode)

  const handleChangeLanguage = (lang) => {
    i18n.changeLanguage(lang)
    setLanguage(lang)
  }

  return (
    <Box className="flex min-h-screen flex-col">
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
            sx={{ bgcolor: 'background.paper' }}
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
        className="flex-1 p-4 transition-[margin] duration-200 md:p-6"
        sx={{ marginTop: '64px', marginLeft: { md: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0 } }}
      >
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  )
}
