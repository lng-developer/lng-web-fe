import { type ReactNode, useEffect, useMemo, useState } from 'react'
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
  LuLayoutList,
  LuLightbulb,
  LuNotebook,
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
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { useDesignSummaryQuery } from '@/features/portal/design/hooks/useDesignTasksQuery'
import { useOrderSummaryQuery } from '@/features/portal/orders/hooks/useOrderSummaryQuery'
import { useProductionQueueCountsQuery } from '@/features/portal/production/hooks/useProductionTasksQuery'

import {
  canReadHrDashboard,
  canReadOperationsDashboard,
  effectivePermissions,
  getCoreForPath,
  hasExplicitHrAccess,
  type NavigationGroup,
  type NavigationItem,
} from './appNavigation'
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
      key: '/portal/design/idea-tasks',
      labelKey: 'portal.design.ideaTasks',
      icon: <LuLightbulb size={20} />,
      children: [
        {
          key: workspaceRouteLinks.designIdeaTasksBySalesChannel('amazon'),
          labelKey: 'portal.design.amazonTasks',
          icon: <FaAmazon size={20} />,
        },
        {
          key: workspaceRouteLinks.designIdeaTasksBySalesChannel('etsy'),
          labelKey: 'portal.design.etsyTasks',
          icon: <FaEtsy size={20} />,
        },
      ],
    },
    {
      key: '/portal/design/psd-tasks',
      labelKey: 'portal.design.psdTasks',
      icon: <BsFiletypePsd size={20} />,
      children: [
        {
          key: workspaceRouteLinks.designPsdTasksBySalesChannel('amazon'),
          labelKey: 'portal.design.amazonTasks',
          icon: <FaAmazon size={20} />,
        },
        {
          key: workspaceRouteLinks.designPsdTasksBySalesChannel('etsy'),
          labelKey: 'portal.design.etsyTasks',
          icon: <FaEtsy size={20} />,
        },
      ],
    },
    {
      key: '/portal/design/png-tasks',
      labelKey: 'portal.design.pngTasks',
      icon: <IoImageOutline size={20} />,
      children: [
        {
          key: workspaceRouteLinks.designPngTasksBySalesChannel('amazon'),
          labelKey: 'portal.design.amazonTasks',
          icon: <FaAmazon size={20} />,
        },
        {
          key: workspaceRouteLinks.designPngTasksBySalesChannel('etsy'),
          labelKey: 'portal.design.etsyTasks',
          icon: <FaEtsy size={20} />,
        },
      ],
    },
    {
      key: '/portal/design/scores',
      labelKey: 'portal.design.scores',
      icon: <TbAward size={20} />,
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

const adminRoles = new Set(['SUPER_ADMIN', 'SUPER ADMIN', 'ADMIN'])

function getPermissionsSet(account?: CurrentAccount): Set<string> | null {
  if (!account) return null
  const isAdmin = account.roles?.some((role) => adminRoles.has(role.toUpperCase()))
  if (isAdmin) return null
  return effectivePermissions(account)
}

function canAccessItemDirectly(
  item: LegacyMenuItem,
  permissions: Set<string>,
  financeVisible: boolean,
): boolean {
  const key = item.key

  if (key === 'finance' || key.startsWith('/portal/finance')) {
    return financeVisible
  }

  if (key === workspaceRouteLinks.orders || key.startsWith('/portal/orders')) {
    return permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')
  }

  if (key === workspaceRouteLinks.teamTasks || key === '/portal/team-tasks') {
    return permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')
  }

  if (key === 'listing' || key.startsWith('/portal/listing')) {
    return permissions.has('CATALOG:READ') || permissions.has('CATALOG:WRITE')
  }

  if (key === '/portal/catalog/product-types' || key === '/portal/catalog/templates') {
    return permissions.has('CATALOG:READ') || permissions.has('CATALOG:WRITE')
  }

  if (key.startsWith('/portal/catalog')) {
    return permissions.has('CATALOG:READ') || permissions.has('CATALOG:WRITE')
  }

  if (key === '/portal/mapping' || key.startsWith('/portal/mapping')) {
    return (
      permissions.has('MAPPING:READ') ||
      permissions.has('MAPPING:WRITE') ||
      permissions.has('CATALOG:READ') ||
      permissions.has('CATALOG:WRITE')
    )
  }

  if (key === 'reports' || key.startsWith('reports-') || key.startsWith('/portal/reports')) {
    return permissions.has('REPORTS:READ')
  }

  if (
    key === '/portal/monitoring' ||
    key.startsWith('/portal/monitoring') ||
    key.startsWith('/auth/monitoring') ||
    key.startsWith('/auth/audit-log') ||
    key.startsWith('/portal/audit')
  ) {
    return permissions.has('AUDIT:READ')
  }

  if (key === '/portal/shops' || key.startsWith('/portal/shops')) {
    return permissions.has('SHOPS:READ')
  }

  if (key === '/portal/integrations' || key.startsWith('/portal/integrations')) {
    return (
      permissions.has('ORDERS:READ') ||
      permissions.has('ORDERS:WRITE') ||
      permissions.has('CATALOG:READ') ||
      permissions.has('CATALOG:WRITE')
    )
  }

  if (key === '/portal/shipments' || key.startsWith('/portal/shipments')) {
    return permissions.has('SHIPMENTS:READ') || permissions.has('SHIPMENTS:WRITE')
  }

  if (
    key === 'scale' ||
    key.startsWith('/portal/production/scale') ||
    key === 'qc' ||
    key.startsWith('/portal/production/qc') ||
    key.startsWith('/portal/production')
  ) {
    return ['PRODUCTION:READ', 'PRODUCTION:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW'].some((p) =>
      permissions.has(p),
    )
  }

  if (key === '/portal/work-scores' || key.startsWith('/portal/work-scores')) {
    return ['WORK_SCORES:READ', 'WORK_SCORES:ADJUST', 'DESIGN:WORK'].some((p) => permissions.has(p))
  }

  if (key === '/portal/vendor-submissions' || key.startsWith('/portal/vendor-submissions')) {
    return permissions.has('VENDOR_SUBMISSIONS:READ')
  }

  if (
    key === '/portal/design/idea-tasks' ||
    key.startsWith('/portal/design/idea') ||
    key === '/portal/design/psd-tasks' ||
    key.startsWith('/portal/design/psd') ||
    key === '/portal/design/png-tasks' ||
    key.startsWith('/portal/design/png') ||
    key === '/portal/design/files' ||
    key.startsWith('/portal/design/files')
  ) {
    return ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW'].some((p) =>
      permissions.has(p),
    )
  }

  if (key === '/portal/design/scores' || key.startsWith('/portal/design/scores')) {
    return ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:REVIEW'].some((p) => permissions.has(p))
  }

  if (key === '/portal/media' || key.startsWith('/portal/media')) {
    return permissions.has('MEDIA:READ')
  }

  if (key === '/portal/vendors' || key.startsWith('/portal/vendors')) {
    return permissions.has('VENDORS:READ') || permissions.has('VENDORS:WRITE')
  }

  if (key.startsWith('/portal/extensions')) {
    return permissions.has('ORDERS:WRITE') || permissions.has('CATALOG:WRITE')
  }

  if (key === 'cost-centers' || key === 'configuration') {
    return true
  }

  return true
}

