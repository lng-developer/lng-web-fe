import type { ReactNode } from 'react'
import { AiOutlineFileSync } from 'react-icons/ai'
import { BiExtension } from 'react-icons/bi'
import { BsFiletypePsd } from 'react-icons/bs'
import { CgFileDocument, CgShoppingBag } from 'react-icons/cg'
import { FaAmazon, FaEtsy, FaShopify } from 'react-icons/fa'
import { HiOutlineBuildingStorefront } from 'react-icons/hi2'
import { IoImageOutline, IoStorefrontOutline } from 'react-icons/io5'
import { LuBox, LuLayoutDashboard, LuLightbulb, LuNotebook, LuTruck } from 'react-icons/lu'
import { MdBalance, MdOutlineConnectedTv } from 'react-icons/md'
import { RiAdvertisementLine, RiSettings2Line, RiTokenSwapLine } from 'react-icons/ri'
import {
  TbAward,
  TbBlender,
  TbBuildingFactory2,
  TbHomeStats,
  TbPackages,
  TbReport,
  TbReportSearch,
} from 'react-icons/tb'
import {
  ApartmentOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ContactsOutlined,
  DollarOutlined,
  FileTextOutlined,
  FormatPainterOutlined,
  HistoryOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons'

import { workspaceRouteLinks } from '@/app/router/workspaceRoutes'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getHrNavigation } from '@/features/hr/hrNavigation'
import { getHrAccess } from '@/features/hr/hrViews'

import {
  canReadHrDashboard,
  canReadOperationsDashboard,
  effectivePermissions,
  hasFinanceAccess,
} from './appNavigation'

export type SearchableNavigationItem = {
  key: string
  path: string
  labelKey: string
  categoryKey: string
  icon?: ReactNode
  keywords?: string[]
}

const adminRoles = new Set(['SUPER_ADMIN', 'SUPER ADMIN', 'ADMIN'])

function getPermissionsSet(account?: CurrentAccount): Set<string> | null {
  if (!account) return null
  const isAdmin = account.roles?.some((role) => adminRoles.has(role.toUpperCase()))
  if (isAdmin) return null
  return effectivePermissions(account)
}

function iconForHrKey(key: string, path: string): ReactNode {
  if (key.includes('dashboard')) return <LuLayoutDashboard />
  if (key.includes('schedule')) return <CalendarOutlined />
  if (key.includes('attendance')) return <ClockCircleOutlined />
  if (key.includes('request') || key.includes('approval')) return <FileTextOutlined />
  if (key.includes('payroll')) return <DollarOutlined />
  if (key.includes('member') || key === 'team') return <TeamOutlined />
  if (key === 'organization' || path.includes('organization')) return <ApartmentOutlined />
  return <UserOutlined />
}

