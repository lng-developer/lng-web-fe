import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GridViewIcon from '@mui/icons-material/GridView'
import {
  Avatar,
  Box,
  ButtonBase,
  Chip,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Typography,
} from '@mui/material'

import { ELEVATION_SHADOWS, LAYOUT_SIZES } from '@/constants/app'
import { useCurrentUserQuery } from '@/features/auth/api/auth.queries'
import {
  getCurrentUserAvatar,
  getCurrentUserDisplayName,
  getCurrentUserInitials,
  getCurrentUserRole,
  resolveCurrentUser,
} from '@/features/auth/utils/currentUser'

import {
  filterNavigationByRole,
  getRoleMeta,
  getSidebarTabForPath,
  SIDEBAR_NAV_TABS,
  SIDEBAR_TAB_NAVIGATION,
  SIDEBAR_TABS,
} from './sidebarNavigation'

const SIDEBAR_WIDTH = 240

const NAV_ICONS = {
  dashboard: DashboardOutlinedIcon,
  portal: GridViewIcon,
}

function collectDefaultOpenIds(items) {
  return items.reduce((accumulator, item) => {
    if (item.defaultOpen) {
      accumulator[item.id] = true
    }

    const nestedItems = item.items ?? item.children

    if (nestedItems) {
      return { ...accumulator, ...collectDefaultOpenIds(nestedItems) }
    }

    return accumulator
  }, {})
}

function isPathActive(path, currentPath) {
  if (!path) {
    return false
  }

  return path === '/'
    ? currentPath === path
    : currentPath === path || currentPath.startsWith(`${path}/`)
}

function hasActivePath(item, currentPath) {
  if (isPathActive(item.path, currentPath)) {
    return true
  }

  const nestedItems = item.items ?? item.children

  return nestedItems
    ? nestedItems.some((nestedItem) => hasActivePath(nestedItem, currentPath))
    : false
}

function NavIcon({ icon, active }) {
  const IconComponent = NAV_ICONS[icon]

  if (!IconComponent) {
    return null
  }

  return (
    <ListItemIcon
      sx={{
        color: active ? 'primary.main' : 'text.secondary',
        minWidth: 36,
      }}
    >
      <IconComponent fontSize="small" />
    </ListItemIcon>
  )
}

function navButtonSx({ active, depth, withActiveBorder }) {
  return (theme) => ({
    borderLeft: withActiveBorder
      ? `${active ? 3 : 3}px solid ${active ? theme.palette.primary.main : 'transparent'}`
      : 0,
    borderRadius: withActiveBorder
      ? `0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0`
      : 1,
    color: active ? theme.palette.primary.main : theme.palette.text.primary,
    marginBottom: theme.spacing(0.25),
    marginRight: theme.spacing(1),
    minHeight: 40,
    paddingLeft: theme.spacing(depth === 'sub' ? 4 : 2),
    paddingRight: theme.spacing(1.5),
    '& .MuiListItemText-primary': {
      color: active
        ? theme.palette.primary.main
        : depth === 'sub'
          ? theme.palette.text.secondary
          : 'inherit',
      fontSize: theme.typography.body1.fontSize,
      fontWeight: active || depth !== 'sub' ? 600 : 400,
    },
    '&:hover': {
      backgroundColor: theme.palette.primary.light,
    },
    ...(active && {
      backgroundColor: theme.palette.primary.light,
      '&:hover': {
        backgroundColor: theme.palette.primary.light,
      },
    }),
  })
}

