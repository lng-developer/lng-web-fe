import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRightOutlined,
  BankOutlined,
  ContactsOutlined,
  DeleteOutlined,
  DollarOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  IdcardOutlined,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
  SolutionOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Skeleton,
  Tabs,
  Tag,
  Tooltip,
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
import { getAccount } from '@/shared/auth/session'
import { DateTimePicker, EmployeeAvatar, SectionCard, useFeedbackToast } from '@/shared/ui'

import { SetupLayout } from '../components/SetupLayout'
import styles from './ProfileSetupPage.module.scss'

type DependantFormValue = {
  name: string
  relation: string
  dob?: Dayjs | string | null
  gender?: string | null
}

type ProfileValues = Omit<PersonalProfileInput, 'birthDate' | 'dependantDetails'> & {
  birthDate?: Dayjs | string | null
  dependantDetails?: DependantFormValue[]
}

type ProfileTabKey =
  | 'personal'
  | 'employment'
  | 'compensation'
  | 'emergency'
  | 'legal-bank'
  | 'dependants'

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

const bankOptions = [
  'VCB',
  'BIDV',
  'CTG',
  'AGR',
  'TCB',
  'MB',
  'ACB',
  'VPB',
  'TPB',
  'STB',
  'HDB',
  'VIB',
  'SHB',
  'EIB',
  'MSB',
  'OCB',
  'LPB',
].map((value) => ({ label: value, value }))

function tabKeyForField(name: readonly (string | number)[]): ProfileTabKey {
  const [field] = name
  if (field === 'emergencyContact') return 'emergency'
  if (field === 'dependantDetails') return 'dependants'
  if (
    field === 'identityCard' ||
    field === 'taxIdentification' ||
    field === 'socialInsuranceNumber' ||
    field === 'bankAccount'
  )
    return 'legal-bank'
  return 'personal'
}

function serializeBirthDate(value?: Dayjs | string | null) {
  if (!value) return null
  return typeof value === 'string' ? value.slice(0, 10) : value.format('YYYY-MM-DD')
}

