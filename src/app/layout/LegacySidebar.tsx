import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiOutlineFileSync } from 'react-icons/ai'
import { BiExtension } from 'react-icons/bi'
import { BsFiletypePsd } from 'react-icons/bs'
import { CgShoppingBag } from 'react-icons/cg'
import { CgFileDocument } from 'react-icons/cg'
import { FaAmazon, FaEtsy, FaShopify } from 'react-icons/fa'
import { FaAnglesLeft, FaAnglesRight } from 'react-icons/fa6'
import { HiOutlineBuildingStorefront } from 'react-icons/hi2'
import { IoStorefrontOutline } from 'react-icons/io5'
import { IoImageOutline } from 'react-icons/io5'
import {
  LuBox,
  LuLayoutDashboard,
  LuLayoutGrid,
  LuLayoutList,
  LuLightbulb,
  LuNotebook,
  LuPalette,
  LuTruck,
} from 'react-icons/lu'
import { MdBalance, MdOutlineConnectedTv } from 'react-icons/md'
import {
  RiAdvertisementLine,
  RiPaletteLine,
  RiSettings2Line,
  RiTokenSwapLine,
} from 'react-icons/ri'
import {
  TbAward,
  TbBlender,
  TbBuildingFactory2,
  TbHomeDollar,
  TbHomeStats,
  TbPackages,
  TbReport,
  TbReportSearch,
} from 'react-icons/tb'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ApartmentOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Badge, Image, Layout, Menu, Tooltip } from 'antd'

import { workspaceRouteLinks } from '@/app/router/workspaceRoutes'
import { useDesignSummaryQuery } from '@/features/portal/design/hooks/useDesignTasksQuery'
import { useOrderSummaryQuery } from '@/features/portal/orders/hooks/useOrderSummaryQuery'
import { useProductionQueueCountsQuery } from '@/features/portal/production/hooks/useProductionTasksQuery'

import { getCoreForPath, type NavigationGroup, type NavigationItem } from './appNavigation'
import { getRememberedCoreRoute } from './coreRouteMemory'
import styles from './LegacySidebar.module.scss'

const { Sider } = Layout

type LegacyMenuItem = {
  key: string
  labelKey: string
  icon: ReactNode
  className?: string
  children?: LegacyMenuItem[]
}

type LegacyRailItem = {
  key: string
  labelKey: string
  icon: ReactNode
  path?: string
}

const topMenus: LegacyRailItem[] = [
  {
    key: 'dashboard',
    path: '/portal/dashboard',
    labelKey: 'shell.navigation.dashboard',
    icon: <LuLayoutDashboard size={20} />,
  },
  { key: 'sales', labelKey: 'legacyMenu.sales', icon: <TbHomeStats size={20} /> },
  { key: 'fulfillment', labelKey: 'legacyMenu.fulfillment', icon: <MdBalance size={20} /> },
  { key: 'design', labelKey: 'legacyMenu.design', icon: <RiPaletteLine size={20} /> },
  { key: 'vendor', labelKey: 'legacyMenu.vendor', icon: <HiOutlineBuildingStorefront size={20} /> },
  { key: 'extensions', labelKey: 'legacyMenu.extensions', icon: <BiExtension size={20} /> },
]

const hrTopMenus: LegacyRailItem[] = [
  {
    key: 'hr-dashboard',
    path: '/hr/dashboard',
    labelKey: 'shell.navigation.dashboard',
    icon: <LuLayoutDashboard size={20} />,
  },
  { key: 'hr', labelKey: 'shell.cores.hr', icon: <TeamOutlined /> },
]

const bottomMenus: LegacyRailItem[] = [
  { key: 'system', labelKey: 'legacyMenu.setting', icon: <SettingOutlined /> },
]
const emptyBottomMenuGroups: Partial<Record<'portal' | 'hr' | 'system', NavigationGroup[]>> = {
  portal: [],
  hr: [],
  system: [],
}

