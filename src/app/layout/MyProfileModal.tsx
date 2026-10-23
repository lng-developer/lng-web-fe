import { useTranslation } from 'react-i18next'
import { UserOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Avatar,
  Button,
  Descriptions,
  Divider,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'

import { loadEmployeeAvatar, loadMyEmployeeProfile } from '@/features/hr/api/hrApi'
import { FormattedDateTime } from '@/shared/ui'

import styles from './MyProfileModal.module.scss'

const emptyValue = '\u2014'

export function MyProfileModal({
  open,
  onClose,
  onEdit,
}: {
  open: boolean
  onClose: () => void
  onEdit: () => void
}) {
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
  const formatValue = (value?: string | null) => value || emptyValue
  const formatDate = (value?: string | null) => (
    <FormattedDateTime
      fallback={emptyValue}
      showRelative={false}
      showTooltip={false}
      value={value}
    />
  )
  const formatOption = (group: string, value?: string | null) =>
    value ? t(`hr.${group}.${value}`, { defaultValue: value }) : emptyValue

  return (
    <Modal
      destroyOnHidden
      open={open}
      width={860}
      title={t('shell.account.myProfile')}
      footer={
        <Space>
          <Button onClick={onClose}>{t('shell.account.close')}</Button>
          <Button type="primary" onClick={onEdit}>
            {t('hr.edit')}
          </Button>
        </Space>
      }
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
                key: 'gender',
                label: t('hr.gender'),
                children: formatOption('genders', profile.data.gender),
              },
              {
                key: 'birthDate',
                label: t('hr.birthDate'),
                children: formatDate(profile.data.birthDate),
              },
              {
                key: 'phone',
                label: t('hr.phoneNumber'),
                children: formatValue(profile.data.phoneNumber),
              },
              {
                key: 'personalEmail',
                label: t('hr.personalEmail'),
                children: formatValue(profile.data.personalEmail),
              },
              {
                key: 'emergencyName',
                label: t('hr.emergencyName'),
                children: formatValue(profile.data.emergencyContact?.name),
              },
              {
                key: 'emergencyPhone',
                label: t('hr.emergencyPhone'),
                children: formatValue(profile.data.emergencyContact?.phone),
              },
              {
                key: 'emergencyRelation',
                label: t('hr.emergencyRelation'),
                children: formatValue(profile.data.emergencyContact?.relation),
              },
              {
                key: 'dependants',
                label: t('hr.dependants'),
                children: profile.data.dependants ?? emptyValue,
              },
              {
                key: 'address',
                label: t('hr.address'),
                children: formatValue(profile.data.address),
                span: 2,
              },
            ]}
          />
          <Divider orientation="start">{t('hr.employmentInformation')}</Divider>
          <Descriptions
            bordered
            size="small"
            column={2}
            items={[
              {
                key: 'workEmail',
                label: t('hr.workEmail'),
                children: formatValue(profile.data.workEmail),
              },
              {
                key: 'jobTitle',
                label: t('hr.jobTitle'),
                children: formatValue(profile.data.jobTitle),
              },
              {
                key: 'jobLevel',
                label: t('hr.jobLevel'),
                children: formatValue(profile.data.jobLevel),
              },
              {
                key: 'department',
                label: t('hr.department'),
                children: formatValue(profile.data.department?.name),
              },
              { key: 'team', label: t('hr.team'), children: formatValue(profile.data.team?.name) },
              {
                key: 'employmentType',
                label: t('hr.employmentType'),
                children: formatOption('employmentTypes', profile.data.employmentType),
              },
              {
                key: 'workMode',
                label: t('hr.workMode'),
                children: formatOption('workModes', profile.data.workMode),
              },
              {
                key: 'startDate',
                label: t('hr.startDate'),
                children: formatDate(profile.data.startDate),
              },
              {
                key: 'probationEndDate',
                label: t('hr.probationEndDate'),
                children: formatDate(profile.data.probationEndDate),
              },
              {
                key: 'endDate',
                label: t('hr.endDate'),
                children: formatDate(profile.data.endDate),
              },
              {
                key: 'promotionDate',
                label: t('hr.promotionDate'),
                children: formatDate(profile.data.promotionDate),
              },
              {
                key: 'transferDate',
                label: t('hr.transferDate'),
                children: formatDate(profile.data.transferDate),
              },
            ]}
          />
          <Divider orientation="start">{t('hr.contractInformation')}</Divider>
          <Descriptions
            bordered
            size="small"
            column={2}
            items={[
              {
                key: 'contractType',
                label: t('hr.contractType'),
                children: formatValue(profile.data.contractType),
              },
              {
                key: 'contractNumber',
                label: t('hr.contractNumber'),
                children: formatValue(profile.data.contractNumber),
              },
              {
                key: 'contractStartDate',
                label: t('hr.contractStartDate'),
                children: formatDate(profile.data.contractStartDate),
              },
              {
                key: 'contractEndDate',
                label: t('hr.contractEndDate'),
                children: formatDate(profile.data.contractEndDate),
              },
            ]}
          />
        </Space>
      )}
    </Modal>
  )
}