export function ProfileSetupPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const initialPasswordRequired = Boolean(getAccount()?.passwordSetupRequired)
  const showFeedbackToast = useFeedbackToast()
  const [form] = Form.useForm<ProfileValues>()
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('personal')
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof loadMyEmployeeProfile>>>()
  const [error, setError] = useState<string>()
  const [avatarError, setAvatarError] = useState<string>()
  const [avatarFile, setAvatarFile] = useState<File>()
  const [avatarPreview, setAvatarPreview] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [hideSalary, setHideSalary] = useState(false)

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
          dependantDetails: (value.dependantDetails || []).map((d) => ({
            name: d.name,
            relation: d.relation,
            gender: d.gender,
            dob: d.dob ? dayjs(d.dob) : null,
          })),
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
        phoneNumber: values.phoneNumber,
        address: values.address,
        personalEmail: values.personalEmail,
        gender: values.gender,
        birthDate: serializeBirthDate(values.birthDate),
        emergencyContact: values.emergencyContact,
        identityCard: values.identityCard || null,
        taxIdentification: values.taxIdentification || null,
        socialInsuranceNumber: values.socialInsuranceNumber || null,
        bankAccount: values.bankAccount || {},
        dependantDetails: (values.dependantDetails || []).map((d) => ({
          name: d.name,
          relation: d.relation,
          dob: serializeBirthDate(d.dob),
          gender: d.gender || null,
        })),
      })
      showFeedbackToast('success', t('actionFeedback.updated'))
      navigate(
        embedded
          ? '/hr/me/profile'
          : initialPasswordRequired
            ? '/setup/password'
            : '/operations-dashboard',
        { replace: true },
      )
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

  const formatCurrency = (amount?: number | null, currency = 'VND') => {
    if (hideSalary) return '•••••••• ₫'
    const formatted = new Intl.NumberFormat('vi-VN').format(amount || 0)
    return `${formatted} ${currency === 'VND' ? '₫' : currency}`
  }

  const formatDate = (date?: string | null) => {
    if (!date) return '-'
    return dayjs(date).format('DD/MM/YYYY')
  }

  const totalAgreedSalary = useMemo(() => {
    if (!profile) return 0
    const base = profile.baseSalary || 0
    const lunch = profile.allowances?.lunch || 0
    const fuel = profile.allowances?.fuel || 0
    const other = profile.allowances?.other || 0
    const responsibility = profile.responsibilityAllowance || 0
    return base + lunch + fuel + other + responsibility
  }, [profile])

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
            <Col span={24}>
              <Form.Item label={t('hr.fullName')}>
                <Input
                  disabled
                  value={profile?.fullName || ''}
                  suffix={
                    <Tooltip title={t('auth.setup.profile.fullNameNote')}>
                      <LockOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>
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
      key: 'employment',
      label: (
        <span>
          <SolutionOutlined style={{ marginRight: 6 }} />
          {t('auth.setup.profile.employment')}
          <Tag color="default" style={{ marginLeft: 6, fontSize: 10, lineHeight: '16px' }}>
            <LockOutlined style={{ marginRight: 2 }} />
            {t('auth.setup.profile.readOnlyBadge')}
          </Tag>
        </span>
      ),
      children: (
        <>
          <div className={styles.readOnlyNotice}>
            <LockOutlined style={{ color: 'var(--ant-color-primary)' }} />
            <span>{t('auth.setup.profile.managedByHrDesc')}</span>
          </div>

          <SectionCard title={t('hr.employmentInformation')}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.employeeCode')}</span>
                <span className={styles.infoValue}>
                  <Tag color="blue">{profile?.employeeCode || '-'}</Tag>
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.workEmail')}</span>
                <span className={styles.infoValue}>{profile?.workEmail || '-'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.department')}</span>
                <span className={styles.infoValue}>{profile?.department?.name || '-'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.team')}</span>
                <span className={styles.infoValue}>{profile?.team?.name || '-'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.jobTitle')}</span>
                <span className={styles.infoValue}>{profile?.jobTitle || '-'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.jobLevel')}</span>
                <span className={styles.infoValue}>{profile?.jobLevel || '-'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.employmentType')}</span>
                <span className={styles.infoValue}>
                  {profile?.employmentType
                    ? t(`hr.employmentTypes.${profile.employmentType}`, profile.employmentType)
                    : '-'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.workMode')}</span>
                <span className={styles.infoValue}>
                  {profile?.workMode
                    ? t(`hr.workModes.${profile.workMode}`, profile.workMode)
                    : '-'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.status')}</span>
                <span className={styles.infoValue}>
                  {profile?.status ? (
                    <Tag color={profile.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {t(`hr.statuses.${profile.status}`, profile.status)}
                    </Tag>
                  ) : (
                    '-'
                  )}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.startDate')}</span>
                <span className={styles.infoValue}>{formatDate(profile?.startDate)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.probationEndDate')}</span>
                <span className={styles.infoValue}>{formatDate(profile?.probationEndDate)}</span>
              </div>
            </div>
          </SectionCard>

          <div style={{ marginTop: 16 }}>
            <SectionCard title={t('hr.contractInformation')}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t('hr.contractType')}</span>
                  <span className={styles.infoValue}>{profile?.contractType || '-'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t('hr.contractNumber')}</span>
                  <span className={styles.infoValue}>{profile?.contractNumber || '-'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t('hr.contractStartDate')}</span>
                  <span className={styles.infoValue}>{formatDate(profile?.contractStartDate)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t('hr.contractEndDate')}</span>
                  <span className={styles.infoValue}>{formatDate(profile?.contractEndDate)}</span>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      ),
    },
    {
      key: 'compensation',
      label: (
        <span>
          <DollarOutlined style={{ marginRight: 6 }} />
          {t('auth.setup.profile.compensation')}
          <Tag color="default" style={{ marginLeft: 6, fontSize: 10, lineHeight: '16px' }}>
            <LockOutlined style={{ marginRight: 2 }} />
            {t('auth.setup.profile.readOnlyBadge')}
          </Tag>
        </span>
      ),
      children: (
        <>
          <div className={styles.salaryHighlight}>
            <div>
              <div className={styles.infoLabel}>
                {t('auth.setup.profile.totalAgreedPackage')} ({profile?.baseCurrency || 'VND'})
              </div>
              <div className={styles.salaryTotal}>
                {formatCurrency(totalAgreedSalary, profile?.baseCurrency || 'VND')}
              </div>
            </div>
            <Button
              icon={hideSalary ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => setHideSalary((prev) => !prev)}
            >
              {hideSalary ? t('auth.setup.profile.showAmount') : t('auth.setup.profile.hideAmount')}
            </Button>
          </div>

          <SectionCard title={t('hr.compensation')}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.baseSalary')}</span>
                <span className={styles.infoValue}>
                  {formatCurrency(profile?.baseSalary, profile?.baseCurrency || 'VND')}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.lunchAllowance')}</span>
                <span className={styles.infoValue}>
                  {formatCurrency(profile?.allowances?.lunch, profile?.baseCurrency || 'VND')}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.fuelAllowance')}</span>
                <span className={styles.infoValue}>
                  {formatCurrency(profile?.allowances?.fuel, profile?.baseCurrency || 'VND')}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.responsibilityAllowance')}</span>
                <span className={styles.infoValue}>
                  {formatCurrency(profile?.responsibilityAllowance, profile?.baseCurrency || 'VND')}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('hr.otherAllowance')}</span>
                <span className={styles.infoValue}>
                  {formatCurrency(profile?.allowances?.other, profile?.baseCurrency || 'VND')}
                </span>
              </div>
            </div>
          </SectionCard>

          <div className={styles.payrollBanner}>
            <div>
              <Typography.Text strong>{t('auth.setup.profile.viewPayslipsTitle')}</Typography.Text>
              <br />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('auth.setup.profile.viewPayslipsDesc')}
              </Typography.Text>
            </div>
            <Button
              icon={<ArrowRightOutlined />}
              type="primary"
              onClick={() => navigate('/hr/me/payroll')}
            >
              {t('auth.setup.profile.goToPayroll')}
            </Button>
          </div>
        </>
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
    {
      key: 'dependants',
      label: (
        <span>
          <TeamOutlined style={{ marginRight: 6 }} />
          {t('auth.setup.profile.dependants')}
        </span>
      ),
      children: (
        <SectionCard title={t('auth.setup.profile.dependantsTitle')}>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            {t('auth.setup.profile.dependantsDesc')}
          </Typography.Paragraph>

          <Form.List name="dependantDetails">
            {(fields, { add, remove }) => (
              <div className={styles.dependantList}>
                {fields.length === 0 ? (
                  <Empty
                    description={t('auth.setup.profile.noDependants')}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : null}

                {fields.map((field) => (
                  <div key={field.key} className={styles.dependantRow}>
                    <Form.Item name={[field.name, 'name']} rules={required}>
                      <Input placeholder={t('auth.setup.profile.dependantNamePlaceholder')} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'relation']} rules={required}>
                      <Select
                        placeholder={t('auth.setup.profile.dependantRelation')}
                        options={relationships.map((value) => ({
                          value,
                          label: t(`auth.setup.profile.relationships.${value}`),
                        }))}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, 'dob']}>
                      <DateTimePicker
                        mode="date"
                        placeholder={t('auth.setup.profile.dependantDob')}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, 'gender']}>
                      <Select
                        allowClear
                        placeholder={t('auth.setup.profile.dependantGender')}
                        options={genders.map((value) => ({
                          value,
                          label: t(`hr.genders.${value}`),
                        }))}
                      />
                    </Form.Item>
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}

                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => add()}
                >
                  {t('auth.setup.profile.addDependant')}
                </Button>
              </div>
            )}
          </Form.List>
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
            <EmployeeAvatar
              size={96}
              name={profile.fullName}
              avatarUrl={avatarPreview || profile.avatarUrl}
              icon={<UserOutlined />}
            />
            <Upload
              accept="image/jpeg,image/png,image/webp"
              beforeUpload={selectAvatar}
              fileList={
                avatarFile ? [{ uid: 'avatar', name: avatarFile.name, status: 'done' }] : []
              }
              maxCount={1}
              showUploadList={false}
              onRemove={() => {
                setAvatarFile(undefined)
                setAvatarPreview(undefined)
              }}
            >
              <Button icon={<UploadOutlined />} size="small">
                {t('hr.uploadAvatar')}
              </Button>
            </Upload>
            {avatarError && <Alert type="error" message={avatarError} style={{ marginTop: 8 }} />}
            <div className={styles.identityText}>
              <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                {profile.fullName}
              </Typography.Title>
              <Tag color="blue" style={{ marginTop: 4, fontWeight: 600 }}>
                {profile.employeeCode}
              </Tag>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {profile.workEmail || getAccount()?.email || '-'}
              </Typography.Text>
              {profile.jobTitle ? (
                <Tag color="geekblue" style={{ marginTop: 4 }}>
                  {profile.jobTitle}
                </Tag>
              ) : null}
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
                {t(
                  embedded
                    ? 'hrOperations.common.save'
                    : initialPasswordRequired
                      ? 'auth.setup.continue'
                      : 'auth.setup.complete',
                )}
              </Button>
            </div>
          </Form>
        </div>
      )}
    </>
  )

  if (embedded) return <section>{content}</section>

  return (
    <SetupLayout
      wide
      currentStep={initialPasswordRequired ? 0 : 1}
      profileFirst={initialPasswordRequired}
      title={t('auth.setup.profile.title')}
      description={t('auth.setup.profile.description')}
    >
      {content}
    </SetupLayout>
  )
}

export default ProfileSetupPage