export function getSearchableNavigationItems(account: CurrentAccount): SearchableNavigationItem[] {
  const permissions = getPermissionsSet(account)
  const financeVisible = hasFinanceAccess(account)
  const items: SearchableNavigationItem[] = []

  // 1. Dashboards
  if (!permissions || canReadOperationsDashboard(permissions)) {
    items.push({
      key: 'portal-dashboard',
      path: '/portal/dashboard',
      labelKey: 'shell.navigation.dashboard',
      categoryKey: 'shell.cores.portal',
      icon: <LuLayoutDashboard />,
      keywords: ['dashboard', 'tong quan', 'bang dieu khien', 'portal'],
    })
  }

  if (!permissions || canReadHrDashboard(permissions)) {
    items.push({
      key: 'hr-dashboard',
      path: '/hr/dashboard',
      labelKey: 'shell.navigation.dashboard',
      categoryKey: 'shell.cores.hr',
      icon: <LuLayoutDashboard />,
      keywords: ['hr', 'dashboard', 'nhan su', 'tong quan'],
    })
  }

  if (!permissions || ['AUTH:READ', 'AUDIT:READ'].some((p) => permissions.has(p))) {
    items.push({
      key: 'system-dashboard',
      path: '/system/dashboard',
      labelKey: 'shell.navigation.dashboard',
      categoryKey: 'shell.cores.system',
      icon: <LuLayoutDashboard />,
      keywords: ['system', 'he thong', 'dashboard'],
    })
  }

  // 2. Sales & Orders
  const canAccessOrders =
    !permissions || permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')
  if (canAccessOrders) {
    items.push({
      key: 'orders-all',
      path: workspaceRouteLinks.orders,
      labelKey: 'legacyMenu.orders',
      categoryKey: 'legacyMenu.sales',
      icon: <LuBox />,
      keywords: ['orders', 'don hang', 'all orders', 'ban hang'],
    })
    items.push({
      key: 'orders-amazon',
      path: workspaceRouteLinks.ordersBySalesChannel('amazon'),
      labelKey: 'legacyMenu.amazon',
      categoryKey: 'legacyMenu.orders',
      icon: <FaAmazon />,
      keywords: ['amazon', 'amz', 'orders', 'don hang amazon'],
    })
    items.push({
      key: 'orders-etsy',
      path: workspaceRouteLinks.ordersBySalesChannel('etsy'),
      labelKey: 'legacyMenu.etsy',
      categoryKey: 'legacyMenu.orders',
      icon: <FaEtsy />,
      keywords: ['etsy', 'orders', 'don hang etsy'],
    })
    items.push({
      key: 'orders-shopify',
      path: workspaceRouteLinks.ordersBySalesChannel('shopify'),
      labelKey: 'legacyMenu.shopify',
      categoryKey: 'legacyMenu.orders',
      icon: <FaShopify />,
      keywords: ['shopify', 'orders', 'don hang shopify'],
    })
    items.push({
      key: 'team-tasks',
      path: workspaceRouteLinks.teamTasks,
      labelKey: 'legacyMenu.teamTasks',
      categoryKey: 'legacyMenu.sales',
      icon: <LuNotebook />,
      keywords: ['tasks', 'team tasks', 'nhiem vu', 'cong viec doi'],
    })
  }

  // Listing
  const canAccessCatalog =
    !permissions || permissions.has('CATALOG:READ') || permissions.has('CATALOG:WRITE')
  if (canAccessCatalog) {
    items.push({
      key: 'listing-amazon',
      path: '/portal/listing/amazon',
      labelKey: 'legacyMenu.amzListing',
      categoryKey: 'legacyMenu.listing',
      icon: <FaAmazon />,
      keywords: ['listing', 'amazon listing', 'amz', 'dang ban'],
    })
    items.push({
      key: 'listing-etsy',
      path: '/portal/listing/etsy',
      labelKey: 'legacyMenu.etsyListing',
      categoryKey: 'legacyMenu.listing',
      icon: <FaEtsy />,
      keywords: ['listing', 'etsy listing', 'dang ban etsy'],
    })
    items.push({
      key: 'catalog',
      path: '/portal/catalog',
      labelKey: 'shell.navigation.catalog',
      categoryKey: 'legacyMenu.costCenters',
      icon: <TbPackages />,
      keywords: ['catalog', 'danh muc', 'san pham'],
    })
    items.push({
      key: 'product-types',
      path: '/portal/catalog/product-types',
      labelKey: 'shell.navigation.productTypes',
      categoryKey: 'legacyMenu.costCenters',
      icon: <TbPackages />,
      keywords: ['product types', 'loai san pham'],
    })
    items.push({
      key: 'internal-templates',
      path: '/portal/catalog/templates',
      labelKey: 'shell.navigation.internalTemplates',
      categoryKey: 'legacyMenu.costCenters',
      icon: <BsFiletypePsd />,
      keywords: ['templates', 'mau noi bo', 'psd template'],
    })
  }

  // Mapping
  const canAccessMapping =
    !permissions || permissions.has('MAPPING:READ') || permissions.has('MAPPING:WRITE')
  if (canAccessMapping) {
    items.push({
      key: 'mapping',
      path: '/portal/mapping',
      labelKey: 'shell.navigation.mapping',
      categoryKey: 'legacyMenu.costCenters',
      icon: <RiTokenSwapLine />,
      keywords: ['mapping', 'anh xa', 'sku mapping'],
    })
  }

  // Reports
  if (!permissions || permissions.has('REPORTS:READ')) {
    items.push({
      key: 'reports-order-cost-amazon',
      path: '/portal/reports/amazon/order-cost',
      labelKey: 'legacyMenu.amazon',
      categoryKey: 'legacyMenu.ordersCost',
      icon: <CgShoppingBag />,
      keywords: ['reports', 'cost', 'gia von', 'chi phi don hang', 'amazon cost'],
    })
    items.push({
      key: 'reports-order-cost-etsy',
      path: '/portal/reports/etsy/order-cost',
      labelKey: 'legacyMenu.etsy',
      categoryKey: 'legacyMenu.ordersCost',
      icon: <CgShoppingBag />,
      keywords: ['reports', 'cost', 'gia von', 'etsy cost'],
    })
    items.push({
      key: 'reports-ads-amazon',
      path: '/portal/reports/amazon/ads',
      labelKey: 'legacyMenu.amazon',
      categoryKey: 'legacyMenu.adsReport',
      icon: <RiAdvertisementLine />,
      keywords: ['ads', 'quang cao', 'amazon ads'],
    })
    items.push({
      key: 'reports-ads-etsy',
      path: '/portal/reports/etsy/ads',
      labelKey: 'legacyMenu.etsy',
      categoryKey: 'legacyMenu.adsReport',
      icon: <RiAdvertisementLine />,
      keywords: ['ads', 'quang cao', 'etsy ads'],
    })
    items.push({
      key: 'reports-sales-amazon',
      path: '/portal/reports/amazon/sales',
      labelKey: 'legacyMenu.amazon',
      categoryKey: 'legacyMenu.saleReport',
      icon: <TbReportSearch />,
      keywords: ['sales report', 'doanh thu', 'doanh so', 'amazon sales'],
    })
    items.push({
      key: 'reports-sales-etsy',
      path: '/portal/reports/etsy/sales',
      labelKey: 'legacyMenu.etsy',
      categoryKey: 'legacyMenu.saleReport',
      icon: <TbReportSearch />,
      keywords: ['sales report', 'doanh thu', 'doanh so', 'etsy sales'],
    })
  }

  // Monitoring
  if (!permissions || permissions.has('AUDIT:READ')) {
    items.push({
      key: 'monitoring',
      path: '/portal/monitoring',
      labelKey: 'legacyMenu.monitoring',
      categoryKey: 'legacyMenu.sales',
      icon: <AiOutlineFileSync />,
      keywords: ['monitoring', 'giam sat', 'he thong'],
    })
  }

  // Configuration (Shops, Integrations, Shipments)
  if (!permissions || permissions.has('SHOPS:READ')) {
    items.push({
      key: 'shops',
      path: '/portal/shops',
      labelKey: 'shell.navigation.shops',
      categoryKey: 'legacyMenu.configuration',
      icon: <IoStorefrontOutline />,
      keywords: ['shops', 'cua hang', 'stores'],
    })
  }

  if (
    !permissions ||
    permissions.has('ORDERS:READ') ||
    permissions.has('ORDERS:WRITE') ||
    permissions.has('CATALOG:WRITE')
  ) {
    items.push({
      key: 'integrations',
      path: '/portal/integrations',
      labelKey: 'shell.navigation.integrations',
      categoryKey: 'legacyMenu.configuration',
      icon: <BiExtension />,
      keywords: ['integrations', 'tich hop', 'api', 'channels'],
    })
  }

  if (!permissions || permissions.has('SHIPMENTS:READ') || permissions.has('SHIPMENTS:WRITE')) {
    items.push({
      key: 'shipments',
      path: '/portal/shipments',
      labelKey: 'shell.navigation.shipments',
      categoryKey: 'legacyMenu.configuration',
      icon: <LuTruck />,
      keywords: ['shipments', 'van chuyen', 'tracking', 'giao hang'],
    })
  }

  // Finance
  if (financeVisible) {
    items.push({
      key: 'finance-overview',
      path: '/portal/finance',
      labelKey: 'finance.tabs.overview',
      categoryKey: 'shell.navigation.finance',
      icon: <DollarOutlined />,
      keywords: ['finance', 'tai chinh', 'doanh thu', 'thu chi'],
    })
    items.push({
      key: 'finance-settlements',
      path: '/portal/finance/settlements',
      labelKey: 'finance.settlements.settlement',
      categoryKey: 'shell.navigation.finance',
      icon: <DollarOutlined />,
      keywords: ['settlements', 'quyet toan', 'doi soat'],
    })
    items.push({
      key: 'finance-cash-flow',
      path: '/portal/finance/cash-flow',
      labelKey: 'finance.cashFlow',
      categoryKey: 'shell.navigation.finance',
      icon: <DollarOutlined />,
      keywords: ['cash flow', 'dong tien'],
    })
    items.push({
      key: 'finance-transactions',
      path: '/portal/finance/transactions',
      labelKey: 'finance.transactions',
      categoryKey: 'shell.navigation.finance',
      icon: <DollarOutlined />,
      keywords: ['transactions', 'giao dich'],
    })
  }

  // 3. Fulfillment
  const canAccessProduction =
    !permissions ||
    [
      'PRODUCTION:READ',
      'PRODUCTION:WRITE',
      'PRODUCTION:SCALE_WORK',
      'DESIGN:WORK',
      'DESIGN:REVIEW',
    ].some((p) => permissions.has(p))
  if (canAccessProduction) {
    items.push({
      key: 'production-scale-amazon',
      path: '/portal/production/scale?salesChannelCode=AMAZON',
      labelKey: 'legacyMenu.amazonScale',
      categoryKey: 'legacyMenu.scale',
      icon: <MdBalance />,
      keywords: ['scale', 'amazon scale', 'san xuat amazon', 'fulfillment'],
    })
    items.push({
      key: 'production-scale-etsy',
      path: '/portal/production/scale?salesChannelCode=ETSY',
      labelKey: 'legacyMenu.etsyScale',
      categoryKey: 'legacyMenu.scale',
      icon: <MdBalance />,
      keywords: ['scale', 'etsy scale', 'san xuat etsy'],
    })
    items.push({
      key: 'production-qc-amazon',
      path: '/portal/production/qc?salesChannelCode=AMAZON',
      labelKey: 'legacyMenu.amazonQc',
      categoryKey: 'legacyMenu.qc',
      icon: <TbBlender />,
      keywords: ['qc', 'kiem tra', 'amazon qc', 'chat luong'],
    })
    items.push({
      key: 'production-qc-etsy',
      path: '/portal/production/qc?salesChannelCode=ETSY',
      labelKey: 'legacyMenu.etsyQc',
      categoryKey: 'legacyMenu.qc',
      icon: <TbBlender />,
      keywords: ['qc', 'kiem tra', 'etsy qc'],
    })
    items.push({
      key: 'production-overview',
      path: '/portal/production',
      labelKey: 'shell.navigation.production',
      categoryKey: 'legacyMenu.fulfillment',
      icon: <TbBuildingFactory2 />,
      keywords: ['production', 'san xuat', 'xuong in', 'fulfill'],
    })
  }

  const canAccessScores =
    !permissions ||
    [
      'PRODUCTION:READ',
      'PRODUCTION:WRITE',
      'PRODUCTION:SCALE_WORK',
      'WORK_SCORES:READ',
      'WORK_SCORES:ADJUST',
    ].some((p) => permissions.has(p))
  if (canAccessScores) {
    items.push({
      key: 'production-scores',
      path: '/portal/production/scores',
      labelKey: 'portal.production.scores',
      categoryKey: 'legacyMenu.fulfillment',
      icon: <TbHomeStats />,
      keywords: ['production scores', 'diem san xuat', 'hieu suat'],
    })
  }

  if (!permissions || permissions.has('VENDOR_SUBMISSIONS:READ')) {
    items.push({
      key: 'vendor-submissions',
      path: '/portal/vendor-submissions',
      labelKey: 'shell.navigation.vendorSubmissions',
      categoryKey: 'legacyMenu.fulfillment',
      icon: <TbBuildingFactory2 />,
      keywords: ['vendor handoff', 'ban giao vendor', 'submissions'],
    })
  }

  // 4. Design
  const canAccessDesign =
    !permissions ||
    ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW'].some((p) => permissions.has(p))
  if (canAccessDesign) {
    items.push({
      key: 'design-idea-tasks',
      path: workspaceRouteLinks.designIdeaTasks,
      labelKey: 'portal.design.ideaTasks',
      categoryKey: 'legacyMenu.design',
      icon: <LuLightbulb />,
      keywords: ['design', 'thiet ke', 'idea tasks', 'y tuong'],
    })
    items.push({
      key: 'design-idea-amazon',
      path: workspaceRouteLinks.designIdeaTasksBySalesChannel('amazon'),
      labelKey: 'portal.design.amazonTasks',
      categoryKey: 'portal.design.ideaTasks',
      icon: <FaAmazon />,
      keywords: ['design amazon', 'idea amazon', 'thiet ke amazon'],
    })
    items.push({
      key: 'design-idea-etsy',
      path: workspaceRouteLinks.designIdeaTasksBySalesChannel('etsy'),
      labelKey: 'portal.design.etsyTasks',
      categoryKey: 'portal.design.ideaTasks',
      icon: <FaEtsy />,
      keywords: ['design etsy', 'idea etsy', 'thiet ke etsy'],
    })
    items.push({
      key: 'design-png-tasks',
      path: workspaceRouteLinks.designPngTasks,
      labelKey: 'portal.design.pngTasks',
      categoryKey: 'legacyMenu.design',
      icon: <IoImageOutline />,
      keywords: ['png tasks', 'xuat png', 'file in'],
    })
    items.push({
      key: 'design-scores',
      path: '/portal/design/scores',
      labelKey: 'portal.design.scores',
      categoryKey: 'legacyMenu.design',
      icon: <TbAward />,
      keywords: ['design scores', 'diem thiet ke', 'cham diem'],
    })
  }

  const canAccessPsd =
    !permissions ||
    ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW', 'DESIGN:PSD_REQUEST'].some(
      (p) => permissions.has(p),
    )
  if (canAccessPsd) {
    items.push({
      key: 'design-psd-tasks',
      path: workspaceRouteLinks.designPsdTasks,
      labelKey: 'portal.design.psdTasks',
      categoryKey: 'legacyMenu.design',
      icon: <BsFiletypePsd />,
      keywords: ['psd tasks', 'yeu cau psd', 've lai psd'],
    })
    items.push({
      key: 'design-files',
      path: '/portal/design/files',
      labelKey: 'portal.design.psdFiles',
      categoryKey: 'legacyMenu.design',
      icon: <BsFiletypePsd />,
      keywords: ['files', 'psd files', 'tep mau'],
    })
  }

  if (
    !permissions ||
    ['WORK_SCORES:READ', 'WORK_SCORES:ADJUST', 'DESIGN:WORK', 'PRODUCTION:SCALE_WORK'].some((p) =>
      permissions.has(p),
    )
  ) {
    items.push({
      key: 'work-scores',
      path: '/portal/work-scores',
      labelKey: 'shell.navigation.workScores',
      categoryKey: 'legacyMenu.design',
      icon: <TrophyOutlined />,
      keywords: ['work scores', 'bang diem', 'quy tac diem'],
    })
  }

  if (!permissions || permissions.has('MEDIA:READ')) {
    items.push({
      key: 'media',
      path: '/portal/media',
      labelKey: 'shell.navigation.media',
      categoryKey: 'legacyMenu.design',
      icon: <PictureOutlined />,
      keywords: ['media', 'anh', 'tep tin', 'upload', 'thu vien'],
    })
  }

  // 5. Vendor
  if (!permissions || permissions.has('VENDORS:READ') || permissions.has('VENDORS:WRITE')) {
    items.push({
      key: 'vendors-list',
      path: '/portal/vendors',
      labelKey: 'shell.navigation.vendors',
      categoryKey: 'legacyMenu.vendor',
      icon: <HiOutlineBuildingStorefront />,
      keywords: ['vendors', 'nha cung cap', 'danh sach vendor'],
    })
    items.push({
      key: 'vendors-products',
      path: '/portal/vendors?tab=products',
      labelKey: 'legacyMenu.vendorProducts',
      categoryKey: 'legacyMenu.vendor',
      icon: <CgFileDocument />,
      keywords: ['vendor products', 'san pham vendor'],
    })
    items.push({
      key: 'vendors-integrations',
      path: '/portal/vendors?tab=integrations',
      labelKey: 'portal.vendors.tabs.integrations',
      categoryKey: 'legacyMenu.vendor',
      icon: <BiExtension />,
      keywords: ['vendor api', 'tich hop vendor'],
    })
    items.push({
      key: 'vendors-migration',
      path: '/portal/vendors?tab=migration',
      labelKey: 'portal.vendors.tabs.migration',
      categoryKey: 'legacyMenu.vendor',
      icon: <TbPackages />,
      keywords: ['migration', 'chuyen du lieu'],
    })
  }

  // 6. Extensions
  if (!permissions || permissions.has('ORDERS:WRITE') || permissions.has('CATALOG:WRITE')) {
    items.push({
      key: 'ext-clients',
      path: '/portal/extensions/clients',
      labelKey: 'legacyMenu.manageClients',
      categoryKey: 'legacyMenu.extensions',
      icon: <MdOutlineConnectedTv />,
      keywords: ['clients', 'extensions', 'tien ich'],
    })
    items.push({
      key: 'ext-config-auto',
      path: '/portal/extensions/config-auto',
      labelKey: 'legacyMenu.configAuto',
      categoryKey: 'legacyMenu.extensions',
      icon: <RiSettings2Line />,
      keywords: ['config auto', 'tu dong'],
    })
    items.push({
      key: 'ext-log-manager',
      path: '/portal/extensions/log-manager',
      labelKey: 'legacyMenu.logManager',
      categoryKey: 'legacyMenu.extensions',
      icon: <TbReport />,
      keywords: ['log manager', 'nhat ky tien ich'],
    })
    items.push({
      key: 'ext-tracking-etsy',
      path: '/portal/extensions/tracking-etsy',
      labelKey: 'legacyMenu.trackingEtsy',
      categoryKey: 'legacyMenu.extensions',
      icon: <FaEtsy />,
      keywords: ['tracking etsy', 'dong bo ma van don'],
    })
    items.push({
      key: 'ext-message-etsy',
      path: '/portal/extensions/message-etsy',
      labelKey: 'legacyMenu.messageEtsy',
      categoryKey: 'legacyMenu.extensions',
      icon: <FaEtsy />,
      keywords: ['message etsy', 'tin nhan etsy'],
    })
    items.push({
      key: 'ext-check-tracking',
      path: '/portal/extensions/check-tracking',
      labelKey: 'legacyMenu.checkTracking',
      categoryKey: 'legacyMenu.extensions',
      icon: <LuTruck />,
      keywords: ['check tracking', 'kiem tra ma van don'],
    })
  }

  // 7. System & Configuration
  if (!permissions || permissions.has('AUTH:READ') || permissions.has('AUTH:WRITE')) {
    items.push({
      key: 'system-accounts',
      path: '/auth/accounts',
      labelKey: 'shell.navigation.accounts',
      categoryKey: 'legacyMenu.setting',
      icon: <TeamOutlined />,
      keywords: ['accounts', 'tai khoan', 'nguoi dung', 'users', 'nhan vien'],
    })
    items.push({
      key: 'system-access-control',
      path: '/auth/access-control',
      labelKey: 'shell.navigation.accessControl',
      categoryKey: 'legacyMenu.setting',
      icon: <SafetyCertificateOutlined />,
      keywords: ['access control', 'roles', 'phan quyen', 'vai tro', 'quyen han'],
    })
  }

  if (!permissions || permissions.has('CUSTOMERS:READ')) {
    items.push({
      key: 'system-customers',
      path: '/portal/customers',
      labelKey: 'shell.navigation.customers',
      categoryKey: 'legacyMenu.setting',
      icon: <ContactsOutlined />,
      keywords: ['customers', 'khach hang'],
    })
  }

  if (!permissions || permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')) {
    items.push({
      key: 'system-customizations',
      path: '/portal/customizations',
      labelKey: 'shell.navigation.customizations',
      categoryKey: 'legacyMenu.setting',
      icon: <FormatPainterOutlined />,
      keywords: ['customizations', 'tuy chinh', 'mau in theo yeu cau'],
    })
  }

  if (!permissions || permissions.has('AUDIT:READ')) {
    items.push({
      key: 'system-audit',
      path: '/portal/audit',
      labelKey: 'shell.navigation.auditLog',
      categoryKey: 'legacyMenu.setting',
      icon: <HistoryOutlined />,
      keywords: ['audit log', 'nhat ky', 'lich su thao tac'],
    })
  }

  // 8. HR routes
  const hrRoutes = getHrNavigation(getHrAccess(account), { includeSelf: true })
  const rootLabels: Record<string, string> = {
    self: 'shell.navigation.myDay',
    team: 'shell.navigation.teamOverview',
    operations: 'shell.navigation.hrOverview',
  }

  for (const route of hrRoutes) {
    items.push({
      key: `hr-${route.key}`,
      path: route.path,
      labelKey: rootLabels[route.key] ?? route.labelKey,
      categoryKey: 'shell.cores.hr',
      icon: iconForHrKey(route.key, route.path),
      keywords: ['hr', 'nhan su', 'cham cong', 'phep', 'lich trinh', 'bang luong'],
    })
  }

  const organizationPermissions = [
    'DEPARTMENTS:READ',
    'DEPARTMENTS:WRITE',
    'TEAMS:READ',
    'TEAMS:WRITE',
  ]
  if (!permissions || organizationPermissions.some((p) => permissions.has(p))) {
    items.push({
      key: 'hr-organization',
      path: '/organization',
      labelKey: 'shell.navigation.organization',
      categoryKey: 'shell.cores.hr',
      icon: <ApartmentOutlined />,
      keywords: ['organization', 'to chuc', 'phong ban', 'co cau'],
    })
  }

  // Deduplicate by path
  const seenPaths = new Set<string>()
  return items.filter((item) => {
    if (seenPaths.has(item.path)) return false
    seenPaths.add(item.path)
    return true
  })
}

