import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiOutlineFileSync } from 'react-icons/ai'
import { AiOutlineFundView } from 'react-icons/ai'
import { BiExtension } from 'react-icons/bi'
import { BiCubeAlt } from 'react-icons/bi'
import { BsFiletypePsd } from 'react-icons/bs'
import { CgShoppingBag } from 'react-icons/cg'
import { CgFileDocument } from 'react-icons/cg'
import { FaAmazon, FaEtsy, FaShopify } from 'react-icons/fa'
import { FaAnglesLeft, FaAnglesRight } from 'react-icons/fa6'
import { FcRating } from 'react-icons/fc'
import { GrDocumentConfig } from 'react-icons/gr'
import { HiOutlineBuildingStorefront } from 'react-icons/hi2'
import { HiOutlineKey } from 'react-icons/hi2'
import { IoStorefrontOutline } from 'react-icons/io5'
import { IoImageOutline } from 'react-icons/io5'
import { LiaReact } from 'react-icons/lia'
import { LuBox, LuBrain, LuLayoutList, LuNotebook, LuTruck } from 'react-icons/lu'
import { MdBalance, MdOutlineConnectedTv, MdOutlinePendingActions } from 'react-icons/md'
import {
  RiAdminLine,
  RiAdvertisementLine,
  RiErrorWarningLine,
  RiPaletteLine,
  RiSettings2Line,
  RiTokenSwapLine,
} from 'react-icons/ri'
import {
  TbBlender,
  TbBuildingFactory2,
  TbBuildingStore,
  TbCookie,
  TbHomeDollar,
  TbHomeStats,
  TbPackages,
  TbReport,
  TbReportSearch,
  TbUsersGroup,
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
import { Dropdown, Image, Layout, Menu, Popover } from 'antd'

import { workspaceRouteLinks } from '@/app/router/workspaceRoutes'

import type { NavigationGroup, NavigationItem } from './appNavigation'
import styles from './LegacySidebar.module.scss'

const { Sider } = Layout

type LegacyMenuItem = {
  key: string
  labelKey: string
  icon: ReactNode
  children?: LegacyMenuItem[]
}

const topMenus = [
  { key: 'sales', labelKey: 'legacyMenu.sales', icon: <TbHomeStats size={20} /> },
  { key: 'fulfillment', labelKey: 'legacyMenu.fulfillment', icon: <MdBalance size={20} /> },
  { key: 'design', labelKey: 'legacyMenu.design', icon: <RiPaletteLine size={20} /> },
  { key: 'vendor', labelKey: 'legacyMenu.vendor', icon: <HiOutlineBuildingStorefront size={20} /> },
  { key: 'extensions', labelKey: 'legacyMenu.extensions', icon: <BiExtension size={20} /> },
]

const bottomMenus = [
  { key: 'hr', labelKey: 'shell.cores.hr', icon: <TeamOutlined /> },
  { key: 'system', labelKey: 'legacyMenu.setting', icon: <SettingOutlined /> },
]

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
          key: '/portal/cost-centers/config',
          labelKey: 'legacyMenu.config',
          icon: <GrDocumentConfig size={20} />,
        },
        {
          key: '/portal/cost-centers/product-types',
          labelKey: 'legacyMenu.productTypes',
          icon: <TbPackages size={20} />,
        },
        {
          key: '/portal/cost-centers/mapping',
          labelKey: 'legacyMenu.mapping',
          icon: <RiTokenSwapLine size={20} />,
        },
        {
          key: '/portal/cost-centers/group-standards',
          labelKey: 'legacyMenu.groupStandards',
          icon: <TbUsersGroup size={20} />,
        },
      ],
    },
    {
      key: 'reports',
      labelKey: 'legacyMenu.reports',
      icon: <TbReport size={20} />,
      children: [
        {
          key: 'reports-amazon',
          labelKey: 'legacyMenu.amazon',
          icon: <FaAmazon size={20} />,
          children: [
            {
              key: '/portal/reports/amazon/order-cost',
              labelKey: 'legacyMenu.ordersCost',
              icon: <CgShoppingBag size={20} />,
            },
            {
              key: '/portal/reports/amazon/ads',
              labelKey: 'legacyMenu.adsReport',
              icon: <RiAdvertisementLine size={20} />,
            },
            {
              key: '/portal/reports/amazon/sales',
              labelKey: 'legacyMenu.saleReport',
              icon: <TbReportSearch size={20} />,
            },
          ],
        },
        {
          key: 'reports-etsy',
          labelKey: 'legacyMenu.etsy',
          icon: <FaEtsy size={20} />,
          children: [
            {
              key: '/portal/reports/etsy/order-cost',
              labelKey: 'legacyMenu.etsyOrdersCost',
              icon: <CgShoppingBag size={20} />,
            },
            {
              key: '/portal/reports/etsy/ads',
              labelKey: 'legacyMenu.adsEtsy',
              icon: <RiAdvertisementLine size={20} />,
            },
            {
              key: '/portal/reports/etsy/sales',
              labelKey: 'legacyMenu.etsySaleReport',
              icon: <TbReportSearch size={20} />,
            },
          ],
        },
      ],
    },
    {
      key: 'monitoring',
      labelKey: 'legacyMenu.monitoring',
      icon: <AiOutlineFileSync size={20} />,
      children: [
        {
          key: '/portal/monitoring/order-lifecycle',
          labelKey: 'legacyMenu.orderLifecycle',
          icon: <AiOutlineFileSync size={20} />,
        },
        {
          key: '/portal/monitoring/order-missing-sync',
          labelKey: 'legacyMenu.orderMissingSync',
          icon: <AiOutlineFileSync size={20} />,
        },
      ],
    },
    {
      key: 'configuration',
      labelKey: 'legacyMenu.configuration',
      icon: <RiSettings2Line size={20} />,
      children: [
        {
          key: '/portal/configuration/manage-stores',
          labelKey: 'legacyMenu.manageStores',
          icon: <IoStorefrontOutline size={20} />,
        },
        {
          key: '/portal/configuration/sku-mapping',
          labelKey: 'legacyMenu.skuMapping',
          icon: <CgShoppingBag size={20} />,
        },
        {
          key: '/portal/configuration/cookies',
          labelKey: 'legacyMenu.cookies',
          icon: <TbCookie size={20} />,
        },
        {
          key: '/portal/configuration/tm-keywords',
          labelKey: 'legacyMenu.tmKeywords',
          icon: <HiOutlineKey size={20} />,
        },
        {
          key: '/portal/configuration/account',
          labelKey: 'legacyMenu.account',
          icon: <RiAdminLine size={20} />,
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
      key: '/portal/fulfillment/working-status',
      labelKey: 'legacyMenu.workingStatus',
      icon: <TbHomeStats size={20} />,
    },
    {
      key: 'fulfillment-reports',
      labelKey: 'legacyMenu.reports',
      icon: <MdBalance size={20} />,
      children: [
        {
          key: '/portal/fulfillment/reports/vendor',
          labelKey: 'legacyMenu.vendorFulfillment',
          icon: <TbBuildingFactory2 size={20} />,
        },
        {
          key: '/portal/fulfillment/reports/vendor-pending',
          labelKey: 'legacyMenu.vendorPending',
          icon: <MdOutlinePendingActions size={20} />,
        },
        {
          key: '/portal/fulfillment/reports/lng-pending',
          labelKey: 'legacyMenu.lngPending',
          icon: <LiaReact size={20} />,
        },
        {
          key: '/portal/fulfillment/reports/working-results',
          labelKey: 'legacyMenu.workingResults',
          icon: <TbReport size={20} />,
        },
      ],
    },
  ],
  design: [
    {
      key: '/portal/design/idea-tasks',
      labelKey: 'legacyMenu.ideaTasks',
      icon: <LuBrain size={20} />,
    },
    {
      key: '/portal/design/psd-tasks',
      labelKey: 'legacyMenu.psdTasks',
      icon: <BsFiletypePsd size={20} />,
    },
    {
      key: '/portal/design/png-tasks',
      labelKey: 'legacyMenu.pngTasks',
      icon: <IoImageOutline size={20} />,
    },
    {
      key: '/portal/design/embroider-listing',
      labelKey: 'legacyMenu.embroiderListing',
      icon: <LuLayoutList size={20} />,
    },
    {
      key: '/portal/design/product-types',
      labelKey: 'legacyMenu.designProductTypes',
      icon: <TbPackages size={20} />,
    },
    {
      key: '/portal/design/points-dashboard',
      labelKey: 'legacyMenu.pointsDashboard',
      icon: <AiOutlineFundView size={20} />,
    },
  ],
  vendor: [
    {
      key: '/portal/vendor/list',
      labelKey: 'legacyMenu.listVendor',
      icon: <LuLayoutList size={20} />,
    },
    {
      key: '/portal/vendor/token',
      labelKey: 'legacyMenu.tokenVendor',
      icon: <RiErrorWarningLine size={20} />,
    },
    {
      key: '/portal/vendor/products',
      labelKey: 'legacyMenu.vendorProducts',
      icon: <CgFileDocument size={20} />,
    },
    {
      key: '/portal/vendor/store-fulfill',
      labelKey: 'legacyMenu.storeFulfill',
      icon: <TbBuildingStore size={20} />,
    },
    {
      key: '/portal/vendor/design-product-types',
      labelKey: 'legacyMenu.designProductTypes',
      icon: <BiCubeAlt size={20} />,
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

function toMenuItems(
  items: LegacyMenuItem[],
  t: (key: string) => string,
): Parameters<typeof Menu>[0]['items'] {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.children ? t(item.labelKey) : <Link to={item.key}>{t(item.labelKey)}</Link>,
    children: item.children ? toMenuItems(item.children, t) : undefined,
  }))
}

