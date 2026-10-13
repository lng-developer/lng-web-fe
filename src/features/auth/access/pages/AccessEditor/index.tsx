import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Form, Modal, Select, Tag, Tooltip, Typography } from 'antd'

import { AccessDeniedResult } from '@/shared/auth/AccessDeniedResult'
import {
  ConfirmDangerModal,
  DateTimePicker,
  EmptyState,
  FeedbackAlert,
  LoadingState,
  PageHeader,
  PermissionCheckboxGroup,
  SectionCard,
  StatusTag,
} from '@/shared/ui'

import styles from '../AccessEditorPage.module.scss'
import { useAccessEditor } from './useAccessEditor'

export const AccessEditorPage = () => {
  const [
    {
      t,
      globalForm,
      assignmentForm,
      overrideForm,
      editingAssignment,
      isAssignmentOpen,
      overrideAssignment,
      assignmentToDelete,
      scopeOptions,
      roleOptions,
      permissionSections,
      accountStatus,
      globalMutation,
      assignmentMutation,
      deleteMutation,
      overrideMutation,
      openAssignment,
      closeAssignment,
      openOverride,
      closeOverride,
      openDeleteAssignment,
      closeDeleteAssignment,
      submitGlobalAccess,
      submitAssignment,
      submitOverride,
      confirmDeleteAssignment,
      getScopeIcon,
      getScopeName,
      getRoleName,
      getAssignmentWindowText,
      backToAccounts,
    },
    { canWrite, accessExplorer },
  ] = useAccessEditor()

  const { data, error, isLoading, refetch } = accessExplorer

  if (!canWrite) return <AccessDeniedResult />

  return (
    <section className={styles.page}>
      <PageHeader
        actions={
          <Button icon={<ArrowLeftOutlined aria-hidden />} onClick={backToAccounts}>
            {t('auth.accessEditor.backToAccounts')}
          </Button>
        }
      />

      {isLoading ? <LoadingState variant="page" /> : null}

      {error ? (
        <FeedbackAlert
          type="error"
          title={t('auth.accessExplorer.unavailable')}
          description={t('auth.accessExplorer.unavailableDescription')}
          action={
            <Button
              type="link"
              icon={<ReloadOutlined aria-hidden />}
              onClick={() => void refetch()}
            >
              {t('auth.accessExplorer.retry')}
            </Button>
          }
        />
      ) : null}

      {data ? (
        <>
          <div className={styles.accountSummary}>
            <Avatar size={48} icon={<SafetyCertificateOutlined />} />
            <div>
              <Typography.Title level={4} className={styles.accountTitle}>
                {data.account.account.email}
              </Typography.Title>
              <StatusTag
                status={accountStatus.toLowerCase() === 'active' ? 'approved' : 'cancelled'}
              >
                {accountStatus || t('auth.accessExplorer.unknown')}
              </StatusTag>
            </div>
          </div>

          <div className={styles.grid}>
            <SectionCard title={t('auth.accessEditor.globalAccess')}>
              <Typography.Text type="secondary" className={styles.hint}>
                {t('auth.accessEditor.globalAccessHint')}
              </Typography.Text>

              <Form form={globalForm} layout="vertical" onFinish={submitGlobalAccess}>
                <Form.Item label={t('auth.accessEditor.roles')} name="roleIds">
                  <Select mode="multiple" options={roleOptions} />
                </Form.Item>

                <div className={styles.globalWindow}>
                  <Form.Item label={t('auth.accessEditor.validFrom')} name="validFrom">
                    <DateTimePicker mode="datetime" />
                  </Form.Item>
                  <Form.Item label={t('auth.accessEditor.validUntil')} name="validUntil">
                    <DateTimePicker mode="datetime" />
                  </Form.Item>
                </div>

                <Form.Item
                  label={t('auth.accessEditor.customPermissions')}
                  name="customPermissionIds"
                >
                  <PermissionCheckboxGroup
                    sections={permissionSections}
                    columns={4}
                    searchPlaceholder={t('auth.accessEditor.searchPermissions')}
                    emptyText={t('auth.accessEditor.emptyPermissionSearch')}
                  />
                </Form.Item>

                <Button
                  htmlType="submit"
                  type="primary"
                  icon={<SaveOutlined aria-hidden />}
                  loading={globalMutation.isPending}
                >
                  {t('auth.accessEditor.saveGlobal')}
                </Button>
              </Form>
            </SectionCard>

            <SectionCard>
              <div className={styles.scopedTitleBar}>
                <div>
                  <Typography.Title level={4} className={styles.scopedTitle}>
                    {t('auth.accessEditor.scopedAccess')}
                  </Typography.Title>
                  <Typography.Text type="secondary" className={styles.scopedSubtitle}>
                    {t('auth.accessEditor.scopedAccessHint')}
                  </Typography.Text>
                </div>

                <Button
                  type="primary"
                  ghost
                  icon={<PlusOutlined aria-hidden />}
                  onClick={() => openAssignment()}
                >
                  {t('auth.accessEditor.addScoped')}
                </Button>
              </div>

              <div className={styles.assignmentList}>
                {(data.assignments.items ?? []).map((item) => (
                  <div key={item.id} className={styles.assignmentCard}>
                    <div className={styles.assignmentIdentity}>
                      <Avatar
                        style={{ backgroundColor: '#f0f2f5', color: '#1890ff' }}
                        icon={getScopeIcon(item.scopeType)}
                      />
                      <div className={styles.assignmentInfo}>
                        <Typography.Text strong>{getScopeName(item)}</Typography.Text>
                        <Typography.Text type="secondary" className={styles.assignmentMeta}>
                          {item.scopeType}
                        </Typography.Text>
                      </div>
                    </div>

                    <div className={styles.assignmentRole}>
                      <Tag color="blue" style={{ borderRadius: 4, fontWeight: 500 }}>
                        {getRoleName(item)}
                      </Tag>
                      <Tag style={{ borderRadius: 4 }}>{getAssignmentWindowText(item)}</Tag>
                      {item.customPermissionIds?.length ? (
                        <Tag style={{ borderRadius: 4 }}>
                          {t('auth.accessEditor.permissionCount', {
                            count: item.customPermissionIds.length,
                          })}
                        </Tag>
                      ) : null}
                    </div>

                    <div className={styles.assignmentActions}>
                      <Tooltip title={t('auth.accessEditor.edit', 'Edit')}>
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => openAssignment(item)}
                        />
                      </Tooltip>
                      <Tooltip
                        title={t('auth.accessEditor.overridePermissions', 'Override Permissions')}
                      >
                        <Button
                          type="text"
                          icon={<SettingOutlined />}
                          onClick={() => openOverride(item)}
                        />
                      </Tooltip>
                      <Tooltip title={t('auth.accessEditor.delete', 'Delete')}>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => openDeleteAssignment(item)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                ))}

                {(data.assignments.items ?? []).length === 0 ? (
                  <EmptyState
                    title={t('auth.accessEditor.emptyAssignments')}
                    description={t('auth.accessEditor.emptyAssignmentsDescription')}
                    action={
                      <Button
                        type="primary"
                        ghost
                        icon={<PlusOutlined aria-hidden />}
                        onClick={() => openAssignment()}
                      >
                        {t('auth.accessEditor.addScoped')}
                      </Button>
                    }
                  />
                ) : null}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      <Modal
        open={isAssignmentOpen}
        title={
          editingAssignment ? t('auth.accessEditor.editScoped') : t('auth.accessEditor.addScoped')
        }
        width={1180}
        onCancel={closeAssignment}
        footer={null}
        destroyOnHidden
      >
        <Form form={assignmentForm} layout="vertical" onFinish={submitAssignment}>
          <Form.Item
            label={t('auth.accessEditor.scope')}
            name="scopeId"
            rules={[{ required: true }]}
          >
            <Select options={scopeOptions} />
          </Form.Item>

          <Form.Item label={t('auth.accessEditor.role')} name="roleId" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>

          <Form.Item label={t('auth.accessEditor.customPermissions')} name="customPermissionIds">
            <PermissionCheckboxGroup
              sections={permissionSections}
              columns={4}
              searchPlaceholder={t('auth.accessEditor.searchPermissions')}
              emptyText={t('auth.accessEditor.emptyPermissionSearch')}
            />
          </Form.Item>

          <Form.Item label={t('auth.accessEditor.validFrom')} name="validFrom">
            <DateTimePicker mode="datetime" />
          </Form.Item>

          <Form.Item label={t('auth.accessEditor.validUntil')} name="validUntil">
            <DateTimePicker mode="datetime" />
          </Form.Item>

          <div className={styles.formActions}>
            <Button onClick={closeAssignment}>{t('auth.accessEditor.cancel')}</Button>
            <Button
              htmlType="submit"
              type="primary"
              icon={<SaveOutlined />}
              loading={assignmentMutation.isPending}
            >
              {t('auth.accessEditor.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        open={overrideAssignment !== undefined}
        title={t('auth.accessEditor.overridePermissions')}
        width={1180}
        onCancel={closeOverride}
        footer={null}
        destroyOnHidden
      >
        <Form form={overrideForm} layout="vertical" onFinish={submitOverride}>
          <Form.Item label={t('auth.accessEditor.permissions')} name="permissionIds">
            <PermissionCheckboxGroup
              sections={permissionSections}
              columns={4}
              searchPlaceholder={t('auth.accessEditor.searchPermissions')}
              emptyText={t('auth.accessEditor.emptyPermissionSearch')}
            />
          </Form.Item>

          <div className={styles.formActions}>
            <Button onClick={closeOverride}>{t('auth.accessEditor.cancel')}</Button>
            <Button
              htmlType="submit"
              type="primary"
              icon={<SaveOutlined />}
              loading={overrideMutation.isPending}
            >
              {t('auth.accessEditor.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      <ConfirmDangerModal
        open={assignmentToDelete !== undefined}
        title={t('auth.accessEditor.deleteAssignment')}
        description={t('auth.accessEditor.deleteAssignmentDescription')}
        confirmIcon={<DeleteOutlined aria-hidden />}
        confirmLabel={t('auth.accessEditor.delete')}
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={deleteMutation.isPending}
        onCancel={closeDeleteAssignment}
        onConfirm={confirmDeleteAssignment}
      />
    </section>
  )
}