const detailMenus: Record<string, LegacyMenuItem[]> = {
  sales: [
    {
      key: workspaceRouteLinks.orders,
      labelKey: 'legacyMenu.orders',
      icon: <LuBox size={20} />,
      children: [
        {
          key: workspaceRouteLinks.ordersBySalesChannel('amazon'),
          labelKey: 'legacyMenu.amazon',
          icon: <FaAmazon size={20} />,
        },
        {
          key: workspaceRouteLinks.ordersBySalesChannel('etsy'),
          labelKey: 'legacyMenu.etsy',
          icon: <FaEtsy size={20} />,
        },
        {
          key: workspaceRouteLinks.ordersBySalesChannel('shopify'),
          labelKey: 'legacyMenu.shopify',
          icon: <FaShopify size={20} />,
        },
      ],
    },
    {
      key: workspaceRouteLinks.teamTasks,
      labelKey: 'legacyMenu.teamTasks',
      icon: <LuNotebook size={20} />,
    },
    {
      key: 'listing',
      labelKey: 'legacyMenu.listing',
      icon: <LuLayoutList size={20} />,
      children: [
        {
          key: '/portal/listing/amazon',
          labelKey: 'legacyMenu.amzListing',
          icon: <FaAmazon size={20} />,
        },
        {
          key: '/portal/listing/etsy',
          labelKey: 'legacyMenu.etsyListing',
          icon: <FaEtsy size={20} />,
        },
      ],
    },
    {
      key: 'cost-centers',
      labelKey: 'legacyMenu.costCenters',
      icon: <TbHomeDollar size={20} />,
      children: [
        {
          key: '/portal/catalog/product-types',
          labelKey: 'shell.navigation.productTypes',
          icon: <TbPackages size={20} />,
        },
        {
          key: '/portal/catalog/templates',
          labelKey: 'shell.navigation.internalTemplates',
          icon: <BsFiletypePsd size={20} />,
        },
        {
          key: '/portal/mapping',
          labelKey: 'shell.navigation.mapping',
          icon: <RiTokenSwapLine size={20} />,
        },
      ],
    },
    {
      key: 'reports',
      labelKey: 'legacyMenu.reports',
      icon: <TbReport size={20} />,
      children: [
        {
          key: 'reports-order-cost',
          labelKey: 'legacyMenu.ordersCost',
          icon: <CgShoppingBag size={20} />,
          className: styles.reportChannel,
          children: [
            {
              key: '/portal/reports/amazon/order-cost',
              labelKey: 'legacyMenu.amazon',
              icon: <FaAmazon size={20} />,
              className: styles.reportChannelItem,
            },
            {
              key: '/portal/reports/etsy/order-cost',
              labelKey: 'legacyMenu.etsy',
              icon: <FaEtsy size={20} />,
              className: styles.reportChannelItem,
            },
          ],
        },
        {
          key: 'reports-ads',
          labelKey: 'legacyMenu.adsReport',
          icon: <RiAdvertisementLine size={20} />,
          className: styles.reportChannel,
          children: [
            {
              key: '/portal/reports/amazon/ads',
              labelKey: 'legacyMenu.amazon',
              icon: <FaAmazon size={20} />,
              className: styles.reportChannelItem,
            },
            {
              key: '/portal/reports/etsy/ads',
              labelKey: 'legacyMenu.etsy',
              icon: <FaEtsy size={20} />,
              className: styles.reportChannelItem,
            },
          ],
        },
        {
          key: 'reports-sales',
          labelKey: 'legacyMenu.saleReport',
          icon: <TbReportSearch size={20} />,
          className: styles.reportChannel,
          children: [
            {
              key: '/portal/reports/amazon/sales',
              labelKey: 'legacyMenu.amazon',
              icon: <FaAmazon size={20} />,
              className: styles.reportChannelItem,
            },
            {
              key: '/portal/reports/etsy/sales',
              labelKey: 'legacyMenu.etsy',
              icon: <FaEtsy size={20} />,
              className: styles.reportChannelItem,
            },
          ],
        },
      ],
    },
    {
      key: '/portal/monitoring',
      labelKey: 'legacyMenu.monitoring',
      icon: <AiOutlineFileSync size={20} />,
    },
    {
      key: 'configuration',
      labelKey: 'legacyMenu.configuration',
      icon: <RiSettings2Line size={20} />,
      children: [
        {
          key: '/portal/shops',
          labelKey: 'shell.navigation.shops',
          icon: <IoStorefrontOutline size={20} />,
        },
        {
          key: '/portal/integrations',
          labelKey: 'shell.navigation.integrations',
          icon: <BiExtension size={20} />,
        },
        {
          key: '/portal/shipments',
          labelKey: 'shell.navigation.shipments',
          icon: <LuTruck size={20} />,
        },
      ],
    },
  ],
  fulfillment: [
    {
      key: 'scale',
      labelKey: 'legacyMenu.scale',
      icon: <MdBalance size={20} />,
      children: [
        {
          key: '/portal/production/scale?salesChannelCode=AMAZON',
          labelKey: 'legacyMenu.amazonScale',
          icon: <FaAmazon size={20} />,
        },
        {
          key: '/portal/production/scale?salesChannelCode=ETSY',
          labelKey: 'legacyMenu.etsyScale',
          icon: <FaEtsy size={20} />,
        },
      ],
    },
    {
      key: 'qc',
      labelKey: 'legacyMenu.qc',
      icon: <TbBlender size={20} />,
      children: [
        {
          key: '/portal/production/qc?salesChannelCode=AMAZON',
          labelKey: 'legacyMenu.amazonQc',
          icon: <FaAmazon size={20} />,
        },
        {
          key: '/portal/production/qc?salesChannelCode=ETSY',
          labelKey: 'legacyMenu.etsyQc',
          icon: <FaEtsy size={20} />,
        },
      ],
    },
    {
      key: '/portal/work-scores',
      labelKey: 'shell.navigation.workScores',
      icon: <TbHomeStats size={20} />,
    },
    {
      key: '/portal/vendor-submissions',
      labelKey: 'shell.navigation.vendorSubmissions',
      icon: <TbBuildingFactory2 size={20} />,
    },
  ],
  design: [
    {
      key: '/portal/design',
      labelKey: 'portal.design.tasks',
      icon: <LuPalette size={20} />,
      children: [
        {
          key: '/portal/design/workspace',
          labelKey: 'portal.design.workspace',
          icon: <LuLayoutGrid size={20} />,
        },
        {
          key: '/portal/design/idea-tasks',
          labelKey: 'portal.design.ideaTasks',
          icon: <LuLightbulb size={20} />,
          className: styles.reportChannel,
          children: [
            {
              key: workspaceRouteLinks.designIdeaTasksBySalesChannel('amazon'),
              labelKey: 'portal.design.amazonTasks',
              icon: <FaAmazon size={20} />,
              className: styles.reportChannelItem,
            },
            {
              key: workspaceRouteLinks.designIdeaTasksBySalesChannel('etsy'),
              labelKey: 'portal.design.etsyTasks',
              icon: <FaEtsy size={20} />,
              className: styles.reportChannelItem,
            },
          ],
        },
        {
          key: '/portal/design/psd-tasks',
          labelKey: 'portal.design.psdTasks',
          icon: <BsFiletypePsd size={20} />,
          className: styles.reportChannel,
          children: [
            {
              key: workspaceRouteLinks.designPsdTasksBySalesChannel('amazon'),
              labelKey: 'portal.design.amazonTasks',
              icon: <FaAmazon size={20} />,
              className: styles.reportChannelItem,
            },
            {
              key: workspaceRouteLinks.designPsdTasksBySalesChannel('etsy'),
              labelKey: 'portal.design.etsyTasks',
              icon: <FaEtsy size={20} />,
              className: styles.reportChannelItem,
            },
          ],
        },
        {
          key: '/portal/design/png-tasks',
          labelKey: 'portal.design.pngTasks',
          icon: <IoImageOutline size={20} />,
          className: styles.reportChannel,
          children: [
            {
              key: workspaceRouteLinks.designPngTasksBySalesChannel('amazon'),
              labelKey: 'portal.design.amazonTasks',
              icon: <FaAmazon size={20} />,
              className: styles.reportChannelItem,
            },
            {
              key: workspaceRouteLinks.designPngTasksBySalesChannel('etsy'),
              labelKey: 'portal.design.etsyTasks',
              icon: <FaEtsy size={20} />,
              className: styles.reportChannelItem,
            },
          ],
        },
        {
          key: '/portal/design/scores',
          labelKey: 'portal.design.scores',
          icon: <TbAward size={20} />,
        },
      ],
    },
    {
      key: '/portal/design/files',
      labelKey: 'portal.design.psdFiles',
      icon: <BsFiletypePsd size={20} />,
    },
    {
      key: '/portal/media',
      labelKey: 'shell.navigation.media',
      icon: <IoImageOutline size={20} />,
    },
  ],
  vendor: [
    {
      key: '/portal/vendors',
      labelKey: 'shell.navigation.vendors',
      icon: <LuLayoutList size={20} />,
    },
    {
      key: '/portal/vendors?tab=products',
      labelKey: 'legacyMenu.vendorProducts',
      icon: <CgFileDocument size={20} />,
    },
    {
      key: '/portal/vendors?tab=integrations',
      labelKey: 'portal.vendors.tabs.integrations',
      icon: <BiExtension size={20} />,
    },
    {
      key: '/portal/vendors?tab=migration',
      labelKey: 'portal.vendors.tabs.migration',
      icon: <TbPackages size={20} />,
    },
  ],
  extensions: [
    {
      key: '/portal/extensions/clients',
      labelKey: 'legacyMenu.manageClients',
      icon: <MdOutlineConnectedTv size={20} />,
    },
    {
      key: '/portal/extensions/config-auto',
      labelKey: 'legacyMenu.configAuto',
      icon: <RiSettings2Line size={20} />,
    },
    {
      key: '/portal/extensions/log-manager',
      labelKey: 'legacyMenu.logManager',
      icon: <TbReport size={20} />,
    },
    {
      key: '/portal/extensions/tracking-etsy',
      labelKey: 'legacyMenu.trackingEtsy',
      icon: <FaEtsy size={20} />,
    },
    {
      key: '/portal/extensions/message-etsy',
      labelKey: 'legacyMenu.messageEtsy',
      icon: <FaEtsy size={20} />,
    },
    {
      key: '/portal/extensions/check-tracking',
      labelKey: 'legacyMenu.checkTracking',
      icon: <LuTruck size={20} />,
    },
  ],
}

