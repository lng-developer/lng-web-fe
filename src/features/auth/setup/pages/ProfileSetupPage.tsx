import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  BankOutlined,
  ContactsOutlined,
  IdcardOutlined,
  SaveOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Avatar,
  Button,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Skeleton,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import {
  loadMyEmployeeProfile,
  type PersonalProfileInput,
  updateMyPersonalProfile,
  uploadMyEmployeeAvatar,
} from '@/features/hr/api/hrApi'
import { ApiError } from '@/shared/api'
import { DateTimePicker, PageHeader, SectionCard, useFeedbackToast } from '@/shared/ui'

import { SetupLayout } from '../components/SetupLayout'
import styles from './ProfileSetupPage.module.scss'

type ProfileValues = Omit<PersonalProfileInput, 'birthDate'> & { birthDate?: Dayjs | string | null }
type ProfileTabKey = 'personal' | 'emergency' | 'legal-bank'
type DuplicateProfileField =
  | 'identityCard'
  | 'personalEmail'
  | 'socialInsuranceNumber'
  | 'taxIdentification'

const genders = ['MALE', 'FEMALE', 'OTHER'] as const
const relationships = ['PARENT', 'SPOUSE', 'SIBLING', 'CHILD', 'OTHER'] as const

const duplicateProfileFields = new Set<DuplicateProfileField>([
  'identityCard',
  'personalEmail',
  'socialInsuranceNumber',
  'taxIdentification',
])

function getDuplicateProfileField(cause: unknown) {
  if (!(cause instanceof ApiError) || cause.code !== 'CONFLICT_ERROR') return undefined
  const field = (cause.details as { field?: unknown } | undefined)?.field
  return typeof field === 'string' && duplicateProfileFields.has(field as DuplicateProfileField)
    ? (field as DuplicateProfileField)
    : undefined
}

const bankOptions = ['VCB', 'BIDV', 'CTG', 'AGR', 'TCB', 'MB', 'ACB', 'VPB', 'TPB', 'STB'].map(
  (value) => ({ label: value, value }),
)

function tabKeyForField(name: readonly (string | number)[]): ProfileTabKey {
  const [field] = name
  if (field === 'emergencyContact') return 'emergency'
  if (
    field === 'identityCard' ||
    field === 'taxIdentification' ||
    field === 'socialInsuranceNumber' ||
    field === 'bankAccount'
  )
    return 'legal-bank'
  return 'personal'
}

function serializeBirthDate(value: ProfileValues['birthDate']) {
  if (!value) return null
  return typeof value === 'string' ? value : value.format('YYYY-MM-DD')
}

