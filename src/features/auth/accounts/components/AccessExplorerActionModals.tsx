import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { DeleteOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Button, DatePicker, Form, Input, Modal, Select, Spin } from 'antd'
import type { Dayjs } from 'dayjs'

import { ConfirmDangerModal, PermissionCheckboxGroup } from '@/shared/ui'
import type { AccessAccountItem } from './AccessExplorerAccountsTable'
import styles from '../pages/AccessExplorerPage.module.scss'

export type ScopeType = 'global' | 'department' | 'team' | 'shop' | 'vendor' | 'own'

export type CreateAccountFormValues = {
  email: string
  password: string
  roleId?: string
  scopeType: ScopeType
  scopeId?: string
  customPermissionIds?: string[]
}

export type BulkAccessFormValues = {
  roleIds: string[]
  customPermissionIds: string[]
  validFrom?: Dayjs | null
  validUntil?: Dayjs | null
}

export interface PermissionSection {
  title: string
  options: { label: string; value: string }[]
}

export interface AccessExplorerActionModalsProps {
  // Quick Access Modal
  quickAccessAccount?: AccessAccountItem
  quickAccessForm: FormInstance<{
    roleIds: string[]
    customPermissionIds: string[]
    validFrom?: Dayjs | null
    validUntil?: Dayjs | null
  }>
  onCloseQuickAccess: () => void
  onSaveQuickAccess: (values: {
    roleIds?: string[]
    customPermissionIds?: string[]
    validFrom?: Dayjs | null
    validUntil?: Dayjs | null
  }) => void
  isOpeningQuickAccess: boolean
  isQuickAccessSaving: boolean

  // Bulk Assign Modal
  isBulkAssignOpen: boolean
  bulkAccessForm: FormInstance<BulkAccessFormValues>
  selectedAccountIdsCount: number
  onCloseBulkAssign: () => void
  onSaveBulkAccess: (values: {
    roleIds?: string[]
    customPermissionIds?: string[]
    validFrom?: Dayjs | null
    validUntil?: Dayjs | null
  }) => void
  isBulkAssignSaving: boolean

  // Create Account Modal
  isCreateOpen: boolean
  createForm: FormInstance<CreateAccountFormValues>
  createScopeType: ScopeType
  onScopeTypeChange: (scopeType: ScopeType) => void
  onCloseCreateAccount: () => void
  onSubmitCreateAccount: (values: CreateAccountFormValues) => void
  isCreateSaving: boolean
  requiresScopeId: boolean
  scopedScopeOptions: Array<{ label: string; value: string }>
  scopeTypeOptions: Array<{ label: string; value: string }>
  isScopeLoading: boolean

  // Shared Options
  createRoleOptions: Array<{ label: string; value: string }>
  isRoleCatalogLoading: boolean
  permissionSections: PermissionSection[]

  // Security Action Modal
  pendingInspectorSecurityAction?: 'deactivate' | 'revoke-sessions'
  onCancelSecurityAction: () => void
  onConfirmSecurityAction: () => void
  isSecurityActionPending: boolean

  // Bulk Revoke Modal
  isBulkRevokeOpen: boolean
  onCancelBulkRevoke: () => void
  onConfirmBulkRevoke: () => void
  isBulkRevoking: boolean
}

