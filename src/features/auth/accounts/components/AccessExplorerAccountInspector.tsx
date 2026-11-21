import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CloseOutlined, LockOutlined, SettingOutlined, UnlockOutlined } from '@ant-design/icons'
import { Button, Form, Input, Skeleton, Tabs, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { EmployeeAvatar, StatusTag } from '@/shared/ui'
import type { AccessAccountItem } from './AccessExplorerAccountsTable'
import { statusTone } from '../utils/accessExplorerHelpers'
import styles from '../pages/AccessExplorerPage.module.scss'

export interface EffectivePermissionItem {
  code: string
  module: string
  provenance: string
}

export interface GroupedEffectivePermissions {
  module: string
  perms: EffectivePermissionItem[]
}

export interface AccessExplorerAccountInspectorProps {
  account: AccessAccountItem
  onClose: () => void
  inspectorTab: string
  onTabChange: (tab: string) => void
  canWrite: boolean
  effectivePermissionsList: EffectivePermissionItem[]
  groupedEffectivePermissions: GroupedEffectivePermissions[]
  availablePermModules: string[]
  selectedPermModule: string
  onSelectPermModule: (module: string) => void
  permSearch: string
  onPermSearchChange: (value: string) => void
  isDetailLoading: boolean
  onOpenQuickAccess: (account: AccessAccountItem) => void
  onResetPassword: (password: string) => void
  isResettingPassword: boolean
  onSetPendingSecurityAction: (action: 'deactivate' | 'revoke-sessions') => void
  onUnlockAccount: () => void
  isUnlockingAccount: boolean
}

export const AccessExplorerAccountInspector: FC<AccessExplorerAccountInspectorProps> = ({
  account,
  onClose,
  inspectorTab,
  onTabChange,
  canWrite,
  effectivePermissionsList,
  groupedEffectivePermissions,
  availablePermModules,
  selectedPermModule,
  onSelectPermModule,
  permSearch,
  onPermSearchChange,
  isDetailLoading,
  onOpenQuickAccess,
  onResetPassword,
  isResettingPassword,
  onSetPendingSecurityAction,
  onUnlockAccount,
  isUnlockingAccount,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [securityPasswordForm] = Form.useForm<{ password: string }>()

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} aria-hidden />
      <aside
        className={styles.drawerInspector}
        aria-label={t('auth.accessExplorer.accountInspector')}
      >
        {/* Header: Identity Bar + Meta */}
        <div className={styles.inspectorHeader}>
          <div className={styles.inspectorIdentityRow}>
            <EmployeeAvatar size={36} name={account.email} className={styles.inspectorAvatar} />
            <div className={styles.inspectorIdentityText}>
              <div className={styles.inspectorTitleRow}>
                <Typography.Title level={3} className={styles.inspectorTitle}>
                  {account.email}
                </Typography.Title>
                <StatusTag status={statusTone(account.status)}>
                  {account.status ?? t('auth.accessExplorer.unknown')}
                </StatusTag>
                {account.team?.name ? (
                  <Tag color="cyan" style={{ marginInlineEnd: 0 }}>
                    {account.team.name}
                  </Tag>
                ) : null}
              </div>
            </div>
            <Button
              aria-label={t('auth.accessExplorer.closeInspector')}
              className={styles.closeInspectorBtn}
              icon={<CloseOutlined />}
              onClick={onClose}
              type="text"
            />
          </div>

          {/* Meta Info Strip */}
          <div className={styles.inspectorMetaInline}>
            <span>
              {t('auth.accessExplorer.lastLogin')}:{' '}
              <strong>
                {account.lastLoginAt
                  ? dayjs(account.lastLoginAt).format('DD/MM/YYYY HH:mm')
                  : t('auth.accessExplorer.neverLoggedIn')}
              </strong>
              {account.lastLoginIp ? ` (IP: ${account.lastLoginIp})` : ''}
            </span>
            <span>•</span>
            <span>
              {account.roles?.length ?? 0} {t('auth.accessEditor.roles', 'vai trò')}
            </span>
            <span>•</span>
            <span>
              {effectivePermissionsList.length} {t('auth.accessEditor.permissions', 'quyền')}
            </span>
          </div>
        </div>

        <Tabs
          activeKey={inspectorTab}
          className={styles.inspectorTabs}
          onChange={onTabChange}
          items={[
            {
              key: 'overview',
              label: t('auth.accessExplorer.overview'),
              children: (
                <>
                  {/* Compact 1-line assigned scopes bar */}
                  <div className={styles.assignedScopesCompact}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        🛡️ {t('auth.accessExplorer.assignedScopes', 'Phân quyền')}:
                      </span>
                      <span style={{ color: 'var(--ant-color-text-secondary)' }}>
                        {t('auth.accessExplorer.globalScope', 'Toàn cục')}:
                      </span>
                      {account.roles?.length ? (
                        account.roles.map((r) => (
                          <Tag color="blue" key={r} style={{ marginInlineEnd: 0 }}>
                            {r}
                          </Tag>
                        ))
                      ) : (
                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                          {t('auth.accessExplorer.noRoles')}
                        </Typography.Text>
                      )}
                      {(account.roleAssignments ?? []).filter((a) => a.scopeType !== 'global')
                        .length > 0 ? (
                        <>
                          <span style={{ color: 'var(--ant-color-text-secondary)' }}>
                            • {t('auth.accessExplorer.scoped', 'Phạm vi')}:
                          </span>
                          {(account.roleAssignments ?? [])
                            .filter((a) => a.scopeType !== 'global')
                            .map((a, idx) => (
                              <Tag color="cyan" key={idx} style={{ marginInlineEnd: 0 }}>
                                {a.scopeType}: {a.roleCode}
                              </Tag>
                            ))}
                        </>
                      ) : null}
                    </div>
                    {canWrite && (
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0, height: 'auto', fontSize: 11 }}
                        onClick={() => navigate(`/auth/accounts/${account.id}/access`)}
                      >
                        {t('auth.accessExplorer.manageScopedAccess')} →
                      </Button>
                    )}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div className={styles.permMatrixHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Typography.Text strong style={{ fontSize: 13 }}>
                          ⚡ {t('auth.accessExplorer.effectiveMatrix', 'Quyền thực tế')}
                        </Typography.Text>
                        <Tag color="blue" style={{ borderRadius: 999 }}>
                          {effectivePermissionsList.length}
                        </Tag>
                      </div>
                      <Input
                        className={styles.permSearch}
                        size="small"
                        placeholder={t(
                          'auth.accessExplorer.searchPermissions',
                          'Tìm kiếm quyền...',
                        )}
                        value={permSearch}
                        onChange={(e) => onPermSearchChange(e.target.value)}
                        allowClear
                      />
                    </div>

                    {availablePermModules.length > 1 && (
                      <div className={styles.permModuleFilters} style={{ marginBottom: 10 }}>
                        {availablePermModules.map((mod) => (
                          <Button
                            key={mod}
                            size="small"
                            type={selectedPermModule === mod ? 'primary' : 'default'}
                            onClick={() => onSelectPermModule(mod)}
                            style={{ fontSize: 11, height: 22, padding: '0 8px' }}
                          >
                            {mod === 'ALL' ? t('auth.accessExplorer.allModules', 'Tất cả') : mod}
                          </Button>
                        ))}
                      </div>
                    )}

                    <div className={styles.permModulesList}>
                      {isDetailLoading ? (
                        <Skeleton active paragraph={{ rows: 3 }} />
                      ) : groupedEffectivePermissions.length === 0 ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {t(
                            'auth.accessExplorer.emptyPermissionsDescription',
                            'Tài khoản chưa có quyền hiệu lực nào.',
                          )}
                        </Typography.Text>
                      ) : (
                        groupedEffectivePermissions.map(({ module, perms }) => (
                          <div key={module} className={styles.permModuleCard}>
                            <div className={styles.permModuleTitle}>
                              <span>
                                {module} ({perms.length})
                              </span>
                            </div>
                            <div className={styles.permPillList}>
                              {perms.map((p) => (
                                <div key={p.code} className={styles.permPill}>
                                  <span>{p.code}</span>
                                  <span className={styles.provenanceBadge}>{p.provenance}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ),
            },
            {
              key: 'access',
              label: t('auth.accessEditor.globalAccess'),
              children: (
                <div className={styles.inspectorSection}>
                  <Typography.Text type="secondary">
                    {t('auth.accessExplorer.accessSummary')}
                  </Typography.Text>
                  <div className={styles.inspectorRoles}>
                    {account.roles?.length ? (
                      account.roles.map((accountRole) => (
                        <Tag color="blue" key={accountRole}>
                          {accountRole}
                        </Tag>
                      ))
                    ) : (
                      <Typography.Text type="secondary">
                        {t('auth.accessExplorer.noRoles')}
                      </Typography.Text>
                    )}
                  </div>
                  <Button
                    aria-label={t('auth.accessExplorer.editGlobalAccess')}
                    className={styles.inspectorTabAction}
                    disabled={!canWrite}
                    icon={<SettingOutlined />}
                    onClick={() => onOpenQuickAccess(account)}
                    size="small"
                    type="primary"
                  >
                    {t('auth.accessExplorer.editGlobalAccess')}
                  </Button>
                </div>
              ),
            },
            {
              key: 'security',
              label: t('auth.accessExplorer.securitySettings'),
              children: (
                <div className={styles.inspectorSection}>
                  <Typography.Text type="secondary">
                    {t('auth.accessExplorer.securitySummary')}
                  </Typography.Text>
                  <Form
                    className={styles.inspectorPasswordForm}
                    form={securityPasswordForm}
                    layout="vertical"
                    onFinish={({ password }) => {
                      onResetPassword(password)
                      securityPasswordForm.resetFields()
                    }}
                  >
                    <Form.Item
                      label={t('auth.accountSecurity.newPassword')}
                      name="password"
                      rules={[{ min: 6, required: true }]}
                    >
                      <Input.Password autoComplete="new-password" disabled={!canWrite} />
                    </Form.Item>
                    <Button
                      className={styles.inspectorTabAction}
                      disabled={!canWrite}
                      htmlType="submit"
                      loading={isResettingPassword}
                      size="small"
                      type="primary"
                    >
                      {t('auth.accountSecurity.resetPassword')}
                    </Button>
                  </Form>
                  <div className={styles.inspectorSecurityActions}>
                    <Button
                      disabled={!canWrite}
                      onClick={() => onSetPendingSecurityAction('revoke-sessions')}
                      size="small"
                    >
                      {t('auth.accountSecurity.revokeSessions')}
                    </Button>
                    {String(account.status ?? '').toLowerCase() === 'active' ? (
                      <Button
                        danger
                        disabled={!canWrite}
                        icon={<LockOutlined />}
                        onClick={() => onSetPendingSecurityAction('deactivate')}
                        size="small"
                      >
                        {t('auth.accountSecurity.deactivate')}
                      </Button>
                    ) : (
                      <Button
                        disabled={!canWrite}
                        icon={<UnlockOutlined />}
                        loading={isUnlockingAccount}
                        onClick={onUnlockAccount}
                        size="small"
                      >
                        {t('auth.accessExplorer.unlockAccount', 'Mở khóa tài khoản')}
                      </Button>
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </aside>
    </>
  )
}
