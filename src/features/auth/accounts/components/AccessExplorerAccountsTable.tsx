import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  DownOutlined,
  EyeOutlined,
  IdcardOutlined,
  KeyOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { Button, Checkbox, Dropdown, Pagination, Select, Skeleton, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { EmployeeAvatar, EmptyState, FeedbackAlert, PageHeader, SearchInput } from '@/shared/ui'
import type { AccessAccountItem } from '../utils/accessExplorerHelpers'
import {
  getModuleLevel,
  renderMatrixBadge,
  roleCodesForScope,
  statusTone,
} from '../utils/accessExplorerHelpers'
import styles from '../pages/AccessExplorerPage.module.scss'

export type { AccessAccountItem }

export interface AccessExplorerAccountsTableProps {
  accounts: AccessAccountItem[]
  allAccountsCount: number
  activeAccountsCount: number
  inactiveAccountsCount: number
  paginatedAccounts: AccessAccountItem[]
  isLoading: boolean
  error: unknown
  onRefetch: () => void
  canWrite: boolean
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  selectedAccountIds: string[]
  onToggleAccountSelection: (id: string, checked: boolean) => void
  onToggleCurrentPageSelectAll: (checked: boolean) => void
  isAllCurrentPageSelected: boolean
  inspectedAccountId?: string
  onOpenInspector: (account: AccessAccountItem, tab?: string) => void
  search: string
  onSearchChange: (value: string) => void
  status?: string
  onStatusChange: (status?: string) => void
  role?: string
  onRoleChange: (role?: string) => void
  roleOptions: Array<{ label: string; value: string }>
  hasFilters: boolean
  onClearFilters: () => void
  onOpenCreateAccount: () => void
  onOpenCreateFromProfile: () => void
  isCreateDisabled: boolean
  onOpenBulkAssign: () => void
  onOpenBulkRevoke: () => void
  onClearBulkSelection: () => void
}

export const AccessExplorerAccountsTable: FC<AccessExplorerAccountsTableProps> = ({
  accounts,
  allAccountsCount,
  activeAccountsCount,
  inactiveAccountsCount,
  paginatedAccounts,
  isLoading,
  error,
  onRefetch,
  canWrite,
  currentPage,
  pageSize,
  onPageChange,
  selectedAccountIds,
  onToggleAccountSelection,
  onToggleCurrentPageSelectAll,
  isAllCurrentPageSelected,
  inspectedAccountId,
  onOpenInspector,
  search,
  onSearchChange,
  status,
  onStatusChange,
  role,
  onRoleChange,
  roleOptions,
  hasFilters,
  onClearFilters,
  onOpenCreateAccount,
  onOpenCreateFromProfile,
  isCreateDisabled,
  onOpenBulkAssign,
  onOpenBulkRevoke,
  onClearBulkSelection,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <main className={styles.directory}>
      <div className={styles.directoryHeader}>
        <PageHeader
          title={t('auth.accessExplorer.title')}
          actions={
            <div className={styles.headerActions}>
              {canWrite ? (
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'direct-account',
                        label: t('auth.accessExplorer.createAccountDirect'),
                        icon: <PlusOutlined />,
                      },
                      {
                        key: 'from-profile',
                        label: t('auth.accessExplorer.createAccountFromProfile'),
                        icon: <IdcardOutlined />,
                      },
                    ],
                    onClick: ({ key }) => {
                      if (key === 'from-profile') onOpenCreateFromProfile()
                      else onOpenCreateAccount()
                    },
                  }}
                >
                  <Button icon={<PlusOutlined />} type="primary" disabled={isCreateDisabled}>
                    {t('auth.accessExplorer.createAccount')}
                    <DownOutlined />
                  </Button>
                </Dropdown>
              ) : null}
            </div>
          }
        />
        {error ? (
          <FeedbackAlert
            type="error"
            title={t('auth.accessExplorer.unavailable')}
            description={t('auth.accessExplorer.unavailableDescription')}
            action={
              <Button type="link" icon={<ReloadOutlined aria-hidden />} onClick={onRefetch}>
                {t('auth.accessExplorer.retry')}
              </Button>
            }
          />
        ) : null}
      </div>

      <div className={styles.directoryTable}>
        <div className={styles.filters}>
          <div className={styles.quickFilters}>
            <Button
              className={!status ? styles.quickFilterActive : undefined}
              onClick={() => onStatusChange(undefined)}
            >
              {t('auth.accessExplorer.allAccountsFilter')}
              <span className={styles.filterCount}>{allAccountsCount}</span>
            </Button>
            <Button
              className={status === 'active' ? styles.quickFilterActive : undefined}
              onClick={() => onStatusChange('active')}
            >
              {t('auth.accessExplorer.activeAccountsFilter')}
              <span className={styles.filterCount}>{activeAccountsCount}</span>
            </Button>
            <Button
              className={status === 'inactive' ? styles.quickFilterActive : undefined}
              onClick={() => onStatusChange('inactive')}
            >
              {t('auth.accessExplorer.inactiveAccountsFilter')}
              <span className={styles.filterCount}>{inactiveAccountsCount}</span>
            </Button>
          </div>
          <Select
            className={styles.roleFilter}
            aria-label={t('auth.accessExplorer.currentRoles')}
            allowClear
            placeholder={t('auth.accessExplorer.allRoles')}
            options={roleOptions}
            value={role}
            onChange={onRoleChange}
          />
          <SearchInput
            className={styles.searchFilter}
            aria-label={t('auth.accessExplorer.searchAccounts')}
            placeholder={t('auth.accessExplorer.searchEmail')}
            value={search}
            onSearchChange={onSearchChange}
          />
          <Button type="text" disabled={!hasFilters} onClick={onClearFilters}>
            {t('auth.accessExplorer.clearFilters')}
          </Button>
        </div>

        <div className={styles.tableShell}>
          <div className={styles.tableHeader}>
            {canWrite ? (
              <Checkbox
                aria-label={t('auth.accessExplorer.selectCurrentPage')}
                checked={isAllCurrentPageSelected}
                disabled={paginatedAccounts.length === 0}
                onChange={(event) => onToggleCurrentPageSelectAll(event.target.checked)}
              />
            ) : (
              <span />
            )}
            <span>{t('auth.accessExplorer.account')}</span>
            <span>{t('auth.accessExplorer.globalRoles')}</span>
            <span>{t('auth.accessExplorer.teamAccess')}</span>
            <span className={styles.matrixColHeader}>{t('auth.accessExplorer.matrixOrders')}</span>
            <span className={styles.matrixColHeader}>{t('auth.accessExplorer.matrixCatalog')}</span>
            <span className={styles.matrixColHeader}>{t('auth.accessExplorer.matrixDesign')}</span>
            <span className={styles.matrixColHeader}>{t('auth.accessExplorer.matrixHr')}</span>
            <span className={styles.matrixColHeader}>{t('auth.accessExplorer.matrixReports')}</span>
            <span>{t('auth.accessExplorer.status')}</span>
            <span>{t('auth.accessExplorer.lastLogin')}</span>
            <span />
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton.Input key={i} active block style={{ height: 58, borderRadius: 0 }} />
              ))}
            </div>
          ) : paginatedAccounts.length === 0 ? (
            <EmptyState
              title={
                hasFilters
                  ? t('auth.accessExplorer.noResults')
                  : t('auth.accessExplorer.emptyAccounts')
              }
              description={t('auth.accessExplorer.emptyAccountsDescription')}
              action={
                hasFilters ? (
                  <Button type="link" onClick={onClearFilters}>
                    {t('auth.accessExplorer.clearFilters')}
                  </Button>
                ) : null
              }
            />
          ) : (
            paginatedAccounts.map((account) => {
              const isSelected = inspectedAccountId === account.id
              const globalRoles = roleCodesForScope(account, 'global')
              const teamRoles = roleCodesForScope(account, 'team')
              const globalRoleDisplay = account.roleAssignments
                ? globalRoles
                : (account.roles ?? [])
              const orderLevel = getModuleLevel(account, 'orders')
              const catalogLevel = getModuleLevel(account, 'catalog')
              const designLevel = getModuleLevel(account, 'design')
              const hrLevel = getModuleLevel(account, 'hr')
              const reportsLevel = getModuleLevel(account, 'reports')

              return (
                <div
                  key={account.id}
                  className={
                    isSelected
                      ? `${styles.accountRow} ${styles.accountRowSelected}`
                      : styles.accountRow
                  }
                  onClick={() => onOpenInspector(account)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenInspector(account)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {canWrite ? (
                    <Checkbox
                      checked={selectedAccountIds.includes(account.id)}
                      onChange={(event) =>
                        onToggleAccountSelection(account.id, event.target.checked)
                      }
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <span />
                  )}
                  <div className={styles.accountIdentity}>
                    <EmployeeAvatar size={32} name={account.email} className={styles.avatar} />
                    <Typography.Text strong className={styles.emailText}>
                      {account.email}
                    </Typography.Text>
                  </div>
                  <div className={styles.accountRoles}>
                    {globalRoleDisplay.length ? (
                      <Tag color="blue">{globalRoleDisplay.join(', ')}</Tag>
                    ) : (
                      <Typography.Text type="secondary" className={styles.accountMeta}>
                        {t('auth.accessExplorer.noRoles')}
                      </Typography.Text>
                    )}
                  </div>
                  <div className={styles.teamAccess}>
                    {teamRoles.length ? (
                      <Tag color="cyan">
                        {account.team?.name ?? t('auth.accessExplorer.teamScope')} ·{' '}
                        {teamRoles.join(', ')}
                      </Tag>
                    ) : (
                      <Typography.Text type="secondary" className={styles.accountMeta}>
                        {t('auth.accessExplorer.noTeamAccess')}
                      </Typography.Text>
                    )}
                  </div>

                  <div className={styles.matrixCell}>{renderMatrixBadge(orderLevel, t)}</div>
                  <div className={styles.matrixCell}>{renderMatrixBadge(catalogLevel, t)}</div>
                  <div className={styles.matrixCell}>{renderMatrixBadge(designLevel, t)}</div>
                  <div className={styles.matrixCell}>{renderMatrixBadge(hrLevel, t)}</div>
                  <div className={styles.matrixCell}>{renderMatrixBadge(reportsLevel, t)}</div>

                  <span
                    className={
                      statusTone(account.status) === 'operational'
                        ? `${styles.accountStatus} ${styles.accountStatusActive}`
                        : `${styles.accountStatus} ${styles.accountStatusInactive}`
                    }
                  >
                    <span aria-hidden className={styles.statusDot} />
                    {account.status ?? t('auth.accessExplorer.unknown')}
                  </span>
                  <Typography.Text className={styles.accountMeta}>
                    {account.lastLoginAt
                      ? dayjs(account.lastLoginAt).format('DD/MM/YYYY HH:mm')
                      : t('auth.accessExplorer.neverLoggedIn')}
                  </Typography.Text>
                  <div className={styles.rowActionMenu}>
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: [
                          {
                            key: 'details',
                            icon: <EyeOutlined />,
                            label: t('auth.accessExplorer.viewDetails'),
                          },
                          {
                            key: 'global-access',
                            icon: <SettingOutlined />,
                            label: t('auth.accessEditor.globalAccess'),
                          },
                          ...(canWrite
                            ? [
                                {
                                  key: 'scoped-access',
                                  icon: <KeyOutlined />,
                                  label: t('auth.accessExplorer.manageScopedAccess'),
                                },
                              ]
                            : []),
                          {
                            key: 'security',
                            icon: <KeyOutlined />,
                            label: t('auth.accessExplorer.securitySettings'),
                          },
                        ],
                        onClick: ({ key }) => {
                          if (key === 'details') onOpenInspector(account)
                          if (key === 'global-access') onOpenInspector(account, 'access')
                          if (key === 'scoped-access')
                            navigate(`/auth/accounts/${account.id}/access`)
                          if (key === 'security') onOpenInspector(account, 'security')
                        },
                      }}
                    >
                      <Button
                        aria-label={t('auth.accessEditor.actions')}
                        icon={<MoreOutlined />}
                        type="text"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {accounts.length > pageSize ? (
          <div className={styles.pagination}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={accounts.length}
              onChange={onPageChange}
              showSizeChanger={false}
            />
          </div>
        ) : null}
      </div>

      {selectedAccountIds.length > 0 && canWrite ? (
        <div className={styles.bulkBar}>
          <span className={styles.bulkBarLabel}>
            {t('auth.accessExplorer.selectedCount', {
              count: selectedAccountIds.length,
              defaultValue: `${selectedAccountIds.length} account(s) selected`,
            })}
          </span>
          <div className={styles.bulkBarActions}>
            <Button onClick={onOpenBulkAssign}>
              {t('auth.accessExplorer.bulkAssign', 'Bulk assign')}
            </Button>
            <Button danger onClick={onOpenBulkRevoke}>
              {t('auth.accessExplorer.bulkRevoke', 'Revoke now')}
            </Button>
            <Button type="text" onClick={onClearBulkSelection}>
              {t('auth.accessExplorer.clearSelection', 'Clear')}
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
