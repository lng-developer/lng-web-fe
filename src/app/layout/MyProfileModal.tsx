import { useTranslation } from 'react-i18next'
import { UserOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Avatar, Button, Descriptions, Modal, Skeleton, Space, Tag, Typography } from 'antd'

import { loadEmployeeAvatar, loadMyEmployeeProfile } from '@/features/hr/api/hrApi'

import styles from './MyProfileModal.module.scss'

const emptyValue = '\u2014'

export function MyProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const profile = useQuery({
    queryKey: ['hr', 'employee-profiles', 'me'],
    queryFn: loadMyEmployeeProfile,
    enabled: open,
  })
  const avatar = useQuery({
    queryKey: ['hr', 'employee-profiles', 'me', 'avatar', profile.data?.avatarAssetId],
    queryFn: () => loadEmployeeAvatar(profile.data!.avatarUrl!),
    enabled: open && Boolean(profile.data?.avatarAssetId && profile.data.avatarUrl),
  })

  return (
    <Modal
      destroyOnHidden
      open={open}
      width={760}
      title={t('shell.account.myProfile')}
      footer={<Button onClick={onClose}>{t('shell.account.close')}</Button>}
      onCancel={onClose}
    >
      {profile.isLoading && <Skeleton active avatar paragraph={{ rows: 5 }} />}
      {profile.error && (
        <Alert
          showIcon
          type="error"
          title={t('shell.account.profileUnavailable')}
          action={
            <Button type="link" onClick={() => void profile.refetch()}>
              {t('organization.retry')}
            </Button>
          }
        />
      )}
      {profile.data && (
        <Space className={styles.profile} orientation="vertical" size={20}>
          <div className={styles.identity}>
            <Avatar
              size={64}
              src={
                avatar.data ?? (!profile.data.avatarAssetId ? profile.data.avatarUrl : undefined)
              }
              icon={<UserOutlined />}
            />
            <div>
              <Typography.Title level={4}>{profile.data.fullName || emptyValue}</Typography.Title>
              <Typography.Text type="secondary">
                {profile.data.employeeCode || emptyValue}
              </Typography.Text>
            </div>
            <Tag color={profile.data.status === 'ACTIVE' ? 'success' : 'default'}>
              {profile.data.status || emptyValue}
            </Tag>
          </div>
          <Descriptions
            bordered
            size="small"
            column={2}
            items={[
              {
                key: 'workEmail',
                label: t('hr.workEmail'),
                children: profile.data.workEmail || emptyValue,
              },
              {
                key: 'jobTitle',
                label: t('hr.jobTitle'),
                children: profile.data.jobTitle || emptyValue,
              },
              {
                key: 'department',
                label: t('hr.department'),
                children: profile.data.department?.name || emptyValue,
              },
              { key: 'team', label: t('hr.team'), children: profile.data.team?.name || emptyValue },
              {
                key: 'employmentType',
                label: t('hr.employmentType'),
                children: profile.data.employmentType || emptyValue,
              },
              {
                key: 'workMode',
                label: t('hr.workMode'),
                children: profile.data.workMode || emptyValue,
              },
              {
                key: 'phone',
                label: t('hr.phoneNumber'),
                children: profile.data.phoneNumber || emptyValue,
              },
              {
                key: 'personalEmail',
                label: t('hr.personalEmail'),
                children: profile.data.personalEmail || emptyValue,
              },
              {
                key: 'address',
                label: t('hr.address'),
                children: profile.data.address || emptyValue,
                span: 2,
              },
            ]}
          />
        </Space>
      )}
    </Modal>
  )
}