function filterLegacyMenuItems(
  items: LegacyMenuItem[],
  permissions: Set<string> | null,
  financeVisible: boolean,
): LegacyMenuItem[] {
  if (!permissions) return items

  const result: LegacyMenuItem[] = []
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      const filteredChildren = filterLegacyMenuItems(item.children, permissions, financeVisible)
      if (filteredChildren.length > 0 && canAccessItemDirectly(item, permissions, financeVisible)) {
        result.push({
          ...item,
          children: filteredChildren,
        })
      }
    } else if (canAccessItemDirectly(item, permissions, financeVisible)) {
      result.push(item)
    }
  }
  return result
}

function getDetailMenu(menuKey: string, financeVisible: boolean, permissions?: Set<string> | null) {
  const items = detailMenus[menuKey]
  if (!items) return undefined
  const allItems = menuKey === 'sales' && financeVisible ? [...items, financeMenuItem] : items
  return filterLegacyMenuItems(allItems, permissions ?? null, financeVisible)
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
  permissions?: Set<string> | null,
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
    const items = getDetailMenu(menuKey, financeVisible, permissions) ?? []
    const openKeys = findOpenKeys(items, pathname, search)
    if (openKeys) return { menuKey, openKeys }
  }

  const core = getCoreForPath(pathname)
  const menuKey = core === 'hr' ? 'hr' : core === 'system' ? 'system' : 'sales'
  const items =
    getDetailMenu(menuKey, financeVisible, permissions) ??
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
      if (!items.length) return []
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