const financeMenuItem: LegacyMenuItem = {
  key: 'finance',
  labelKey: 'shell.navigation.finance',
  icon: <DollarOutlined />,
  children: [
    {
      key: '/portal/finance/settlements',
      labelKey: 'finance.settlements.settlement',
      icon: <DollarOutlined />,
    },
  ],
}

function getDetailMenu(menuKey: string, financeVisible: boolean) {
  const items = detailMenus[menuKey]
  if (!items) return undefined
  return menuKey === 'sales' && financeVisible ? [...items, financeMenuItem] : items
}

function toMenuItems(
  items: LegacyMenuItem[],
  t: (key: string) => string,
  badgeCounts: Partial<Record<string, number>> = {},
): Parameters<typeof Menu>[0]['items'] {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon,
    className: item.className,
    label: (
      <span className={styles.menuLabel}>
        <span className={styles.menuLabelText}>
          {item.children ? t(item.labelKey) : <Link to={item.key}>{t(item.labelKey)}</Link>}
        </span>
        {(badgeCounts[item.key] ?? 0) > 0 ? (
          <span className={styles.menuBadge}>
            <Badge count={badgeCounts[item.key]} overflowCount={99} />
          </span>
        ) : null}
      </span>
    ),
    children: item.children ? toMenuItems(item.children, t, badgeCounts) : undefined,
  }))
}