export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim()
}

export function filterNavigationItems(
  items: SearchableNavigationItem[],
  query: string,
  t: (key: string) => string,
  i18n?: { getResource?: (lng: string, ns: string, key: string) => string | undefined },
): SearchableNavigationItem[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    const quickPriorityPaths = [
      '/portal/dashboard',
      '/hr/dashboard',
      '/system/dashboard',
      workspaceRouteLinks.orders,
      workspaceRouteLinks.ordersBySalesChannel('amazon'),
      workspaceRouteLinks.ordersBySalesChannel('etsy'),
      workspaceRouteLinks.teamTasks,
      workspaceRouteLinks.designIdeaTasks,
      '/portal/production/scale?salesChannelCode=AMAZON',
      '/hr/me',
      '/auth/accounts',
      '/portal/reports/amazon/order-cost',
    ]

    const quickMatches = quickPriorityPaths
      .map((path) => items.find((item) => item.path === path))
      .filter((item): item is SearchableNavigationItem => Boolean(item))

    return quickMatches.length > 0 ? quickMatches.slice(0, 8) : items.slice(0, 8)
  }

  return items.filter((item) => {
    // Current translation match
    const currentLabel = t(item.labelKey)
    if (normalizeSearchText(currentLabel).includes(normalizedQuery)) return true

    const currentCategory = t(item.categoryKey)
    if (normalizeSearchText(currentCategory).includes(normalizedQuery)) return true

    // Cross-language match (en & vi)
    if (i18n?.getResource) {
      const enLabel = i18n.getResource('en', 'translation', item.labelKey)
      if (typeof enLabel === 'string' && normalizeSearchText(enLabel).includes(normalizedQuery)) {
        return true
      }
      const viLabel = i18n.getResource('vi', 'translation', item.labelKey)
      if (typeof viLabel === 'string' && normalizeSearchText(viLabel).includes(normalizedQuery)) {
        return true
      }
      const enCat = i18n.getResource('en', 'translation', item.categoryKey)
      if (typeof enCat === 'string' && normalizeSearchText(enCat).includes(normalizedQuery)) {
        return true
      }
      const viCat = i18n.getResource('vi', 'translation', item.categoryKey)
      if (typeof viCat === 'string' && normalizeSearchText(viCat).includes(normalizedQuery)) {
        return true
      }
    }

    // Path matching (e.g. "orders", "amazon", "scale", "psd")
    if (item.path.toLowerCase().includes(normalizedQuery)) return true

    // Keywords matching
    if (item.keywords?.some((kw) => normalizeSearchText(kw).includes(normalizedQuery))) {
      return true
    }

    return false
  })
}
