import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import AutoAwesomeMosaicOutlinedIcon from '@mui/icons-material/AutoAwesomeMosaicOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import {
  Box,
  ButtonBase,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'

import { ELEVATION_SHADOWS, LAYOUT_SIZES } from '@/constants/app'
import { getCurrentUserDisplayName, resolveCurrentUser } from '@/features/auth/utils/currentUser'
import { useAuthStore } from '@/store/useAuthStore'

import {
  filterNavigationByUser,
  getNavItemTo,
  getSidebarWorkspaceForLocation,
  isNavItemActive,
  SIDEBAR_WORKSPACE_NAVIGATION,
  SIDEBAR_WORKSPACES,
} from './sidebarNavigation'

const SIDEBAR_WIDTH = 248

const WORKSPACE_ICONS = {
  orders: HomeOutlinedIcon,
  production: FactCheckOutlinedIcon,
  design: PaletteOutlinedIcon,
  vendor: StorefrontOutlinedIcon,
  reports: AssignmentOutlinedIcon,
  admin: SettingsOutlinedIcon,
}

const NAV_ITEM_ICONS = {
  ads: AssignmentOutlinedIcon,
  api: HubOutlinedIcon,
  audit: HistoryOutlinedIcon,
  config: SettingsOutlinedIcon,
  configuration: SettingsOutlinedIcon,
  costCenters: HomeOutlinedIcon,
  costs: ReceiptLongOutlinedIcon,
  design: PaletteOutlinedIcon,
  fulfillment: Inventory2OutlinedIcon,
  listings: ViewListOutlinedIcon,
  mapping: HubOutlinedIcon,
  monitoring: MonitorHeartOutlinedIcon,
  orders: Inventory2OutlinedIcon,
  products: CategoryOutlinedIcon,
  productTypes: CategoryOutlinedIcon,
  qc: RuleOutlinedIcon,
  reports: AssignmentOutlinedIcon,
  scale: FactCheckOutlinedIcon,
  shipping: LocalShippingOutlinedIcon,
  shops: StorefrontOutlinedIcon,
  submissions: ReceiptLongOutlinedIcon,
  templates: AssignmentOutlinedIcon,
  users: PeopleAltOutlinedIcon,
  vendors: StorefrontOutlinedIcon,
}

function hasActivePath(item, location) {
  if (isNavItemActive(item, location)) {
    return true
  }

  const nestedItems = item.items ?? item.children

  return nestedItems ? nestedItems.some((nestedItem) => hasActivePath(nestedItem, location)) : false
}

function NavGlyph({ icon, active }) {
  if (!icon) {
    return null
  }

  if (icon === 'amazon' || icon === 'etsy') {
    return (
      <Box
        component="span"
        aria-hidden="true"
        className={icon === 'etsy' ? 'text-xl' : 'text-lg'}
        sx={{
          color: active ? 'primary.main' : 'text.primary',
          display: 'inline-flex',
          fontFamily: icon === 'etsy' ? 'Georgia, serif' : 'Arial, sans-serif',
          fontWeight: icon === 'amazon' ? 700 : 500,
          justifyContent: 'center',
          lineHeight: 1,
          width: 24,
        }}
      >
        {icon === 'amazon' ? 'a' : 'E'}
      </Box>
    )
  }

  const Icon = NAV_ITEM_ICONS[icon]

  if (!Icon) {
    return null
  }

  return (
    <Icon
      aria-hidden="true"
      fontSize="small"
      sx={{
        color: active ? 'primary.main' : 'text.primary',
        width: 24,
      }}
    />
  )
}

