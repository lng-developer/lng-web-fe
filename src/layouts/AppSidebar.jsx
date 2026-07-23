import { useTranslation } from 'react-i18next'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import ApiOutlinedIcon from '@mui/icons-material/ApiOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import OutboxOutlinedIcon from '@mui/icons-material/OutboxOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import { Box, ButtonBase, List, ListItemButton, ListItemText, Typography } from '@mui/material'

import { LAYOUT_SIZES } from '@/constants/app'
import { getCurrentUserDisplayName, resolveCurrentUser } from '@/features/auth/utils/currentUser'
import { useAuthStore } from '@/store/useAuthStore'

import {
  filterNavigationByUser,
  getFirstNavigableItem,
  getNavItemTo,
  getSidebarContextForLocation,
  HR_NAVIGATION,
  isNavItemActive,
  PORTAL_NAVIGATION,
  SIDEBAR_CONTEXT_IDS,
  SIDEBAR_CONTEXTS,
} from './sidebarNavigation'

const SIDEBAR_WIDTH = 248

const NAV_ITEM_ICONS = {
  api: ApiOutlinedIcon,
  audit: HistoryOutlinedIcon,
  config: SettingsOutlinedIcon,
  configuration: SettingsOutlinedIcon,
  dashboard: DashboardOutlinedIcon,
  design: BrushOutlinedIcon,
  finance: PaymentsOutlinedIcon,
  fulfillment: Inventory2OutlinedIcon,
  listings: ViewListOutlinedIcon,
  mapping: LinkOutlinedIcon,
  monitoring: MonitorHeartOutlinedIcon,
  orders: ShoppingCartOutlinedIcon,
  products: PaymentsOutlinedIcon,
  productTypes: CategoryOutlinedIcon,
  qc: FactCheckOutlinedIcon,
  reports: AssessmentOutlinedIcon,
  scale: ConstructionOutlinedIcon,
  shipping: LocalShippingOutlinedIcon,
  shops: StorefrontOutlinedIcon,
  submissions: OutboxOutlinedIcon,
  templates: DescriptionOutlinedIcon,
  users: PeopleAltOutlinedIcon,
  vendors: BusinessOutlinedIcon,
}

const sectionLabelSx = {
  color: 'text.secondary',
  display: 'flex',
  pb: 0.5,
  pt: 2,
  px: 2,
  '& .MuiListItemText-primary': {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    lineHeight: 1.25,
    textTransform: 'uppercase',
  },
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
        height: 16,
        width: 16,
      }}
    />
  )
}

function contextButtonSx({ selected }) {
  return (theme) => ({
    alignItems: 'center',
    bgcolor: selected ? 'background.paper' : 'transparent',
    borderRadius: 1,
    color: selected ? 'primary.main' : 'text.secondary',
    flex: 1,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: 700,
    minHeight: 32,
    transition: theme.transitions.create(['background-color', 'color'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover': {
      bgcolor: selected ? 'background.paper' : 'action.selected',
    },
    '&.Mui-focusVisible': {
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
    },
  })
}

function navButtonSx({ active, depth, withActiveBorder }) {
  return (theme) => ({
    alignItems: 'center',
    borderLeft: withActiveBorder
      ? `${active ? 3 : 3}px solid ${active ? theme.palette.primary.main : 'transparent'}`
      : 0,
    borderRadius: withActiveBorder
      ? `0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0`
      : 1,
    color: active ? theme.palette.primary.main : theme.palette.text.primary,
    display: 'flex',
    marginBottom: theme.spacing(0.25),
    marginRight: theme.spacing(1),
    minHeight: 38,
    paddingLeft: theme.spacing(depth === 'sub' ? 6 : depth === 'group' ? 4 : 2),
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
      flex: '0 0 16px',
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
  const navigate = useNavigate()
  const storedCurrentUser = useAuthStore((state) => state.currentUser)
  const activeContext = getSidebarContextForLocation(location.pathname)
  const user = resolveCurrentUser(storedCurrentUser)
  const userName = getCurrentUserDisplayName(user)

  const portalNavigation = filterNavigationByUser(PORTAL_NAVIGATION, user)
  const hrNavigation = filterNavigationByUser(HR_NAVIGATION, user)
  const contextNavigation =
    activeContext === SIDEBAR_CONTEXT_IDS.HR ? hrNavigation : portalNavigation
  const visibleContexts = SIDEBAR_CONTEXTS.filter((context) => {
    const contextNavigation =
      context.id === SIDEBAR_CONTEXT_IDS.HR ? hrNavigation : portalNavigation

    return getFirstNavigableItem(contextNavigation)
  })
  const handleContextChange = (contextId) => {
    if (contextId === activeContext) return

    const navigation = contextId === SIDEBAR_CONTEXT_IDS.HR ? hrNavigation : portalNavigation
    const landingItem = getFirstNavigableItem(navigation)

    if (!landingItem) return

    navigate(getNavItemTo(landingItem))
    onNavigate?.()
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
            {renderItems(item.items, 'root')}
          </Box>
        )
      }

      if (item.children) {
        const active = item.children.some((child) => hasActivePath(child, location))
        const isDomainLabel = depth === 'root'

        return (
          <Box key={item.id}>
            <Box
              sx={
                isDomainLabel
                  ? sectionLabelSx
                  : navButtonSx({
                      active: depth === 'root' && active,
                      depth: depth === 'root' ? 'root' : 'group',
                      withActiveBorder: depth === 'root',
                    })
              }
            >
              {!isDomainLabel && (
                <Box className="SidebarNavIcon">
                  <NavGlyph icon={item.icon} active={depth === 'root' && active} />
                </Box>
              )}
              <ListItemText primary={t(item.labelKey)} />
            </Box>
            {renderItems(item.children, depth === 'root' ? 'group' : 'sub')}
          </Box>
        )
      }

      return renderLeafItem({ item, location, t, depth, onNavigate })
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
    >
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
        <Box
          role="group"
          aria-label={t('nav.contexts.label')}
          sx={{
            bgcolor: 'action.hover',
            borderRadius: 1,
            display: 'flex',
            gap: 0.5,
            mt: 1.25,
            p: 0.5,
          }}
        >
          {visibleContexts.map((context) => {
            const selected = activeContext === context.id

            return (
              <ButtonBase
                key={context.id}
                type="button"
                aria-pressed={activeContext === context.id}
                onClick={() => handleContextChange(context.id)}
                sx={contextButtonSx({ selected })}
              >
                {t(context.labelKey)}
              </ButtonBase>
            )
          })}
        </Box>
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
        {renderItems(contextNavigation)}
      </List>
    </Box>
  )
}

export { SIDEBAR_WIDTH }