function iconForNavigationItem(item: NavigationItem) {
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
  if (key === 'dashboard') return <UserOutlined />
  if (key === 'personal') return <UserOutlined />
  if (key === 'team') return <TeamOutlined />
  if (key === 'operations') return <CalendarOutlined />
  if (key === 'payroll') return <DollarOutlined />
  if (key === 'monitoring') return <HistoryOutlined />
  if (key === 'configuration') return <SettingOutlined />
  return <UserOutlined />
}

function toLegacyMenuItems(groups: NavigationGroup[]): LegacyMenuItem[] {
  return groups.flatMap((group) => {
    const items = group.items.map((item) => ({
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

export function LegacySidebar({
  collapsed,
  onCollapsedChange,
  bottomMenus: bottomMenuGroups = { hr: [], system: [] },
}: {
  collapsed: boolean
  onCollapsedChange: (value: boolean) => void
  bottomMenus?: Record<'hr' | 'system', NavigationGroup[]>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeMenu, setActiveMenu] = useState('sales')
  const [openDropdown, setOpenDropdown] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    if (
      location.pathname === workspaceRouteLinks.orders &&
      location.search.includes('salesChannelCode=')
    )
      return [workspaceRouteLinks.orders]
    if (location.pathname.startsWith('/portal/listing')) return ['listing']
    return []
  })
  const activeDetailMenu =
    detailMenus[activeMenu] ??
    toLegacyMenuItems(bottomMenuGroups[activeMenu as 'hr' | 'system'] ?? [])
  const menuItems = toMenuItems(activeDetailMenu, t)

  const popover = (menuKey: string) => (
    <div className={styles.popoverMenu}>
      <div className={styles.popoverTitle}>
        {t(topMenus.find((item) => item.key === menuKey)?.labelKey ?? '')}
      </div>
      <Menu
        className={styles.detailMenu}
        mode="vertical"
        items={toMenuItems(
          detailMenus[menuKey] ??
            toLegacyMenuItems(bottomMenuGroups[menuKey as 'hr' | 'system'] ?? []),
          t,
        )}
        onClick={({ key }) => navigate(String(key))}
      />
    </div>
  )

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
      aria-label={t('shell.navigation.cores')}
    >
      <div className={styles.identity}>
        <div className={styles.logo}>
          <Image src="/assets/images/lng-logo.jpg" preview={false} alt={t('app.name')} />
        </div>
        {!collapsed && (
          <div className={styles.account}>
            <span>{t('legacyMenu.systemName')}</span>
            <Dropdown
              open={openDropdown}
              onOpenChange={setOpenDropdown}
              trigger={['click']}
              popupRender={() => <div className={styles.accountMenu}>{t('shell.logout')}</div>}
            >
              <button type="button">{t('legacyMenu.userName')}</button>
            </Dropdown>
          </div>
        )}
        {!collapsed && (
          <span className={styles.star}>
            <FcRating size={20} />
          </span>
        )}
      </div>
      <Layout className={styles.menuLayout}>
        <div className={styles.rail}>
          <nav className={styles.railMenu} aria-label={t('shell.navigation.cores')}>
            {topMenus.map((item) => (
              <button
                key={item.key}
                className={item.key === activeMenu ? styles.railButtonActive : styles.railButton}
                type="button"
                aria-label={t(item.labelKey)}
                onClick={() => setActiveMenu(item.key)}
              >
                {collapsed ? (
                  <Popover content={popover(item.key)} trigger="click" placement="rightTop">
                    <span className={styles.railIcon}>{item.icon}</span>
                  </Popover>
                ) : (
                  item.icon
                )}
              </button>
            ))}
            <div className={styles.railSpacer} />
            {bottomMenus.map((item) => (
              <button
                key={item.key}
                className={item.key === activeMenu ? styles.railButtonActive : styles.railButton}
                type="button"
                aria-label={t(item.labelKey)}
                onClick={() => setActiveMenu(item.key)}
              >
                {collapsed ? (
                  <Popover content={popover(item.key)} trigger="click" placement="rightBottom">
                    <span className={styles.railIcon}>{item.icon}</span>
                  </Popover>
                ) : (
                  item.icon
                )}
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
        aria-label={t(collapsed ? 'shell.collapse' : 'shell.expand')}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        {collapsed ? <FaAnglesLeft size={15} /> : <FaAnglesRight size={15} />}
      </button>
    </aside>
  )
}
