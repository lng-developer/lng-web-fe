import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Tag } from 'antd'

import styles from '../pages/AccessExplorerPage.module.scss'

export interface ScopeDepartmentItem {
  id: string
  name: string
  type: 'department'
  teams: { id: string; name: string }[]
}

export interface ScopeShopVendorItem {
  id: string
  name: string
  type: 'shop' | 'vendor'
}

export interface ScopeCategories {
  departments: ScopeDepartmentItem[]
  shopsAndVendors: ScopeShopVendorItem[]
}

export interface AccessExplorerScopeSidebarProps {
  totalAccounts: number
  scopeSearch: string
  onScopeSearchChange: (value: string) => void
  selectedScopeId: string
  onSelectScope: (scopeId: string) => void
  scopeCategories: ScopeCategories
  getScopeAccountCount: (scopeId: string, scopeType?: string) => number
}

export const AccessExplorerScopeSidebar: FC<AccessExplorerScopeSidebarProps> = ({
  totalAccounts,
  scopeSearch,
  onScopeSearchChange,
  selectedScopeId,
  onSelectScope,
  scopeCategories,
  getScopeAccountCount,
}) => {
  const { t } = useTranslation()

  return (
    <aside
      className={styles.scopeSidebar}
      aria-label={t('auth.accessExplorer.scopesNavigation', 'Phạm vi & Tổ chức')}
    >
      <div className={styles.scopeHeader}>
        <span>{t('auth.accessExplorer.scopesNavigation', 'Phạm vi & Tổ chức')}</span>
        <Tag color="blue">{totalAccounts}</Tag>
      </div>
      <div className={styles.scopeSearch}>
        <Input
          size="small"
          placeholder={t('auth.accessExplorer.searchScopes', 'Lọc phạm vi...')}
          value={scopeSearch}
          onChange={(e) => onScopeSearchChange(e.target.value)}
          allowClear
        />
      </div>
      <div className={styles.scopeList}>
        {/* All accounts node */}
        <button
          type="button"
          className={
            selectedScopeId === 'ALL'
              ? `${styles.scopeItem} ${styles.scopeItemActive}`
              : styles.scopeItem
          }
          onClick={() => onSelectScope('ALL')}
        >
          <span>🌐 {t('auth.accessExplorer.allScopes', 'Tất cả tài khoản')}</span>
          <span className={styles.scopeCountBadge}>{getScopeAccountCount('ALL')}</span>
        </button>

        {/* Global Admin node */}
        <button
          type="button"
          className={
            selectedScopeId === 'global'
              ? `${styles.scopeItem} ${styles.scopeItemActive}`
              : styles.scopeItem
          }
          onClick={() => onSelectScope('global')}
        >
          <span>⭐ {t('auth.accessExplorer.globalScope', 'Toàn cục (Global)')}</span>
          <span className={styles.scopeCountBadge}>{getScopeAccountCount('global')}</span>
        </button>

        {/* Departments & Teams */}
        {scopeCategories.departments.length > 0 ? (
          <>
            <div className={styles.scopeCategoryHeader}>
              🏢 {t('auth.accessExplorer.departmentScope', 'Phòng ban')}
            </div>
            {scopeCategories.departments.map((dept) => {
              const isDeptSelected = selectedScopeId === dept.id
              return (
                <div key={dept.id}>
                  <button
                    type="button"
                    className={
                      isDeptSelected
                        ? `${styles.scopeItem} ${styles.scopeItemActive}`
                        : styles.scopeItem
                    }
                    onClick={() => onSelectScope(dept.id)}
                  >
                    <span style={{ fontWeight: 500 }}>{dept.name}</span>
                    <span className={styles.scopeCountBadge}>
                      {getScopeAccountCount(dept.id, 'department')}
                    </span>
                  </button>
                  {dept.teams.map((team) => {
                    const isTeamSelected = selectedScopeId === team.id
                    return (
                      <button
                        type="button"
                        key={team.id}
                        style={{ paddingLeft: 20 }}
                        className={
                          isTeamSelected
                            ? `${styles.scopeItem} ${styles.scopeItemActive}`
                            : styles.scopeItem
                        }
                        onClick={() => onSelectScope(team.id)}
                      >
                        <span>👥 {team.name}</span>
                        <span className={styles.scopeCountBadge}>
                          {getScopeAccountCount(team.id, 'team')}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </>
        ) : null}

        {/* Shops & Vendors */}
        {scopeCategories.shopsAndVendors.length > 0 ? (
          <>
            <div className={styles.scopeCategoryHeader}>
              🏪 {t('auth.accessExplorer.shopScope', 'Cửa hàng & Vendor')}
            </div>
            {scopeCategories.shopsAndVendors.map((item) => {
              const isSelected = selectedScopeId === item.id
              return (
                <button
                  type="button"
                  key={item.id}
                  className={
                    isSelected ? `${styles.scopeItem} ${styles.scopeItemActive}` : styles.scopeItem
                  }
                  onClick={() => onSelectScope(item.id)}
                >
                  <span>
                    {item.type === 'shop' ? '🛍️' : '🚚'} {item.name}
                  </span>
                  <span className={styles.scopeCountBadge}>
                    {getScopeAccountCount(item.id, item.type)}
                  </span>
                </button>
              )
            })}
          </>
        ) : null}
      </div>
      <div className={styles.keyboardHint}>
        {t('auth.accessExplorer.keyboardHint', 'Dùng phím ↑ ↓ để duyệt nhanh')}
      </div>
    </aside>
  )
}
