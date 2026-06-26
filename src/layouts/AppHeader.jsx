import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import SearchIcon from '@mui/icons-material/Search'
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined'
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  ButtonBase,
  Chip,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Toolbar,
} from '@mui/material'

import { LANGUAGES, LAYOUT_SIZES, THEME_MODES } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { useCurrentUserQuery } from '@/features/auth/api/auth.queries'
import {
  getCurrentUserInitials,
  getCurrentUserRole,
  resolveCurrentUser,
} from '@/features/auth/utils/currentUser'
import { useUIStore } from '@/store/useUIStore'

import { getRoleMeta } from './sidebarNavigation'

const LNG_LOGO_URL = 'https://res.cloudinary.com/drnzb64by/image/upload/v1773214517/logo_juyfbo.jpg'

function headerIconButtonSx(active = false) {
  return (theme) => ({
    color: active ? 'primary.main' : 'text.disabled',
    height: theme.spacing(4.5),
    width: theme.spacing(4.5),
    '&:hover': {
      bgcolor: 'background.default',
      color: active ? 'primary.main' : 'text.primary',
    },
  })
}

function languageToggleButtonSx(active) {
  return (theme) => ({
    bgcolor: active ? 'background.paper' : 'transparent',
    borderRadius: '20px',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
    color: active ? 'text.primary' : 'text.disabled',
    fontSize: theme.typography.caption.fontSize,
    fontWeight: active ? 600 : 400,
    height: theme.spacing(3),
    minWidth: theme.spacing(3.5),
    px: 0.75,
    textTransform: 'uppercase',
    transition: theme.transitions.create(['background-color', 'box-shadow', 'color'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover': {
      bgcolor: active ? 'background.paper' : 'action.hover',
    },
  })
}

function getHeaderInitialsSource(user) {
  return (
    user?.profile?.fullName ??
    user?.profile?.email ??
    user?.account?.email ??
    user?.name ??
    user?.fullName ??
    user?.displayName ??
    user?.email ??
    ''
  )
}

export default function AppHeader({ onToggleSidebar }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null)
  const { data: currentUserData } = useCurrentUserQuery()
  const language = useUIStore((state) => state.language)
  const setLanguage = useUIStore((state) => state.setLanguage)
  const themeMode = useUIStore((state) => state.themeMode)
  const setThemeMode = useUIStore((state) => state.setThemeMode)
  const currentUser = resolveCurrentUser(currentUserData)
  const userRole = getCurrentUserRole(currentUser)
  const roleMeta = getRoleMeta(userRole)
  const roleLabel = roleMeta
    ? t(roleMeta.labelKey)
    : userRole
      ? userRole.toUpperCase()
      : t('roles.admin')
  const userInitials = getCurrentUserInitials(
    getHeaderInitialsSource(currentUser) || roleLabel || t('auth.userFallback'),
  )

  const handleChangeLanguage = (lang) => {
    i18n.changeLanguage(lang)
    setLanguage(lang)
  }
  const isUserMenuOpen = Boolean(userMenuAnchorEl)

  const handleOpenUserMenu = (event) => {
    setUserMenuAnchorEl(event.currentTarget)
  }

  const handleCloseUserMenu = () => {
    setUserMenuAnchorEl(null)
  }

  const handleOpenProfile = () => {
    handleCloseUserMenu()
    navigate(ROUTES.PROFILE)
  }

  const handleOpenDepartments = () => {
    handleCloseUserMenu()
    navigate(ROUTES.DEPARTMENTS)
  }

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={(theme) => ({
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
        height: LAYOUT_SIZES.HEADER_HEIGHT,
        left: 0,
        width: '100%',
        zIndex: theme.zIndex.drawer + 1,
      })}
    >
      <Toolbar
        disableGutters
        className="relative gap-2 px-3 md:px-4"
        sx={{
          height: LAYOUT_SIZES.HEADER_HEIGHT,
          minHeight: `${LAYOUT_SIZES.HEADER_HEIGHT}px !important`,
        }}
      >
        <IconButton
          color="inherit"
          edge="start"
          className="md:hidden"
          onClick={onToggleSidebar}
          aria-label={t('theme.toggleSidebar')}
        >
          <MenuIcon />
        </IconButton>

        <Box className="flex min-w-0 items-center gap-2">
          <Box
            component="img"
            src={LNG_LOGO_URL}
            alt={t('app.brandName')}
            sx={{
              display: 'block',
              height: 24,
              objectFit: 'contain',
              width: 24,
            }}
          />
          <Box
            component="span"
            sx={{
              color: 'text.primary',
              fontSize: '0.9375rem',
              fontWeight: 700,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
          >
            {t('app.brandName')}
          </Box>
        </Box>

        <Box
          component="form"
          className="items-center"
          sx={(theme) => ({
            display: { xs: 'none', md: 'flex' },
            left: '50%',
            maxWidth: 480,
            position: 'absolute',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(480px, calc(100% - 520px))',
            zIndex: 0,
            '&:focus-within > div': {
              borderColor: theme.palette.primary.main,
            },
          })}
        >
          <Box
            className="flex w-full items-center gap-2 px-3"
            sx={(theme) => ({
              bgcolor: 'background.default',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '20px',
              height: theme.spacing(4.5),
              transition: theme.transitions.create('border-color', {
                duration: theme.transitions.duration.shorter,
              }),
            })}
          >
            <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
            <InputBase
              fullWidth
              placeholder={t('header.searchPlaceholder')}
              inputProps={{ 'aria-label': t('header.searchPlaceholder') }}
              sx={{ typography: 'body2' }}
            />
          </Box>
        </Box>

        <Box className="ml-auto flex items-center gap-1">
          <IconButton
            onClick={() => setThemeMode(THEME_MODES.LIGHT)}
            aria-label={t('theme.light')}
            sx={headerIconButtonSx(themeMode === THEME_MODES.LIGHT)}
          >
            <WbSunnyOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            onClick={() => setThemeMode(THEME_MODES.DARK)}
            aria-label={t('theme.dark')}
            sx={headerIconButtonSx(themeMode === THEME_MODES.DARK)}
          >
            <DarkModeOutlinedIcon fontSize="small" />
          </IconButton>

          <Box
            aria-label={t('header.language')}
            className="hidden items-center sm:flex"
            sx={(theme) => ({
              bgcolor: 'background.default',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '20px',
              gap: 0.25,
              p: 0.25,
            })}
          >
            {[
              { label: 'VI', value: LANGUAGES.VI },
              { label: 'EN', value: LANGUAGES.EN },
            ].map((item) => (
              <ButtonBase
                key={item.value}
                type="button"
                aria-pressed={language === item.value}
                onClick={() => handleChangeLanguage(item.value)}
                sx={languageToggleButtonSx(language === item.value)}
              >
                {item.label}
              </ButtonBase>
            ))}
          </Box>

          <IconButton aria-label={t('header.notifications')} sx={headerIconButtonSx()}>
            <Badge color="error" variant="dot" overlap="circular">
              <NotificationsNoneIcon fontSize="small" />
            </Badge>
          </IconButton>

          <Chip
            label={roleLabel}
            aria-label={t('header.roleChip')}
            size="small"
            sx={(theme) => ({
              bgcolor: 'primary.light',
              border: `1px solid ${theme.palette.primary.main}`,
              borderRadius: '20px',
              color: 'primary.main',
              fontSize: theme.typography.caption.fontSize,
              fontWeight: 600,
              height: theme.spacing(3),
              px: 0.25,
              '& .MuiChip-label': {
                px: 1,
              },
            })}
          />

          <ButtonBase
            type="button"
            aria-label={t('header.userMenu')}
            aria-controls={isUserMenuOpen ? 'app-header-user-menu' : undefined}
            aria-expanded={isUserMenuOpen ? 'true' : undefined}
            aria-haspopup="menu"
            className="items-center gap-1"
            onClick={handleOpenUserMenu}
            sx={(theme) => ({
              borderRadius: theme.spacing(0.75),
              display: 'flex',
              px: 0.25,
              '&:hover': {
                bgcolor: 'background.default',
              },
            })}
          >
            <Avatar
              sx={(theme) => ({
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.grey[300]}`,
                color: 'text.primary',
                fontSize: theme.typography.caption.fontSize,
                fontWeight: 700,
                height: theme.spacing(4),
                width: theme.spacing(4),
              })}
            >
              {userInitials}
            </Avatar>
            <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          </ButtonBase>
          <Menu
            id="app-header-user-menu"
            anchorEl={userMenuAnchorEl}
            open={isUserMenuOpen}
            onClose={handleCloseUserMenu}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            slotProps={{
              paper: {
                sx: (theme) => ({
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.spacing(1),
                  boxShadow: theme.shadows[4],
                  mt: 1,
                  minWidth: 180,
                }),
              },
            }}
          >
            <MenuItem onClick={handleOpenProfile}>{t('header.profile')}</MenuItem>
            <MenuItem onClick={handleOpenDepartments}>{t('header.departments')}</MenuItem>
            <MenuItem disabled>{t('header.logout')}</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