function sidebarTabSx({ active }) {
  return (theme) => ({
    alignItems: 'center',
    bgcolor: active ? 'background.paper' : 'transparent',
    border: 0,
    borderRadius: theme.spacing(1),
    boxShadow: active ? ELEVATION_SHADOWS.SIDEBAR_TAB : 'none',
    color: active ? 'primary.main' : 'text.disabled',
    cursor: 'pointer',
    display: 'flex',
    flex: 1,
    fontSize: theme.typography.body2.fontSize,
    fontWeight: active ? 600 : 400,
    justifyContent: 'center',
    minHeight: theme.spacing(4.5),
    px: 1,
    textTransform: 'none',
    transition: theme.transitions.create(['background-color', 'box-shadow', 'color'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover': {
      bgcolor: active ? 'background.paper' : 'background.paper',
    },
  })
}

function renderLeafItem({ item, pathname, t, depth, onNavigate }) {
  const active = isPathActive(item.path, pathname)
  const withActiveBorder = depth === 'root'

  return (
    <ListItemButton
      key={item.id}
      component={NavLink}
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      sx={navButtonSx({ active, depth, withActiveBorder })}
    >
      <NavIcon icon={item.icon} active={active} />
      <ListItemText primary={t(item.labelKey)} />
    </ListItemButton>
  )
}

export default function AppSidebar({ onNavigate, open }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { data, isPending } = useCurrentUserQuery()
  const pathTab = getSidebarTabForPath(pathname)
  const [selectedTab, setActiveTab] = useState(pathTab)
  const activeTab = pathTab === SIDEBAR_NAV_TABS.HR ? pathTab : selectedTab
  const [openItemsByTab, setOpenItemsByTab] = useState(() =>
    SIDEBAR_TABS.reduce(
      (itemsByTab, tab) => ({
        ...itemsByTab,
        [tab.id]: collectDefaultOpenIds(SIDEBAR_TAB_NAVIGATION[tab.id] ?? []),
      }),
      {},
    ),
  )
  const user = resolveCurrentUser(data)
  const userName = getCurrentUserDisplayName(user)
  const userAvatar = getCurrentUserAvatar(user)
  const role = getCurrentUserRole(user)
  const roleMeta = getRoleMeta(role)
  const openItems = openItemsByTab[activeTab] ?? {}
  const activeTabNavigation = SIDEBAR_TAB_NAVIGATION[activeTab] ?? []
  const navigation = filterNavigationByRole(activeTabNavigation, role)

  const toggleItem = (id) => {
    setOpenItemsByTab((state) => ({
      ...state,
      [activeTab]: {
        ...(state[activeTab] ?? {}),
        [id]: !state[activeTab]?.[id],
      },
    }))
  }

  const renderItems = (items, depth = 'root') =>
    items.map((item) => {
      if (item.type === 'section') {
        return (
          <Box key={item.id}>
            <Typography
              variant="caption"
              component="div"
              sx={{
                color: 'text.disabled',
                letterSpacing: '0.08em',
                px: 2,
                pt: 2,
                pb: 0.5,
                textTransform: 'uppercase',
                borderRadius: 10,
              }}
            >
              {t(item.labelKey)}
            </Typography>
            {renderItems(item.items, 'group')}
          </Box>
        )
      }

      if (item.children) {
        const isOpen = Boolean(openItems[item.id])
        const active = item.children.some((child) => hasActivePath(child, pathname))

        return (
          <Box key={item.id}>
            <ListItemButton
              onClick={() => toggleItem(item.id)}
              sx={navButtonSx({
                active: depth === 'root' && active,
                depth: depth === 'root' ? 'root' : 'group',
                withActiveBorder: depth === 'root',
              })}
            >
              <NavIcon icon={item.icon} active={depth === 'root' && active} />
              <ListItemText primary={t(item.labelKey)} />
              {isOpen ? (
                <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              ) : (
                <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              )}
            </ListItemButton>
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              {renderItems(item.children, item.type === 'group' ? 'sub' : 'group')}
            </Collapse>
          </Box>
        )
      }

      return renderLeafItem({ item, pathname, t, depth, onNavigate })
    })

  return (
    <Box
      component="aside"
      sx={(theme) => ({
        bgcolor: 'background.paper',
        borderRight: `1px solid ${theme.palette.divider}`,
        bottom: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        left: 0,
        position: 'fixed',
        top: LAYOUT_SIZES.HEADER_HEIGHT,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: theme.transitions.create('transform', {
          duration: theme.transitions.duration.shorter,
        }),
        width: SIDEBAR_WIDTH,
        zIndex: theme.zIndex.drawer,
      })}
      className="p-2"
    >
      <Box
        component="nav"
        aria-label={t('nav.sidebarTabs')}
        sx={{
          bgcolor: 'background.default',
          display: 'flex',
          gap: 1,
          // p: 1,
        }}
      >
        {SIDEBAR_TABS.map((tab) => {
          const active = activeTab === tab.id

          return (
            <ButtonBase
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveTab(tab.id)}
              sx={sidebarTabSx({ active })}
            >
              {t(tab.labelKey)}
            </ButtonBase>
          )
        })}
      </Box>

      <List
        disablePadding
        sx={{
          flex: 1,
          msOverflowStyle: 'none',
          overflowY: 'auto',
          py: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {isPending ? (
          <Box sx={{ px: 2, py: 1 }}>
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </Box>
        ) : (
          renderItems(navigation)
        )}
      </List>

      <Box
        sx={(theme) => ({
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          gap: 1.5,
          p: 2,
        })}
      >
        <Avatar src={userAvatar} alt={userName || t('auth.userFallback')}>
          {getCurrentUserInitials(userName)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" fontWeight={600} noWrap>
            {userName || t('auth.userFallback')}
          </Typography>
          {roleMeta && (
            <Chip
              label={t(roleMeta.labelKey)}
              size="small"
              sx={(theme) => ({
                bgcolor: theme.palette[roleMeta.color].light,
                color: theme.palette[roleMeta.color].main,
                fontWeight: 600,
                height: 22,
                mt: 0.5,
              })}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}

export { SIDEBAR_WIDTH }