function matchesRoute(key: string, pathname: string, search: string) {
  if (!key.startsWith('/')) return false
  if (
    key === '/portal/dashboard' &&
    (pathname === '/operations-dashboard' || pathname === '/foundation')
  ) {
    return true
  }
  if (key.includes('?')) return key === pathname + search
  return pathname === key || pathname.startsWith(`${key}/`)
}

function findOpenKeys(
  items: LegacyMenuItem[],
  pathname: string,
  search: string,
): string[] | undefined {
  for (const item of items) {
    const childKeys = item.children && findOpenKeys(item.children, pathname, search)
    if (childKeys) return [item.key, ...childKeys]
    if (matchesRoute(item.key, pathname, search)) return []
  }
}

function getRouteMenuState(
  pathname: string,
  search: string,
  bottomMenuGroups: Partial<Record<'portal' | 'hr' | 'system', NavigationGroup[]>>,
  financeVisible = false,
) {
  if (pathname === '/hr/dashboard') {
    return { menuKey: 'hr-dashboard', openKeys: [] }
  }
  if (
    pathname === '/portal/dashboard' ||
    pathname === '/operations-dashboard' ||
    pathname === '/foundation'
  ) {
    return { menuKey: 'dashboard', openKeys: [] }
  }

  for (const menuKey of Object.keys(detailMenus)) {
    const items = getDetailMenu(menuKey, financeVisible) ?? []
    const openKeys = findOpenKeys(items, pathname, search)
    if (openKeys) return { menuKey, openKeys }
  }

  const core = getCoreForPath(pathname)
  const menuKey = core === 'hr' ? 'hr' : core === 'system' ? 'system' : 'sales'
  const items =
    getDetailMenu(menuKey, financeVisible) ??
    (menuKey === 'hr' || menuKey === 'system'
      ? toLegacyMenuItems(bottomMenuGroups[menuKey] ?? [])
      : [])
  return { menuKey, openKeys: findOpenKeys(items, pathname, search) ?? [] }
}