function workspaceButtonSx({ active }) {
  return (theme) => ({
    alignItems: 'center',
    bgcolor: active ? 'primary.light' : 'transparent',
    border: 0,
    borderRadius: theme.spacing(1),
    boxShadow: active ? ELEVATION_SHADOWS.SIDEBAR_TAB : 'none',
    color: active ? 'primary.main' : 'text.secondary',
    cursor: 'pointer',
    display: 'flex',
    height: 34,
    justifyContent: 'center',
    minWidth: 34,
    transition: theme.transitions.create(['background-color', 'box-shadow', 'color'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover': {
      bgcolor: active ? 'primary.light' : 'action.hover',
      color: active ? 'primary.main' : 'text.primary',
    },
  })
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
    minHeight: 38,
    paddingLeft: theme.spacing(depth === 'sub' ? 4 : 2),
    paddingRight: theme.spacing(1.5),
    '& .MuiListItemText-primary': {
      color: active
        ? theme.palette.primary.main
        : depth === 'sub'
          ? theme.palette.text.secondary
          : 'inherit',
      fontSize: theme.typography.body2.fontSize,
      fontWeight: active || depth !== 'sub' ? 600 : 400,
    },
    '& .SidebarNavIcon': {
      color: active ? theme.palette.primary.main : theme.palette.text.primary,
      flex: '0 0 24px',
      mr: 1,
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

function renderLeafItem({ item, location, t, depth, onNavigate }) {
  const active = isNavItemActive(item, location)

  return (
    <ListItemButton
      key={item.id}
      component={NavLink}
      to={getNavItemTo(item)}
      end={item.path === '/'}
      onClick={onNavigate}
      sx={navButtonSx({ active, depth, withActiveBorder: depth === 'root' })}
    >
      <Box className="SidebarNavIcon">
        <NavGlyph icon={item.icon} active={active} />
      </Box>
      <ListItemText primary={t(item.labelKey)} />
    </ListItemButton>
  )
}

export default function AppSidebar({ onNavigate, open }) {
  const { t } = useTranslation()
  const location = useLocation()
  const storedCurrentUser = useAuthStore((state) => state.currentUser)
  const pathWorkspace = getSidebarWorkspaceForLocation(location.pathname, location.search)
  const [manualWorkspace, setManualWorkspace] = useState(null)
  const [openItemsByWorkspace, setOpenItemsByWorkspace] = useState(() =>
    SIDEBAR_WORKSPACES.reduce(
      (itemsByWorkspace, workspace) => ({
        ...itemsByWorkspace,
        [workspace.id]: {},
      }),
      {},
    ),
  )
  const [openItemsViewKey, setOpenItemsViewKey] = useState(null)
  const user = resolveCurrentUser(storedCurrentUser)
  const userName = getCurrentUserDisplayName(user)

  const navigationByWorkspace = SIDEBAR_WORKSPACES.reduce(
    (itemsByWorkspace, workspace) => ({
      ...itemsByWorkspace,
      [workspace.id]: filterNavigationByUser(
        SIDEBAR_WORKSPACE_NAVIGATION[workspace.id] ?? [],
        user,
      ),
    }),
    {},
  )
  const availableWorkspaces = SIDEBAR_WORKSPACES.filter(
    (workspace) => navigationByWorkspace[workspace.id]?.length,
  )
  const preferredWorkspace =
    manualWorkspace?.pathname === location.pathname ? manualWorkspace.id : pathWorkspace
  const activeWorkspace = availableWorkspaces.some(
    (workspace) => workspace.id === preferredWorkspace,
  )
    ? preferredWorkspace
    : availableWorkspaces.some((workspace) => workspace.id === pathWorkspace)
      ? pathWorkspace
      : availableWorkspaces[0]?.id
  const navigation = activeWorkspace ? navigationByWorkspace[activeWorkspace] : []
  const viewKey = `${location.pathname}|${location.search}|${activeWorkspace ?? ''}`
  const openItems =
    activeWorkspace && openItemsViewKey === viewKey
      ? (openItemsByWorkspace[activeWorkspace] ?? {})
      : {}

  const toggleItem = (id) => {
    if (!activeWorkspace) {
      return
    }

    setOpenItemsViewKey(viewKey)
    setOpenItemsByWorkspace((state) => ({
      ...state,
      [activeWorkspace]: {
        ...(state[activeWorkspace] ?? {}),
        [id]: !state[activeWorkspace]?.[id],
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
        const active = item.children.some((child) => hasActivePath(child, location))

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
              <Box className="SidebarNavIcon">
                <NavGlyph icon={item.icon} active={depth === 'root' && active} />
              </Box>
              <ListItemText primary={t(item.labelKey)} />
              {isOpen ? (
                <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              ) : (
                <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              )}
            </ListItemButton>
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              {renderItems(item.children, depth === 'root' ? 'group' : 'sub')}
            </Collapse>
          </Box>
        )
      }

      return renderLeafItem({ item, location, t, depth, onNavigate })
    })

  const renderWorkspaceRail = () => (
    <Box
      component="nav"
      aria-label={t('nav.workspacesLabel')}
      sx={(theme) => ({
        alignItems: 'center',
        borderRight: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        p: 0.75,
        width: 44,
      })}
    >
      {availableWorkspaces.map((workspace) => {
        const Icon = WORKSPACE_ICONS[workspace.id] ?? AutoAwesomeMosaicOutlinedIcon
        const active = activeWorkspace === workspace.id

        return (
          <ButtonBase
            key={workspace.id}
            type="button"
            title={t(workspace.labelKey)}
            aria-label={t(workspace.labelKey)}
            aria-pressed={active}
            onClick={() => setManualWorkspace({ id: workspace.id, pathname: location.pathname })}
            sx={workspaceButtonSx({ active })}
          >
            <Icon fontSize="small" />
          </ButtonBase>
        )
      })}
    </Box>
  )

  return (
    <Box
      component="aside"
      sx={(theme) => ({
        bgcolor: 'background.paper',
        borderRight: `1px solid ${theme.palette.divider}`,
        bottom: 0,
        boxSizing: 'border-box',
        display: 'flex',
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
    >
      {renderWorkspaceRail()}

      <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
        <Box
          sx={(theme) => ({
            borderBottom: `1px solid ${theme.palette.divider}`,
            px: 2,
            py: 1.5,
          })}
        >
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {t('app.brandName')}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {userName || t('auth.userFallback')}
          </Typography>
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
          {renderItems(navigation)}
        </List>
      </Box>
    </Box>
  )
}

export { SIDEBAR_WIDTH }