function getInitialPortalMenu(
  pathname: string,
  search: string,
  permissions?: Set<string> | null,
  financeVisible = false,
): string {
  for (const [menuKey, items] of Object.entries(detailMenus)) {
    const filtered = filterLegacyMenuItems(items, permissions ?? null, financeVisible)
    if (findOpenKeys(filtered, pathname, search) !== undefined) {
      return menuKey
    }
  }
  const saved = localStorage.getItem('lng:last-portal-menu')
  if (saved && detailMenus[saved]) {
    const savedFiltered = getDetailMenu(saved, financeVisible, permissions)
    if (savedFiltered && savedFiltered.length > 0) {
      return saved
    }
  }
  for (const menuKey of ['sales', 'fulfillment', 'design', 'vendor', 'extensions']) {
    const filtered = getDetailMenu(menuKey, financeVisible, permissions)
    if (filtered && filtered.length > 0) {
      return menuKey
    }
  }
  return 'sales'
}

export function LegacySidebar({
  collapsed,
  onCollapsedChange,
  bottomMenus: bottomMenuGroups = emptyBottomMenuGroups,
  financeVisible = false,
  account,
}: {
  collapsed: boolean
  onCollapsedChange: (value: boolean) => void
  bottomMenus?: Partial<Record<'portal' | 'hr' | 'system', NavigationGroup[]>>
  accountLabel?: string
  financeVisible?: boolean
  account?: CurrentAccount
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const orderSummary = useOrderSummaryQuery({ page: 1, limit: 1 })
  const designSummary = useDesignSummaryQuery({})
  const productionQueueCounts = useProductionQueueCountsQuery({})

  const permissions = useMemo(() => getPermissionsSet(account), [account])

  const [activeMenu, setActiveMenu] = useState(
    () =>
      getRouteMenuState(
        location.pathname,
        location.search,
        bottomMenuGroups,
        financeVisible,
        permissions,
      ).menuKey,
  )
  const [lastPortalMenu, setLastPortalMenu] = useState<string>(() =>
    getInitialPortalMenu(location.pathname, location.search, permissions, financeVisible),
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
      permissions,
    )
    return routeState.openKeys
  })

  useEffect(() => {
    const routeState = getRouteMenuState(
      location.pathname,
      location.search,
      bottomMenuGroups,
      financeVisible,
      permissions,
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
  }, [bottomMenuGroups, financeVisible, location.pathname, location.search, permissions])

  const visibleTopMenus = useMemo(() => {
    const list = activeMode === 'hr' ? hrTopMenus : topMenus
    if (!permissions) return list
    return list.filter((item) => {
      if (item.key === 'dashboard') {
        return canReadOperationsDashboard(permissions)
      }
      if (item.key === 'hr-dashboard') {
        return canReadHrDashboard(permissions)
      }
      if (item.key === 'hr') {
        return (bottomMenuGroups.hr ?? []).length > 0
      }
      const children = getDetailMenu(item.key, financeVisible, permissions)
      return Boolean(children && children.length > 0)
    })
  }, [activeMode, bottomMenuGroups.hr, financeVisible, permissions])

  const visibleBottomMenus = useMemo(() => {
    if (!permissions) return bottomMenus
    return bottomMenus.filter((item) => {
      if (item.key === 'system') {
        return (bottomMenuGroups.system ?? []).length > 0
      }
      return true
    })
  }, [bottomMenuGroups.system, permissions])

  const hasHrAccess = useMemo(() => {
    if (!permissions) return true
    return hasExplicitHrAccess(permissions) || (bottomMenuGroups.hr ?? []).length > 0
  }, [bottomMenuGroups.hr, permissions])

  const currentPortalMenu = activeMenu === 'dashboard' ? lastPortalMenu : activeMenu
  const activeDetailMenu =
    activeMenu === 'system'
      ? toLegacyMenuItems(bottomMenuGroups.system ?? [])
      : activeMode === 'hr'
        ? toLegacyMenuItems(bottomMenuGroups.hr ?? [])
        : (getDetailMenu(currentPortalMenu, financeVisible, permissions) ??
          getDetailMenu(lastPortalMenu, financeVisible, permissions) ??
          [])
  const badgeCounts = {
    [workspaceRouteLinks.orders]: orderSummary.data?.tabCounts.NEW,
    '/portal/design': designSummary.data?.unassigned,
    '/portal/design/idea-tasks': designSummary.data?.unassigned,
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
        (remembered && (remembered.startsWith('/hr') || remembered.startsWith('/organization'))
          ? remembered
          : undefined) ||
        getRememberedCoreRoute('hr', bottomMenuGroups.hr ?? []) ||
        bottomMenuGroups.hr?.[0]?.items?.[0]?.path ||
        '/hr/dashboard'
      const targetRouteState = getRouteMenuState(
        target,
        '',
        bottomMenuGroups,
        financeVisible,
        permissions,
      )
      setActiveMenu(targetRouteState.menuKey)
      if (targetRouteState.menuKey !== 'hr-dashboard') {
        setOpenKeys(targetRouteState.openKeys)
      }
      navigate(target)
    } else {
      const remembered = localStorage.getItem('lng:last-route:portal')
      const target =
        (remembered &&
        (remembered.startsWith('/portal') || remembered.startsWith('/operations-dashboard'))
          ? remembered
          : undefined) ||
        getRememberedCoreRoute('portal', bottomMenuGroups.portal ?? []) ||
        (permissions && !canReadOperationsDashboard(permissions)
          ? bottomMenuGroups.portal?.[0]?.items?.[0]?.path || '/portal/orders'
          : '/portal/dashboard')
      const targetRouteState = getRouteMenuState(
        target,
        '',
        bottomMenuGroups,
        financeVisible,
        permissions,
      )
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
    if (activeMode === 'hr') {
      const target =
        permissions && !canReadHrDashboard(permissions)
          ? bottomMenuGroups.hr?.[0]?.items?.[0]?.path || '/hr/me'
          : '/hr/dashboard'
      navigate(target)
    } else {
      const canAccessDashboard = !permissions || canReadOperationsDashboard(permissions)
      const target = canAccessDashboard
        ? '/portal/dashboard'
        : bottomMenuGroups.portal?.[0]?.items?.[0]?.path || '/portal/orders'
      navigate(target)
    }
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
        {!collapsed && hasHrAccess && (
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
            {collapsed && hasHrAccess && (
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
            {visibleTopMenus.map((item) => (
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
                      remembered !== '/hr/dashboard' &&
                      (remembered.startsWith('/hr') || remembered.startsWith('/organization'))
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
            {visibleBottomMenus.map((item) => (
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
