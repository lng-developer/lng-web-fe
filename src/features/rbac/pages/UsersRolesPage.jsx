import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import { Box, Button, Paper, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import ConfirmDialog from '@/components/common/ConfirmDialog'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { useAuthStore } from '@/store/useAuthStore'

import {
  useCreateAccessAssignmentMutation,
  useCreateAccountMutation,
  useCreatePermissionMutation,
  useCreateRoleMutation,
  useCreateScopeMutation,
  useDeactivateAccessAssignmentMutation,
  useDeactivateScopeMutation,
  useDeletePermissionMutation,
  useDeleteRoleMutation,
  useResetAccountPasswordMutation,
  useRevokeAccountSessionsMutation,
  useSetScopedRolePermissionsMutation,
  useUpdateAccessAssignmentMutation,
  useUpdateAccountAccessMutation,
  useUpdateAccountStatusMutation,
  useUpdatePermissionMutation,
  useUpdateRoleMutation,
  useUpdateScopeMutation,
} from '../api/rbac.mutations'
import {
  useAccountsQuery,
  useDepartmentsQuery,
  usePermissionsQuery,
  useRolesQuery,
  useScopedRolePermissionsQuery,
  useScopesQuery,
  useTeamsQuery,
} from '../api/rbac.queries'
import {
  AccessExplorer,
  AccountFormDialog,
  EditAccessDialog,
  GrantPermissionModal,
  GrantScopedPermissionModal,
  PermissionDialog,
  RoleDialog,
  RolesPoliciesWorkspace,
  ScopeDialog,
  ScopeMatrixWorkspace,
} from '../components'
import { getItems, getPagination } from '../components/shared'
import { getRbacCapabilities } from '../utils/rbacAccess'
import { getOverrideRoleName } from '../utils/scopedOverridesDisplay'
import { buildAddScopePayload } from '../utils/scopesDisplay'
import { resolveSelectedAccountId } from '../utils/usersDisplay'

const WORKSPACES = {
  ACCESS: 'access',
  POLICIES: 'policies',
  MATRIX: 'matrix',
}

export default function UsersRolesPage() {
  const { i18n, t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAuthStore((state) => state.currentUser)
  const { canWrite } = getRbacCapabilities(currentUser)
  const [searchParams, setSearchParams] = useSearchParams()
  const [workspace, setWorkspace] = useState(WORKSPACES.ACCESS)
  const [accountFilters, setAccountFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    roleId: '',
    departmentId: '',
    teamId: '',
  })
  const [roleSearch, setRoleSearch] = useState('')
  const [permissionFilters, setPermissionFilters] = useState({
    search: '',
    module: '',
    action: '',
  })
  const [scopeFilters, setScopeFilters] = useState({
    search: '',
    scopeType: '',
    status: '',
  })
  const [dialog, setDialog] = useState({ type: null, payload: null })
  const [confirmDialog, setConfirmDialog] = useState(null)

  const accountsQuery = useAccountsQuery(accountFilters)
  const rolesQuery = useRolesQuery({ search: roleSearch })
  const permissionsQuery = usePermissionsQuery()
  const scopesQuery = useScopesQuery()
  const rulesQuery = useScopedRolePermissionsQuery()
  const departmentsQuery = useDepartmentsQuery()
  const teamsQuery = useTeamsQuery()

  const accounts = getItems(accountsQuery.data)
  const roles = getItems(rolesQuery.data)
  const permissions = getItems(permissionsQuery.data)
  const scopes = getItems(scopesQuery.data)
  const rules = getItems(rulesQuery.data)
  const departments = getItems(departmentsQuery.data)
  const teams = getItems(teamsQuery.data)
  const pagination = getPagination(accountsQuery.data)
  const requestedAccountId = searchParams.get('accountId') || ''
  const selectedAccountId = resolveSelectedAccountId(accounts, requestedAccountId)

  useEffect(() => {
    if (requestedAccountId || !selectedAccountId) return
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('accountId', selectedAccountId)
        return next
      },
      { replace: true },
    )
  }, [requestedAccountId, selectedAccountId, setSearchParams])

  const createAccountMutation = useCreateAccountMutation()
  const updateAccountStatusMutation = useUpdateAccountStatusMutation()
  const resetAccountPasswordMutation = useResetAccountPasswordMutation()
  const revokeAccountSessionsMutation = useRevokeAccountSessionsMutation()
  const createAccessAssignmentMutation = useCreateAccessAssignmentMutation()
  const updateAccessAssignmentMutation = useUpdateAccessAssignmentMutation()
  const updateAccountAccessMutation = useUpdateAccountAccessMutation()
  const deactivateAccessAssignmentMutation = useDeactivateAccessAssignmentMutation()
  const createRoleMutation = useCreateRoleMutation()
  const updateRoleMutation = useUpdateRoleMutation()
  const deleteRoleMutation = useDeleteRoleMutation()
  const createPermissionMutation = useCreatePermissionMutation()
  const updatePermissionMutation = useUpdatePermissionMutation()
  const deletePermissionMutation = useDeletePermissionMutation()
  const createScopeMutation = useCreateScopeMutation()
  const updateScopeMutation = useUpdateScopeMutation()
  const deactivateScopeMutation = useDeactivateScopeMutation()
  const setScopedRolePermissionsMutation = useSetScopedRolePermissionsMutation()

  const notifyError = (error) => {
    enqueueSnackbar(error?.message || t('rbac.common.requestFailed'), {
      variant: SNACKBAR_VARIANTS.ERROR,
    })
  }

  const runMutation = (mutation, payload, successMessage, onSuccess) => {
    if (!canWrite) {
      notifyError({ message: t('rbac.common.readOnly') })
      return
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        enqueueSnackbar(successMessage, { variant: SNACKBAR_VARIANTS.SUCCESS })
        onSuccess?.()
      },
      onError: notifyError,
    })
  }

  const closeDialog = () => setDialog({ type: null, payload: null })
  const selectAccount = (accountId) => {
    const next = new URLSearchParams(searchParams)
    next.set('accountId', accountId)
    setSearchParams(next, { replace: true })
  }
  const workspaceDescription = t(`rbac.workspaces.${workspace}.description`)
  const accessMutationPending =
    createAccessAssignmentMutation.isPending ||
    updateAccountAccessMutation.isPending ||
    updateAccessAssignmentMutation.isPending ||
    deactivateAccessAssignmentMutation.isPending

  const editReplacement = (cell) => {
    if (cell.rule) {
      setDialog({
        type: 'grant-permission',
        payload: {
          section: {
            role: cell.role,
            roleId: cell.role.id,
            roleName: getOverrideRoleName(cell.role),
          },
          group: { ...cell.rule, scope: cell.scope },
        },
      })
      return
    }

    setDialog({
      type: 'scoped-grant',
      payload: { role: cell.role, initialScope: cell.scope },
    })
  }

  return (
    <Stack className="gap-5">
      <Paper elevation={0} className="rounded-xl border border-border bg-surface p-5">
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          className="gap-4 lg:items-center lg:justify-between"
        >
          <Box>
            <Typography variant="h5" className="font-semibold text-ink">
              {t('rbac.title')}
            </Typography>
            <Typography variant="body2" className="mt-1 max-w-3xl text-ink-muted">
              {workspaceDescription}
            </Typography>
          </Box>
          {canWrite && workspace === WORKSPACES.ACCESS && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialog({ type: 'add-account', payload: null })}
            >
              {t('rbac.users.actions.addUser')}
            </Button>
          )}
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        className="overflow-x-auto rounded-xl border border-border bg-surface px-2"
      >
        <Tabs
          value={workspace}
          variant="scrollable"
          scrollButtons={false}
          onChange={(_, value) => setWorkspace(value)}
        >
          {Object.values(WORKSPACES).map((value) => (
            <Tab
              key={value}
              value={value}
              label={t(`rbac.workspaces.${value}.label`)}
              className="!min-h-12 !normal-case"
            />
          ))}
        </Tabs>
      </Paper>

      {workspace === WORKSPACES.ACCESS && (
        <AccessExplorer
          accounts={accounts}
          accountsQuery={accountsQuery}
          filters={accountFilters}
          pagination={pagination}
          selectedAccountId={selectedAccountId}
          roles={roles}
          permissions={permissions}
          departments={departments}
          teams={teams}
          canWrite={canWrite}
          statusPending={updateAccountStatusMutation.isPending}
          passwordPending={resetAccountPasswordMutation.isPending}
          sessionsPending={revokeAccountSessionsMutation.isPending}
          onFiltersChange={setAccountFilters}
          onSelectAccount={selectAccount}
          onEditAccess={() => setDialog({ type: 'edit-access', payload: selectedAccountId })}
          onUpdateStatus={(payload) =>
            runMutation(
              updateAccountStatusMutation,
              payload,
              t('rbac.users.viewModal.updateStatusSuccess'),
            )
          }
          onResetPassword={(payload, done) =>
            runMutation(
              resetAccountPasswordMutation,
              payload,
              t('rbac.users.viewModal.resetPasswordSuccess'),
              done,
            )
          }
          onRevokeSessions={(accountId) =>
            runMutation(
              revokeAccountSessionsMutation,
              accountId,
              t('rbac.users.viewModal.revokeSessionsSuccess'),
            )
          }
          t={t}
          i18n={i18n}
        />
      )}

      {workspace === WORKSPACES.POLICIES && (
        <RolesPoliciesWorkspace
          roles={roles}
          rolesQuery={rolesQuery}
          permissions={permissions}
          permissionsQuery={permissionsQuery}
          roleSearch={roleSearch}
          permissionFilters={permissionFilters}
          canWrite={canWrite}
          deleteRolePending={deleteRoleMutation.isPending}
          onRoleSearch={setRoleSearch}
          onPermissionFiltersChange={setPermissionFilters}
          onCreateRole={() => setDialog({ type: 'role', payload: null })}
          onEditRole={(role) => setDialog({ type: 'role', payload: role })}
          onDeleteRole={(role) => {
            setConfirmDialog({
              title: t('rbac.roles.actions.deleteConfirmTitle', { defaultValue: 'Delete role' }),
              description: t('rbac.roles.actions.deleteConfirm'),
              confirmLabel: t('common.delete'),
              onConfirm: () => {
                runMutation(deleteRoleMutation, role.id, t('rbac.roles.actions.deleteSuccess'))
                setConfirmDialog(null)
              },
            })
          }}
          onCreatePermission={() => setDialog({ type: 'permission', payload: null })}
          onEditPermission={(permission) => setDialog({ type: 'permission', payload: permission })}
          t={t}
        />
      )}

      {workspace === WORKSPACES.MATRIX && (
        <ScopeMatrixWorkspace
          roles={roles}
          scopes={scopes}
          scopesQuery={scopesQuery}
          rules={rules}
          rulesQuery={rulesQuery}
          filters={scopeFilters}
          canWrite={canWrite}
          scopeMutationPending={
            createScopeMutation.isPending ||
            updateScopeMutation.isPending ||
            deactivateScopeMutation.isPending
          }
          onFiltersChange={setScopeFilters}
          onEditReplacement={editReplacement}
          onCreateScope={() => setDialog({ type: 'scope', payload: null })}
          onEditScope={(scope) => setDialog({ type: 'scope', payload: scope })}
          onToggleScope={(scope, active) => {
            if (active) {
              runMutation(
                updateScopeMutation,
                { scopeRegistryId: scope.id, values: { status: 'active' } },
                t('rbac.scopes.toggleSuccess'),
              )
              return
            }
            runMutation(deactivateScopeMutation, scope.id, t('rbac.scopes.toggleSuccess'))
          }}
          t={t}
        />
      )}

      <AccountFormDialog
        open={canWrite && dialog.type === 'add-account'}
        onClose={closeDialog}
        roles={roles}
        t={t}
        pending={createAccountMutation.isPending}
        onSubmit={(values, done) =>
          runMutation(createAccountMutation, values, t('rbac.users.addModal.success'), done)
        }
      />

      <EditAccessDialog
        key={dialog.type === 'edit-access' ? dialog.payload : 'edit-access-closed'}
        open={canWrite && dialog.type === 'edit-access'}
        accountId={dialog.payload}
        roles={roles}
        permissions={permissions}
        scopes={scopes}
        pending={accessMutationPending}
        onClose={closeDialog}
        t={t}
        onUpdateGlobalAccess={(payload, done) =>
          runMutation(
            updateAccountAccessMutation,
            payload,
            t('rbac.users.editAccessModal.globalAccessSuccess'),
            done,
          )
        }
        onCreateScopedAssignment={(payload, done) =>
          runMutation(
            createAccessAssignmentMutation,
            payload,
            t('rbac.users.editAccessModal.success'),
            done,
          )
        }
        onUpdateAssignment={(payload, done) =>
          runMutation(
            updateAccessAssignmentMutation,
            payload,
            t('rbac.users.editAccessModal.success'),
            done,
          )
        }
        onDeleteAssignment={(assignmentId) =>
          runMutation(
            deactivateAccessAssignmentMutation,
            assignmentId,
            t('rbac.users.editAccessModal.success'),
          )
        }
      />

      <RoleDialog
        key={dialog.type === 'role' ? (dialog.payload?.id ?? 'role-new') : 'role-closed'}
        open={canWrite && dialog.type === 'role'}
        mode={dialog.payload ? 'edit' : 'create'}
        value={dialog.payload}
        permissions={permissions}
        permissionsPending={permissionsQuery.isPending}
        pending={createRoleMutation.isPending || updateRoleMutation.isPending}
        onClose={closeDialog}
        t={t}
        onSubmit={(values) =>
          dialog.payload
            ? runMutation(
                updateRoleMutation,
                { roleId: dialog.payload.id, values },
                t('rbac.roles.editModal.success'),
                closeDialog,
              )
            : runMutation(createRoleMutation, values, t('rbac.roles.addModal.success'), closeDialog)
        }
      />

      <PermissionDialog
        key={
          dialog.type === 'permission'
            ? (dialog.payload?.id ?? 'permission-new')
            : 'permission-closed'
        }
        open={canWrite && dialog.type === 'permission'}
        value={dialog.payload}
        pending={createPermissionMutation.isPending || updatePermissionMutation.isPending}
        deletePending={deletePermissionMutation.isPending}
        onClose={closeDialog}
        t={t}
        onDelete={(permissionId) =>
          runMutation(
            deletePermissionMutation,
            permissionId,
            t('rbac.permissions.editModal.deleteSuccess'),
            closeDialog,
          )
        }
        onSubmit={(values) =>
          dialog.payload
            ? runMutation(
                updatePermissionMutation,
                { permissionId: dialog.payload.id, values },
                t('rbac.permissions.editModal.success'),
                closeDialog,
              )
            : runMutation(
                createPermissionMutation,
                values,
                t('rbac.permissions.addModal.success'),
                closeDialog,
              )
        }
      />

      <ScopeDialog
        key={dialog.type === 'scope' ? (dialog.payload?.id ?? 'scope-new') : 'scope-closed'}
        open={dialog.type === 'scope'}
        value={dialog.payload}
        departments={departments}
        teams={teams}
        pending={createScopeMutation.isPending || updateScopeMutation.isPending}
        canWrite={canWrite}
        onClose={closeDialog}
        t={t}
        onSubmit={(values) => {
          if (dialog.payload) {
            runMutation(
              updateScopeMutation,
              { scopeRegistryId: dialog.payload.id, values: { name: values.name } },
              t('rbac.scopes.editModal.success'),
              closeDialog,
            )
            return
          }

          const { payload, errorKey } = buildAddScopePayload(values, departments, teams)
          if (errorKey) {
            notifyError({ message: t(errorKey) })
            return
          }
          runMutation(createScopeMutation, payload, t('rbac.scopes.addModal.success'), closeDialog)
        }}
      />

      <GrantPermissionModal
        key={
          dialog.type === 'grant-permission'
            ? `${dialog.payload?.section?.roleId}-${dialog.payload?.group?.scopeId}`
            : 'grant-permission-closed'
        }
        open={canWrite && dialog.type === 'grant-permission'}
        context={dialog.payload}
        permissions={permissions}
        pending={setScopedRolePermissionsMutation.isPending}
        onClose={closeDialog}
        t={t}
        onSubmit={(values) =>
          runMutation(
            setScopedRolePermissionsMutation,
            values,
            t('rbac.scopedOverrides.grantModal.success'),
            closeDialog,
          )
        }
      />

      <GrantScopedPermissionModal
        key={
          dialog.type === 'scoped-grant'
            ? `${dialog.payload?.role?.id}-${dialog.payload?.initialScope?.scopeId}`
            : 'scoped-grant-closed'
        }
        open={canWrite && dialog.type === 'scoped-grant'}
        role={dialog.payload?.role}
        initialScope={dialog.payload?.initialScope}
        scopes={scopes}
        permissions={permissions}
        rules={rules}
        pending={setScopedRolePermissionsMutation.isPending}
        onClose={closeDialog}
        t={t}
        onSubmit={(values) =>
          runMutation(
            setScopedRolePermissionsMutation,
            values,
            t('rbac.scopedOverrides.scopedGrantModal.success'),
            closeDialog,
          )
        }
      />

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel}
        loading={deleteRoleMutation.isPending}
        onClose={() => setConfirmDialog(null)}
        onConfirm={confirmDialog?.onConfirm}
      />
    </Stack>
  )
}
