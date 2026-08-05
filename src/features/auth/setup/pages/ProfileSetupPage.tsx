import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { UploadOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Avatar, Button, DatePicker, Form, Input, Select, Skeleton, Upload } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import {
  loadMyEmployeeProfile,
  type PersonalProfileInput,
  updateMyPersonalProfile,
  uploadMyEmployeeAvatar,
} from '@/features/hr/api/hrApi'
import { ApiError } from '@/shared/api'
import { PageHeader, useFeedbackToast } from '@/shared/ui'

import { SetupLayout } from '../components/SetupLayout'
import styles from './ProfileSetupPage.module.scss'

type ProfileValues = Omit<PersonalProfileInput, 'birthDate'> & { birthDate?: Dayjs | null }
type DuplicateProfileField =
  | 'identityCard'
  | 'personalEmail'
  | 'socialInsuranceNumber'
  | 'taxIdentification'

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

export function ProfileSetupPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const showFeedbackToast = useFeedbackToast()
  const [form] = Form.useForm<ProfileValues>()
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
        birthDate: values.birthDate?.format('YYYY-MM-DD') || null,
      })
      showFeedbackToast('success', t('actionFeedback.updated'))
      navigate(embedded ? '/hr/me/profile' : '/foundation', { replace: true })
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

  const required = embedded ? [] : [{ required: true, message: t('auth.setup.required') }]

  const content = (
    <>
      {!profile && !error && <Skeleton active paragraph={{ rows: 8 }} />}
      {error && <Alert showIcon type="error" title={error} />}
      {profile && (
        <div className={styles.workspace}>
          <aside className={styles.identity}>
            <Avatar size={88} src={avatarPreview || profile.avatarUrl} icon={<UserOutlined />} />
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
            {avatarError && <Alert type="error" title={avatarError} />}
            <div className={styles.identityText}>
              <strong>{profile.fullName}</strong>
              <span>{profile.employeeCode}</span>
              <span>{profile.department?.name || '-'}</span>
              <span>{profile.team?.name || '-'}</span>
            </div>
          </aside>
          <Form<ProfileValues>
            className={styles.form}
            form={form}
            layout="vertical"
            requiredMark="optional"
            onFinish={submit}
          >
            <div className={styles.grid}>
              <section className={styles.section}>
                <h3>{t('auth.setup.profile.personal')}</h3>
                <div className={styles.twoColumns}>
                  <Form.Item name="gender" label={t('hr.gender')}>
                    <Select
                      allowClear
                      options={['MALE', 'FEMALE', 'OTHER'].map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="birthDate" label={t('hr.birthDate')}>
                    <DatePicker className={styles.fullWidth} />
                  </Form.Item>
                  <Form.Item name="phoneNumber" label={t('hr.phoneNumber')} rules={required}>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="personalEmail"
                    label={t('hr.personalEmail')}
                    rules={[...required, { type: 'email' }]}
                  >
                    <Input />
                  </Form.Item>
                </div>
                <Form.Item name="address" label={t('hr.address')} rules={required}>
                  <Input />
                </Form.Item>
              </section>
              <section className={styles.section}>
                <h3>{t('auth.setup.profile.emergency')}</h3>
                <Form.Item
                  name={['emergencyContact', 'name']}
                  label={t('auth.setup.profile.emergencyName')}
                  rules={required}
                >
                  <Input />
                </Form.Item>
                <div className={styles.twoColumns}>
                  <Form.Item
                    name={['emergencyContact', 'phone']}
                    label={t('auth.setup.profile.emergencyPhone')}
                    rules={required}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name={['emergencyContact', 'relation']}
                    label={t('auth.setup.profile.relation')}
                    rules={required}
                  >
                    <Input />
                  </Form.Item>
                </div>
              </section>
              <section className={styles.section}>
                <h3>{t('auth.setup.profile.legal')}</h3>
                <div className={styles.twoColumns}>
                  <Form.Item name="identityCard" label={t('hr.identityCard')}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="taxIdentification" label={t('hr.taxIdentification')}>
                    <Input />
                  </Form.Item>
                </div>
                <Form.Item name="socialInsuranceNumber" label={t('hr.socialInsuranceNumber')}>
                  <Input />
                </Form.Item>
                <h3 className={styles.bankTitle}>{t('auth.setup.profile.bank')}</h3>
                <div className={styles.twoColumns}>
                  <Form.Item name={['bankAccount', 'bankName']} label={t('hr.bankName')}>
                    <Select allowClear showSearch options={bankOptions} />
                  </Form.Item>
                  <Form.Item
                    name={['bankAccount', 'accountNumber']}
                    label={t('hr.bankAccountNumber')}
                  >
                    <Input />
                  </Form.Item>
                </div>
              </section>
            </div>
            <div className={styles.actions}>
              <Button size="large" type="primary" htmlType="submit" loading={submitting}>
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
          title={t('auth.setup.profile.title')}
          description={t('auth.setup.profile.description')}
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