export const AccessExplorerActionModals: FC<AccessExplorerActionModalsProps> = ({
  quickAccessAccount,
  quickAccessForm,
  onCloseQuickAccess,
  onSaveQuickAccess,
  isOpeningQuickAccess,
  isQuickAccessSaving,
  isBulkAssignOpen,
  bulkAccessForm,
  selectedAccountIdsCount,
  onCloseBulkAssign,
  onSaveBulkAccess,
  isBulkAssignSaving,
  isCreateOpen,
  createForm,
  createScopeType,
  onScopeTypeChange,
  onCloseCreateAccount,
  onSubmitCreateAccount,
  isCreateSaving,
  requiresScopeId,
  scopedScopeOptions,
  scopeTypeOptions,
  isScopeLoading,
  createRoleOptions,
  isRoleCatalogLoading,
  permissionSections,
  pendingInspectorSecurityAction,
  onCancelSecurityAction,
  onConfirmSecurityAction,
  isSecurityActionPending,
  isBulkRevokeOpen,
  onCancelBulkRevoke,
  onConfirmBulkRevoke,
  isBulkRevoking,
}) => {
  const { t } = useTranslation()

  return (
    <>
      {/* Quick Access Modal */}
      <Modal
        open={Boolean(quickAccessAccount)}
        title={`${t('auth.accessEditor.globalAccess')} - ${quickAccessAccount?.email ?? ''}`}
        onCancel={onCloseQuickAccess}
        width={1180}
        styles={{ body: { paddingBottom: 16 } }}
        footer={null}
        destroyOnHidden
      >
        <Spin spinning={isOpeningQuickAccess}>
          <Form form={quickAccessForm} layout="vertical" onFinish={onSaveQuickAccess}>
            <Form.Item label={t('auth.accessEditor.roles')} name="roleIds">
              <Select mode="multiple" options={createRoleOptions} loading={isRoleCatalogLoading} />
            </Form.Item>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Form.Item
                label={t('auth.accessEditor.validFrom', 'Valid from')}
                name="validFrom"
                style={{ flex: 1, minWidth: 220 }}
              >
                <DatePicker showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
              <Form.Item
                label={t('auth.accessEditor.validUntil', 'Valid until')}
                name="validUntil"
                style={{ flex: 1, minWidth: 220 }}
              >
                <DatePicker showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </div>
            <Form.Item label={t('auth.accessEditor.customPermissions')} name="customPermissionIds">
              <PermissionCheckboxGroup
                sections={permissionSections}
                columns={4}
                searchPlaceholder={t('auth.accessEditor.searchPermissions')}
                emptyText={t('auth.accessEditor.emptyPermissionSearch')}
              />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={onCloseQuickAccess}>{t('auth.accessEditor.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={isQuickAccessSaving}>
                {t('auth.accessEditor.saveGlobal')}
              </Button>
            </div>
          </Form>
        </Spin>
      </Modal>

      {/* Bulk Assign Modal */}
      <Modal
        open={isBulkAssignOpen}
        title={t('auth.accessEditor.globalAccess')}
        onCancel={onCloseBulkAssign}
        width={1180}
        styles={{ body: { paddingBottom: 16 } }}
        footer={null}
        destroyOnHidden
      >
        <p>
          {t(
            'auth.accessExplorer.selectedAccounts',
            `${selectedAccountIdsCount} account(s) selected`,
          )}
        </p>
        <Form form={bulkAccessForm} layout="vertical" onFinish={onSaveBulkAccess}>
          <Form.Item label={t('auth.accessEditor.roles')} name="roleIds">
            <Select mode="multiple" options={createRoleOptions} loading={isRoleCatalogLoading} />
          </Form.Item>
          <Form.Item label={t('auth.accessEditor.customPermissions')} name="customPermissionIds">
            <PermissionCheckboxGroup
              sections={permissionSections}
              columns={4}
              searchPlaceholder={t('auth.accessEditor.searchPermissions')}
              emptyText={t('auth.accessEditor.emptyPermissionSearch')}
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Form.Item
              label={t('auth.accessEditor.validFrom', 'Valid from')}
              name="validFrom"
              style={{ flex: 1, minWidth: 220 }}
            >
              <DatePicker showTime format="DD/MM/YYYY HH:mm" />
            </Form.Item>
            <Form.Item
              label={t('auth.accessEditor.validUntil', 'Valid until')}
              name="validUntil"
              style={{ flex: 1, minWidth: 220 }}
            >
              <DatePicker showTime format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onCloseBulkAssign}>{t('auth.accessEditor.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={isBulkAssignSaving}>
              {t('auth.accessEditor.saveGlobal')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Create Account Modal */}
      <Modal
        open={isCreateOpen}
        title={t('auth.accessExplorer.createAccount')}
        onCancel={onCloseCreateAccount}
        width={1180}
        styles={{ body: { paddingBottom: 16 } }}
        footer={null}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={onSubmitCreateAccount}>
          <Form.Item
            label={t('auth.accountDetail.email')}
            name="email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label={t('auth.login.password')} name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            label={t('auth.accessEditor.roles')}
            name="roleId"
            rules={[{ required: true }]}
          >
            <Select options={createRoleOptions} loading={isRoleCatalogLoading} />
          </Form.Item>
          <div className={styles.scopeRow}>
            <Form.Item
              label={t('auth.accessExplorer.scopeType')}
              name="scopeType"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select
                options={scopeTypeOptions}
                value={createScopeType}
                onChange={(scopeType) => onScopeTypeChange(scopeType as ScopeType)}
              />
            </Form.Item>
            {requiresScopeId ? (
              <Form.Item
                label={t('auth.accessEditor.scope')}
                name="scopeId"
                rules={[{ required: true }]}
                style={{ flex: 1 }}
              >
                <Select options={scopedScopeOptions} loading={isScopeLoading} />
              </Form.Item>
            ) : null}
          </div>
          <Form.Item label={t('auth.accessEditor.customPermissions')} name="customPermissionIds">
            <PermissionCheckboxGroup
              sections={permissionSections}
              columns={4}
              searchPlaceholder={t('auth.accessEditor.searchPermissions')}
              emptyText={t('auth.accessEditor.emptyPermissionSearch')}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onCloseCreateAccount}>{t('auth.accessEditor.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={isCreateSaving}>
              {t('auth.accessExplorer.create')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Security Action Modal */}
      <ConfirmDangerModal
        open={Boolean(pendingInspectorSecurityAction)}
        title={
          pendingInspectorSecurityAction === 'revoke-sessions'
            ? t('auth.accountSecurity.revokeSessionsTitle')
            : t('auth.accountSecurity.deactivateTitle')
        }
        description={
          pendingInspectorSecurityAction === 'revoke-sessions'
            ? t('auth.accountSecurity.revokeSessionsDescription')
            : t('auth.accountSecurity.deactivateDescription')
        }
        confirmLabel={
          pendingInspectorSecurityAction === 'revoke-sessions'
            ? t('auth.accountSecurity.revokeSessions')
            : t('auth.accountSecurity.deactivate')
        }
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={isSecurityActionPending}
        onCancel={onCancelSecurityAction}
        onConfirm={onConfirmSecurityAction}
      />

      {/* Bulk Revoke Modal */}
      <ConfirmDangerModal
        open={isBulkRevokeOpen}
        title={t('auth.accessExplorer.bulkRevokeTitle', 'Revoke selected access now?')}
        description={t(
          'auth.accessExplorer.bulkRevokeDescription',
          'This immediately removes global access from selected accounts. Scoped access is not changed.',
        )}
        confirmIcon={<DeleteOutlined aria-hidden />}
        confirmLabel={t('auth.accessExplorer.bulkRevoke', 'Revoke now')}
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={isBulkRevoking}
        onCancel={onCancelBulkRevoke}
        onConfirm={onConfirmBulkRevoke}
      />
    </>
  )
}