function iconForNavigationItem(item: NavigationItem) {
  if (item.key.includes('dashboard')) return <LuLayoutDashboard />
  if (item.key.includes('schedule')) return <CalendarOutlined />
  if (item.key.includes('attendance')) return <ClockCircleOutlined />
  if (item.key.includes('request') || item.key.includes('approval')) return <FileTextOutlined />
  if (item.key.includes('payroll')) return <DollarOutlined />
  if (item.key.includes('member') || item.key === 'team') return <TeamOutlined />
  if (item.key === 'organization') return <ApartmentOutlined />
  if (item.path.startsWith('/auth')) return <SafetyCertificateOutlined />
  return <UserOutlined />
}

function iconForNavigationGroup(key: string) {
  if (key === 'dashboard') return <LuLayoutDashboard />
  if (key === 'personal') return <UserOutlined />
  if (key === 'team') return <TeamOutlined />
  if (key === 'operations') return <CalendarOutlined />
  if (key === 'payroll') return <DollarOutlined />
  if (key === 'monitoring') return <HistoryOutlined />
  if (key === 'configuration') return <SettingOutlined />
  return <UserOutlined />
}

function toLegacyMenuItems(groups: NavigationGroup[] = []): LegacyMenuItem[] {
  return groups
    .filter((group) => group.key !== 'dashboard')
    .flatMap((group) => {
      const items = group.items
        .filter((item) => item.path !== '/hr/dashboard' && item.path !== '/portal/dashboard')
        .map((item) => ({
          key: item.path,
          labelKey: item.labelKey,
          icon: iconForNavigationItem(item),
        }))
      if (group.standalone) return items
      return [
        {
          key: `legacy-group:${group.key}`,
          labelKey: group.labelKey,
          icon: iconForNavigationGroup(group.key),
          children: items,
        },
      ]
    })
}

function getInitialPortalMenu(pathname: string, search: string): string {
  for (const [menuKey, items] of Object.entries(detailMenus)) {
    if (findOpenKeys(items, pathname, search) !== undefined) {
      return menuKey
    }
  }
  const saved = localStorage.getItem('lng:last-portal-menu')
  if (saved && detailMenus[saved]) {
    return saved
  }
  return 'sales'
}