export function ProfileSetupPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const showFeedbackToast = useFeedbackToast()
  const [form] = Form.useForm<ProfileValues>()
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('personal')
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof loadMyEmployeeProfile>>>()
  const [error, setError] = useState<string>()
  const [avatarError, setAvatarError] = useState<string>()
  const [avatarFile, setAvatarFile] = useState<File>()
  const [avatarPreview, setAvatarPreview] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    loadMyEmployeeProfile()
      .then((value) => {
        if (!active) return
        setProfile(value)
        form.setFieldsValue({
          gender: value.gender,
          birthDate: value.birthDate ? dayjs(value.birthDate) : null,
          phoneNumber: value.phoneNumber || '',
          address: value.address || '',
          personalEmail: value.personalEmail || '',
          emergencyContact: {
            name: value.emergencyContact?.name || '',
            phone: value.emergencyContact?.phone || '',
            relation: value.emergencyContact?.relation || '',
          },
          identityCard: value.identityCard,
          taxIdentification: value.taxIdentification,
          socialInsuranceNumber: value.socialInsuranceNumber,
          bankAccount: value.bankAccount || {},
        })
      })
      .catch((cause) => {
        if (active) setError(cause instanceof ApiError ? cause.message : t('errors.unexpected'))
      })
    return () => {
      active = false
    }
  }, [form, t])

  function selectAvatar(file: File) {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setAvatarError(t('hr.avatarInvalid'))
      return Upload.LIST_IGNORE
    }
    setAvatarError(undefined)
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(String(reader.result))
    reader.readAsDataURL(file)
    return false
  }

  async function submit(values: ProfileValues) {
    setError(undefined)
    setSubmitting(true)
    try {
      if (avatarFile) await uploadMyEmployeeAvatar(avatarFile)
      await updateMyPersonalProfile({
        ...values,
        birthDate: serializeBirthDate(values.birthDate),
      })
      showFeedbackToast('success', t('actionFeedback.updated'))
      navigate(embedded ? '/hr/me/profile' : '/operations-dashboard', { replace: true })
    } catch (cause) {
      form.setFieldsValue(values)
      const duplicateField = getDuplicateProfileField(cause)
      if (duplicateField) {
        const description = t('auth.setup.profile.duplicateDescription', {
          field: t(`hr.${duplicateField}`),
        })
        form.setFields([{ name: duplicateField, errors: [description] }])
        showFeedbackToast('error', t('auth.setup.profile.duplicateTitle'), description)
      } else {
        showFeedbackToast(
          'error',
          cause instanceof ApiError ? cause.message : t('errors.unexpected'),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const required = [{ required: true, whitespace: true, message: t('auth.setup.required') }]
  const phoneRules = [
    ...required,
    {
      pattern: /^\+?[0-9 ()-]{7,20}$/,
      message: t('auth.setup.phoneInvalid'),
    },
  ]

  const tabItems = [
    {
      key: 'personal',
      label: (
        <span>
          <UserOutlined style={{ marginRight: 6 }} />
          {t('auth.setup.profile.personal')}
        </span>
      ),
      children: (
        <SectionCard title={t('auth.setup.profile.personal')}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="gender" label={t('hr.gender')}>
                <Select
                  allowClear
                  options={genders.map((value) => ({
                    value,
                    label: t(`hr.genders.${value}`),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="birthDate" label={t('hr.birthDate')}>
                <DateTimePicker mode="date" style={{ width: '100%', maxWidth: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phoneNumber" label={t('hr.phoneNumber')} rules={phoneRules}>
                <Input placeholder={t('auth.setup.profile.phonePlaceholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="personalEmail"
                label={t('hr.personalEmail')}
                rules={[...required, { type: 'email', message: t('auth.setup.emailInvalid') }]}
              >
                <Input placeholder={t('auth.setup.profile.emailPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="address" label={t('hr.address')} rules={required}>
                <Input placeholder={t('auth.setup.profile.addressPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>
        </SectionCard>
      ),
    },
    {
      key: 'emergency',
      label: (
        <span>
          <ContactsOutlined style={{ marginRight: 6 }} />
          {t('auth.setup.profile.emergency')}
        </span>
      ),
      children: (
        <SectionCard title={t('auth.setup.profile.emergency')}>
          <Form.Item
            name={['emergencyContact', 'name']}
            label={t('auth.setup.profile.emergencyName')}
            rules={required}
          >
            <Input placeholder={t('auth.setup.profile.emergencyNamePlaceholder')} />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['emergencyContact', 'phone']}
                label={t('auth.setup.profile.emergencyPhone')}
                rules={phoneRules}
              >
                <Input placeholder={t('auth.setup.profile.emergencyPhonePlaceholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['emergencyContact', 'relation']}
                label={t('auth.setup.profile.relation')}
                rules={required}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={t('auth.setup.profile.relationPlaceholder')}
                  options={relationships.map((value) => ({
                    value,
                    label: t(`auth.setup.profile.relationships.${value}`),
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </SectionCard>
      ),
    },
    {
      key: 'legal-bank',
      label: (
        <span>
          <IdcardOutlined style={{ marginRight: 6 }} />
          {t('auth.setup.profile.legal')}
        </span>
      ),
      children: (
        <SectionCard title={t('auth.setup.profile.legal')}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="identityCard" label={t('hr.identityCard')}>
                <Input placeholder={t('auth.setup.profile.identityPlaceholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="taxIdentification" label={t('hr.taxIdentification')}>
                <Input placeholder={t('auth.setup.profile.taxPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="socialInsuranceNumber" label={t('hr.socialInsuranceNumber')}>
                <Input placeholder={t('auth.setup.profile.insurancePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Divider plain style={{ fontSize: 13, margin: '16px 0 20px' }}>
            <BankOutlined style={{ marginRight: 6 }} />
            {t('auth.setup.profile.bank')}
          </Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name={['bankAccount', 'bankName']} label={t('hr.bankName')}>
                <Select
                  allowClear
                  showSearch
                  options={bankOptions}
                  placeholder={t('auth.setup.profile.bankPlaceholder')}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name={['bankAccount', 'accountNumber']} label={t('hr.bankAccountNumber')}>
                <Input placeholder={t('auth.setup.profile.bankAccountPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>
        </SectionCard>
      ),
    },
  ]

  const content = (
    <>
      {!profile && !error && <Skeleton active paragraph={{ rows: 10 }} />}
      {error && <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} />}
      {profile && (
        <div className={styles.workspace}>
          <aside className={styles.identity}>
            <Avatar size={96} src={avatarPreview || profile.avatarUrl} icon={<UserOutlined />} />
            <Upload
              accept="image/jpeg,image/png,image/webp"
              beforeUpload={selectAvatar}
              fileList={
                avatarFile ? [{ uid: 'avatar', name: avatarFile.name, status: 'done' }] : []
              }
              maxCount={1}
              onRemove={() => {
                setAvatarFile(undefined)
                setAvatarPreview(undefined)
              }}
            >
              <Button icon={<UploadOutlined />}>{t('hr.uploadAvatar')}</Button>
            </Upload>
            {avatarError && <Alert type="error" message={avatarError} style={{ marginTop: 8 }} />}
            <div className={styles.identityText}>
              <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                {profile.fullName}
              </Typography.Title>
              <Tag color="blue" style={{ marginTop: 4 }}>
                {profile.employeeCode}
              </Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                {profile.department?.name || '-'} · {profile.team?.name || '-'}
              </Typography.Text>
            </div>
          </aside>

          <Form<ProfileValues>
            className={styles.form}
            form={form}
            layout="vertical"
            requiredMark="optional"
            onFinish={submit}
            onFinishFailed={({ errorFields }) => {
              const firstField = errorFields[0]?.name
              if (firstField) setActiveTab(tabKeyForField(firstField))
              showFeedbackToast(
                'warning',
                t('auth.setup.validationTitle'),
                t('auth.setup.validationDescription'),
              )
            }}
          >
            <Tabs
              items={tabItems}
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as ProfileTabKey)}
            />

            <div className={styles.actions}>
              <Button
                size="large"
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={submitting}
              >
                {t(embedded ? 'hrOperations.common.save' : 'auth.setup.complete')}
              </Button>
            </div>
          </Form>
        </div>
      )}
    </>
  )

  if (embedded)
    return (
      <section>
        <PageHeader
          title={t('auth.setup.profile.title', { defaultValue: 'My Employee Profile' })}
          description={t('auth.setup.profile.description', {
            defaultValue:
              'Manage your personal information, emergency contacts, legal details, and bank account for payroll.',
          })}
        />
        {content}
      </section>
    )

  return (
    <SetupLayout
      wide
      currentStep={1}
      title={t('auth.setup.profile.title')}
      description={t('auth.setup.profile.description')}
    >
      {content}
    </SetupLayout>
  )
}