export function LegacySidebar({
  collapsed,
  onCollapsedChange,
  bottomMenus: bottomMenuGroups = emptyBottomMenuGroups,
  financeVisible = false,
}: {
  collapsed: boolean
  onCollapsedChange: (value: boolean) => void
  bottomMenus?: Partial<Record<'portal' | 'hr' | 'system', NavigationGroup[]>>
  accountLabel?: string
  financeVisible?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const orderSummary = useOrderSummaryQuery({ page: 1, limit: 1 })
  const designSummary = useDesignSummaryQuery({})
  const productionQueueCounts = useProductionQueueCountsQuery({})
  const [activeMenu, setActiveMenu] = useState(
    () =>
      getRouteMenuState(location.pathname, location.search, bottomMenuGroups, financeVisible)
        .menuKey,
  )
  const [lastPortalMenu, setLastPortalMenu] = useState<string>(() =>
    getInitialPortalMenu(location.pathname, location.search),
  )
  const [activeMode, setActiveMode] = useState<'portal' | 'hr'>(() => {
    const isHr =
      location.pathname.startsWith('/hr') || location.pathname.startsWith('/organization')
    return isHr ? 'hr' : 'portal'
  })
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    const routeState = getRouteMenuState(
      location.pathname,
      location.search,
      bottomMenuGroups,
      financeVisible,
    )
    return routeState.openKeys
  })
  useEffect(() => {
    const routeState = getRouteMenuState(
      location.pathname,
      location.search,
      bottomMenuGroups,
      financeVisible,
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveMenu(routeState.menuKey)
    const core = getCoreForPath(location.pathname)
    if (core === 'hr') {
      setActiveMode('hr')
    } else if (core === 'portal') {
      setActiveMode('portal')
      if (routeState.menuKey !== 'dashboard' && detailMenus[routeState.menuKey]) {
        setLastPortalMenu(routeState.menuKey)
        localStorage.setItem('lng:last-portal-menu', routeState.menuKey)
      }
    }
    // When entering dashboard, preserve previous openKeys so the most recent menu state is kept
    if (routeState.menuKey !== 'dashboard' && routeState.menuKey !== 'hr-dashboard') {
      setOpenKeys(routeState.openKeys)
    }
  }, [bottomMenuGroups, financeVisible, location.pathname, location.search])
  const activeDetailMenu =
    activeMenu === 'system'
      ? toLegacyMenuItems(bottomMenuGroups.system ?? [])
      : activeMode === 'hr'
        ? toLegacyMenuItems(bottomMenuGroups.hr ?? [])
        : (getDetailMenu(
            activeMenu === 'dashboard' ? lastPortalMenu : activeMenu,
            financeVisible,
          ) ??
          getDetailMenu(lastPortalMenu, financeVisible) ??
          detailMenus.sales)
  const badgeCounts = {
    [workspaceRouteLinks.orders]: orderSummary.data?.tabCounts.NEW,
    '/portal/design': designSummary.data?.unassigned,
    '/portal/production/blocked': productionQueueCounts.data?.blocked,
  }
  const menuItems = toMenuItems(activeDetailMenu, t, badgeCounts)

  const handleSwitchMode = (mode: 'portal' | 'hr') => {
    if (mode === activeMode) return
    setActiveMode(mode)
    if (collapsed) {
      onCollapsedChange(false)
    }
    if (mode === 'hr') {
      const remembered = localStorage.getItem('lng:last-route:hr')
      const target =
        (remembered &&
        remembered !== '/hr' &&
        remembered !== '/hr/' &&
        (remembered.startsWith('/hr/') || remembered.startsWith('/organization'))
          ? remembered
          : undefined) ||
        getRememberedCoreRoute('hr', bottomMenuGroups.hr ?? []) ||
        bottomMenuGroups.hr?.[0]?.items?.[0]?.path ||
        '/hr/dashboard'
      const targetRouteState = getRouteMenuState(target, '', bottomMenuGroups, financeVisible)
      setActiveMenu(targetRouteState.menuKey)
      if (targetRouteState.menuKey !== 'hr-dashboard') {
        setOpenKeys(targetRouteState.openKeys)
      }
      navigate(target)
    } else {
      const remembered = localStorage.getItem('lng:last-route:portal')
      const target =
        (remembered &&
          (remembered.startsWith('/portal') || remembered.startsWith('/operations-dashboard')
            ? remembered
            : undefined)) ||
        getRememberedCoreRoute('portal', bottomMenuGroups.portal ?? []) ||
        '/portal/dashboard'
      const targetRouteState = getRouteMenuState(target, '', bottomMenuGroups, financeVisible)
      setActiveMenu(targetRouteState.menuKey)
      if (targetRouteState.menuKey !== 'dashboard') {
        setOpenKeys(targetRouteState.openKeys)
      }
      navigate(target)
    }
  }

  const handleLogoClick = () => {
    if (collapsed) {
      onCollapsedChange(false)
    }
    const target = activeMode === 'hr' ? '/hr/dashboard' : '/portal/dashboard'
    navigate(target)
  }

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
      aria-label={t('shell.navigation.cores')}
    >
      <div className={styles.identity}>
        <div
          className={styles.logo}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onClick={handleLogoClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleLogoClick()
            }
          }}
          aria-label={t('app.name', { defaultValue: 'LNG Web' })}
          title={t('shell.navigation.dashboard', { defaultValue: 'Dashboard' })}
        >
          <Image src="/assets/images/lng-logo.jpg" preview={false} alt={t('app.name')} />
        </div>
        {!collapsed && (
          <div className={styles.coreSwitch} role="group" aria-label="Core Switcher">
            <button
              type="button"
              aria-label="Switch to Portal"
              className={
                activeMode === 'portal' ? styles.coreSwitchActive : styles.coreSwitchOption
              }
              onClick={() => handleSwitchMode('portal')}
            >
              {t('shell.cores.portal', { defaultValue: 'Portal' })}
            </button>
            <button
              type="button"
              aria-label="Switch to HR"
              className={activeMode === 'hr' ? styles.coreSwitchActive : styles.coreSwitchOption}
              onClick={() => handleSwitchMode('hr')}
            >
              {t('shell.cores.hr', { defaultValue: 'HR' })}
            </button>
          </div>
        )}
      </div>
      <Layout className={styles.menuLayout}>
        <div className={styles.rail}>
          <nav className={styles.railMenu} aria-label={t('shell.navigation.cores')}>
            {collapsed && (
              <Tooltip
                title={
                  activeMode === 'portal'
                    ? t('shell.switchToHr', { defaultValue: 'Switch to HR' })
                    : t('shell.switchToPortal', { defaultValue: 'Switch to Portal' })
                }
                placement="right"
              >
                <button
                  type="button"
                  aria-label={activeMode === 'portal' ? 'Switch to HR' : 'Switch to Portal'}
                  className={styles.compactCoreSwitch}
                  onClick={() => handleSwitchMode(activeMode === 'portal' ? 'hr' : 'portal')}
                >
                  {activeMode === 'hr' ? 'HR' : 'PORTAL'}
                </button>
              </Tooltip>
            )}
            {(activeMode === 'hr' ? hrTopMenus : topMenus).map((item) => (
              <button
                key={item.key}
                className={item.key === activeMenu ? styles.railButtonActive : styles.railButton}
                type="button"
                aria-label={t(item.labelKey)}
                onClick={() => {
                  setActiveMenu(item.key)
                  if (
                    item.key !== 'dashboard' &&
                    item.key !== 'hr-dashboard' &&
                    detailMenus[item.key]
                  ) {
                    setLastPortalMenu(item.key)
                    localStorage.setItem('lng:last-portal-menu', item.key)
                  }
                  if (collapsed) {
                    onCollapsedChange(false)
                  }
                  if (item.key === 'sales') {
                    setOpenKeys((prev) =>
                      Array.from(new Set([...prev, workspaceRouteLinks.orders])),
                    )
                  }
                  if (item.path) {
                    navigate(item.path)
                  } else if (item.key === 'hr' && location.pathname === '/hr/dashboard') {
                    const remembered = localStorage.getItem('lng:last-route:hr')
                    const target =
                      (remembered &&
                      remembered !== '/hr' &&
                      remembered !== '/hr/' &&
                      remembered !== '/hr/dashboard' &&
                      (remembered.startsWith('/hr/') || remembered.startsWith('/organization'))
                        ? remembered
                        : undefined) ||
                      bottomMenuGroups.hr?.find((g) => g.key !== 'dashboard')?.items?.[0]?.path ||
                      '/hr/me'
                    navigate(target)
                  }
                }}
              >
                {item.icon}
              </button>
            ))}
            <div className={styles.railSpacer} />
            {bottomMenus.map((item) => (
              <button
                key={item.key}
                className={item.key === activeMenu ? styles.railButtonActive : styles.railButton}
                type="button"
                aria-label={t(item.labelKey)}
                onClick={() => {
                  setActiveMenu(item.key)
                  if (collapsed) {
                    onCollapsedChange(false)
                  }
                  if (item.path) {
                    navigate(item.path)
                  }
                }}
              >
                {item.icon}
              </button>
            ))}
          </nav>
        </div>
        <Sider className={styles.detailSider} width={202} collapsedWidth={0} collapsed={collapsed}>
          <Menu
            className={styles.detailMenu}
            mode="inline"
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            selectedKeys={[location.pathname + location.search]}
            items={menuItems}
            onClick={({ key }) => navigate(String(key))}
          />
        </Sider>
      </Layout>
      <button
        className={styles.collapseButton}
        type="button"
        aria-label={t(collapsed ? 'shell.expand' : 'shell.collapse')}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        {collapsed ? <FaAnglesRight size={15} /> : <FaAnglesLeft size={15} />}
      </button>
    </aside>
  )
}
