import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Skeleton,
  Space,
  Upload,
  type UploadFile,
} from 'antd'

import { loadDepartments, loadTeams } from '@/features/organization/api/organizationApi'
import { getPermissions } from '@/shared/auth/session'
import { DateTimePicker, FeedbackAlert, useFeedbackToast } from '@/shared/ui'

import {
  type EmployeeProfile,
  type EmployeeProfileInput,
  loadAssignableRoles,
  loadEmployeeProfile,
  provisionStaff,
  updateEmployeeProfile,
  uploadEmployeeAvatar,
} from '../api/hrApi'
import styles from './HrWorkspacePage.module.scss'

const statuses = ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED']
const employmentTypes = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT']
const workModes = ['ONSITE', 'REMOTE', 'HYBRID']
const banks = [
  ['VCB', 'Vietcombank'],
  ['BIDV', 'BIDV'],
  ['CTG', 'VietinBank'],
  ['AGR', 'Agribank'],
  ['TCB', 'Techcombank'],
  ['MB', 'MBBank'],
  ['ACB', 'ACB'],
  ['VPB', 'VPBank'],
  ['TPB', 'TPBank'],
  ['STB', 'Sacombank'],
  ['HDB', 'HDBank'],
  ['VIB', 'VIB'],
  ['SHB', 'SHB'],
  ['EIB', 'Eximbank'],
  ['MSB', 'MSB'],
  ['OCB', 'OCB'],
  ['LPB', 'LPBank'],
] as const
const dateOnly = (value?: string | null) => value?.slice(0, 10) || null

type StaffFormValues = EmployeeProfileInput & { roleId?: string }

function profileValues(profile: EmployeeProfile): Partial<StaffFormValues> {
  return {
    ...profile,
    employeeCode: profile.employeeCode ?? '',
    fullName: profile.fullName ?? '',
    employmentType: profile.employmentType ?? 'FULL_TIME',
    workMode: profile.workMode ?? 'ONSITE',
    status: profile.status ?? 'ACTIVE',
    emergencyContact: profile.emergencyContact ?? undefined,
    bankAccount: profile.bankAccount ?? undefined,
    baseCurrency: profile.baseCurrency ?? 'VND',
    baseSalary: profile.baseSalary ?? undefined,
    responsibilityAllowance: profile.responsibilityAllowance ?? undefined,
    birthDate: dateOnly(profile.birthDate),
    startDate: dateOnly(profile.startDate) ?? '',
    probationEndDate: dateOnly(profile.probationEndDate),
    endDate: dateOnly(profile.endDate),
    contractStartDate: dateOnly(profile.contractStartDate),
    contractEndDate: dateOnly(profile.contractEndDate),
    promotionDate: dateOnly(profile.promotionDate),
    transferDate: dateOnly(profile.transferDate),
    dependantDetails: (profile.dependantDetails ?? []).map((dependant) => ({
      ...dependant,
      dob: dateOnly(dependant.dob),
    })),
  }
}

function normalizedUpdate(
  values: StaffFormValues,
  includeCompensation: boolean,
): EmployeeProfileInput {
  const editableValues = { ...values } as StaffFormValues & { avatarUrl?: string }
  delete editableValues.avatarUrl
  const normalized = {
    ...editableValues,
    birthDate: values.birthDate || null,
    probationEndDate: values.probationEndDate || null,
    endDate: values.endDate || null,
    contractStartDate: values.contractStartDate || null,
    contractEndDate: values.contractEndDate || null,
    promotionDate: values.promotionDate || null,
    transferDate: values.transferDate || null,
    dependantDetails: values.dependantDetails?.map((dependant) => ({
      ...dependant,
      dob: dependant.dob || null,
    })),
  }
  delete normalized.roleId
  delete normalized.workEmail
  if (includeCompensation) return normalized
  delete normalized.allowances
  delete normalized.bankAccount
  delete normalized.baseCurrency
  delete normalized.baseSalary
  delete normalized.identityCard
  delete normalized.responsibilityAllowance
  delete normalized.socialInsuranceNumber
  delete normalized.taxIdentification
  return normalized
}

export function StaffEditorModal({
  editor,
  onClose,
  onSaved,
  readOnly = false,
}: {
  editor: 'create' | EmployeeProfile
  onClose: () => void
  onSaved: () => void
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm<StaffFormValues>()
  const showFeedbackToast = useFeedbackToast()
  const [contentReady, setContentReady] = useState(false)
  const [avatarFiles, setAvatarFiles] = useState<UploadFile[]>([])
  const [avatarError, setAvatarError] = useState<string>()
  const isCreate = editor === 'create'
  const permissions = getPermissions()
  const canManageCompensation = permissions.some((permission) =>
    ['HR_COMPENSATION:READ', 'HR_COMPENSATION:WRITE'].includes(permission),
  )
  const canWriteCompensation = permissions.includes('HR_COMPENSATION:WRITE')

  const detail = useQuery({
    queryKey: ['hr', 'employee-profiles', isCreate ? null : editor.id, canManageCompensation],
    queryFn: () => loadEmployeeProfile((editor as EmployeeProfile).id, canManageCompensation),
    enabled: !isCreate,
  })
  const departments = useQuery({
    queryKey: ['organization', 'departments'],
    queryFn: loadDepartments,
  })
  const teams = useQuery({ queryKey: ['organization', 'teams'], queryFn: loadTeams })
  const roles = useQuery({
    queryKey: ['hr', 'assignable-roles'],
    queryFn: loadAssignableRoles,
    enabled: isCreate,
  })
  const selectedDepartmentId = Form.useWatch('departmentId', form)
  const selectedBank = Form.useWatch(['bankAccount', 'bankName'], form)
  const availableTeams = (teams.data?.items ?? []).filter(
    (team) => team.departmentId === selectedDepartmentId,
  )

  useEffect(() => {
    if (isCreate) {
      form.setFieldsValue({
        baseCurrency: 'VND',
        employmentType: 'FULL_TIME',
        workMode: 'ONSITE',
        status: 'PROBATION',
        startDate: new Date().toISOString().slice(0, 10),
      })
    } else if (detail.data) {
      form.setFieldsValue(profileValues(detail.data))
    }
  }, [detail.data, form, isCreate])
  useEffect(() => {
    const timer = window.setTimeout(() => setContentReady(true), 300)
    return () => window.clearTimeout(timer)
  }, [])

  const save = useMutation<unknown, Error, StaffFormValues>({
    mutationFn: async (values) => {
      const uploadAvatar = async (profileId: string) => {
        const selectedFile = avatarFiles[0]
        const file = selectedFile?.originFileObj ?? selectedFile
        if (file) await uploadEmployeeAvatar(profileId, file as File)
      }
      if (!isCreate) {
        const updated = await updateEmployeeProfile(
          editor.id,
          normalizedUpdate(values, canWriteCompensation),
        )
        await uploadAvatar(editor.id)
        return updated
      }
      const scopeType = values.teamId ? 'team' : values.departmentId ? 'department' : 'global'
      const scopeId = values.teamId ?? values.departmentId ?? null
      if (!values.roleId || !values.workEmail) {
        throw new Error(t('hr.required'))
      }
      const created = await provisionStaff({
        employeeCode: values.employeeCode,
        workEmail: values.workEmail,
        fullName: values.fullName,
        departmentId: values.departmentId,
        teamId: values.teamId,
        jobTitle: values.jobTitle,
        jobLevel: values.jobLevel,
        employmentType: values.employmentType,
        workMode: values.workMode,
        startDate: values.startDate,
        probationEndDate: values.probationEndDate || null,
        status: values.status,
        baseCurrency: values.baseCurrency || 'VND',
        baseSalary: values.baseSalary,
        assignments: [
          {
            roleId: values.roleId,
            scopeType,
            scopeId,
            customPermissionIds: [],
            overridePermissionIds: null,
          },
        ],
      })
      await uploadAvatar(created.profile.id)
      return created
    },
    onSuccess: () => {
      showFeedbackToast('success', t('actionFeedback.saved'))
      onSaved()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const required = [{ required: true, message: t('hr.required') }]
  const createRequired = isCreate ? required : undefined
  const bankOptions = [
    ...banks.map(([value, name]) => ({ label: `${value} · ${name}`, value })),
    ...(selectedBank && !banks.some(([value]) => value === selectedBank)
      ? [{ label: selectedBank, value: selectedBank }]
      : []),
  ]
  const employmentFields = (
    <div className={styles.formGrid}>
      <Form.Item name="departmentId" label={t('hr.department')}>
        <Select
          showSearch
          optionFilterProp="label"
          options={(departments.data?.items ?? []).map(({ id, name }) => ({
            label: name,
            value: id,
          }))}
          onChange={() => form.setFieldValue('teamId', null)}
        />
      </Form.Item>
      <Form.Item name="teamId" label={t('hr.team')}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          options={availableTeams.map(({ id, name }) => ({ label: name, value: id }))}
        />
      </Form.Item>
      <Form.Item name="jobTitle" label={t('hr.jobTitle')}>
        <Input />
      </Form.Item>
      <Form.Item name="jobLevel" label={t('hr.jobLevel')}>
        <Input />
      </Form.Item>
      <Form.Item name="employmentType" label={t('hr.employmentType')}>
        <Select options={employmentTypes.map((value) => ({ label: value, value }))} />
      </Form.Item>
      <Form.Item name="workMode" label={t('hr.workMode')}>
        <Select options={workModes.map((value) => ({ label: value, value }))} />
      </Form.Item>
      <Form.Item name="status" label={t('hr.status')}>
        <Select options={statuses.map((value) => ({ label: value, value }))} />
      </Form.Item>
      <Form.Item name="startDate" label={t('hr.startDate')}>
        <DateTimePicker mode="date" />
      </Form.Item>
      <Form.Item name="probationEndDate" label={t('hr.probationEndDate')}>
        <DateTimePicker mode="date" />
      </Form.Item>
      {!isCreate && (
        <>
          <Form.Item name="endDate" label={t('hr.endDate')}>
            <DateTimePicker mode="date" />
          </Form.Item>
          <Form.Item name="promotionDate" label={t('hr.promotionDate')}>
            <DateTimePicker mode="date" />
          </Form.Item>
          <Form.Item name="transferDate" label={t('hr.transferDate')}>
            <DateTimePicker mode="date" />
          </Form.Item>
        </>
      )}
    </div>
  )

  const items = [
    {
      key: 'identity',
      label: t('hr.identityInformation'),
      children: (
        <div className={styles.formGrid}>
          <Form.Item name="employeeCode" label={t('hr.employeeCode')} rules={createRequired}>
            <Input />
          </Form.Item>
          <Form.Item name="fullName" label={t('hr.fullName')} rules={createRequired}>
            <Input />
          </Form.Item>
          <Form.Item
            name="workEmail"
            label={t('hr.workEmail')}
            rules={[{ required: isCreate, type: 'email', message: t('hr.invalidEmail') }]}
          >
            <Input disabled={!isCreate} />
          </Form.Item>
          <Form.Item
            label={t('hr.avatar')}
            validateStatus={avatarError ? 'error' : undefined}
            help={avatarError}
          >
            <Upload
              accept="image/jpeg,image/png,image/webp"
              beforeUpload={(file) => {
                const valid =
                  ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) &&
                  file.size <= 5 * 1024 * 1024
                if (!valid) {
                  setAvatarError(t('hr.avatarInvalid'))
                  return Upload.LIST_IGNORE
                }
                setAvatarError(undefined)
                setAvatarFiles([file])
                return false
              }}
              fileList={avatarFiles}
              maxCount={1}
              onRemove={() => {
                setAvatarFiles([])
                return true
              }}
            >
              <Button icon={<UploadOutlined />}>{t('hr.uploadAvatar')}</Button>
            </Upload>
          </Form.Item>
        </div>
      ),
    },
    ...(!isCreate
      ? [
          {
            key: 'personal',
            label: t('hr.personalInformation'),
            children: (
              <div className={styles.formGrid}>
                <Form.Item name="gender" label={t('hr.gender')}>
                  <Input />
                </Form.Item>
                <Form.Item name="birthDate" label={t('hr.birthDate')}>
                  <DateTimePicker mode="date" />
                </Form.Item>
                <Form.Item name="phoneNumber" label={t('hr.phoneNumber')}>
                  <Input />
                </Form.Item>
                <Form.Item
                  name="personalEmail"
                  label={t('hr.personalEmail')}
                  rules={[{ type: 'email' }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item className={styles.fullWidth} name="address" label={t('hr.address')}>
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item name={['emergencyContact', 'name']} label={t('hr.emergencyName')}>
                  <Input />
                </Form.Item>
                <Form.Item name={['emergencyContact', 'phone']} label={t('hr.emergencyPhone')}>
                  <Input />
                </Form.Item>
                <Form.Item
                  name={['emergencyContact', 'relation']}
                  label={t('hr.emergencyRelation')}
                >
                  <Input />
                </Form.Item>
              </div>
            ),
          },
        ]
      : []),
    { key: 'employment', label: t('hr.employmentInformation'), children: employmentFields },
    ...(!isCreate
      ? [
          {
            key: 'contract',
            label: t('hr.contractInformation'),
            children: (
              <div className={styles.formGrid}>
                <Form.Item name="contractType" label={t('hr.contractType')}>
                  <Input />
                </Form.Item>
                <Form.Item name="contractNumber" label={t('hr.contractNumber')}>
                  <Input />
                </Form.Item>
                <Form.Item name="contractStartDate" label={t('hr.contractStartDate')}>
                  <DateTimePicker mode="date" />
                </Form.Item>
                <Form.Item name="contractEndDate" label={t('hr.contractEndDate')}>
                  <DateTimePicker mode="date" />
                </Form.Item>
              </div>
            ),
          },
          {
            key: 'dependants',
            label: t('hr.dependantInformation'),
            children: (
              <div className={styles.formGrid}>
                <Form.Item name="dependants" label={t('hr.dependants')}>
                  <InputNumber min={0} className={styles.salaryInput} />
                </Form.Item>
                <Form.List name="dependantDetails">
                  {(fields, { add, remove }) => (
                    <div className={styles.dependantList}>
                      {fields.map((field) => (
                        <div className={styles.dependantRow} key={field.key}>
                          <Form.Item
                            name={[field.name, 'name']}
                            label={t('hr.fullName')}
                            rules={required}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'relation']}
                            label={t('hr.relation')}
                            rules={required}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item name={[field.name, 'dob']} label={t('hr.birthDate')}>
                            <DateTimePicker mode="date" />
                          </Form.Item>
                          <Form.Item name={[field.name, 'gender']} label={t('hr.gender')}>
                            <Input />
                          </Form.Item>
                          <Button
                            danger
                            type="text"
                            aria-label={t('hr.removeDependant')}
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                          />
                        </div>
                      ))}
                      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                        {t('hr.addDependant')}
                      </Button>
                    </div>
                  )}
                </Form.List>
              </div>
            ),
          },
        ]
      : []),
    ...(isCreate || canManageCompensation
      ? [
          {
            key: 'compensation',
            label: t('hr.compensation'),
            children: (
              <div className={styles.formGrid}>
                <Form.Item name="baseCurrency" label={t('hr.currency')}>
                  <Input maxLength={3} disabled={isCreate} />
                </Form.Item>
                <Form.Item name="baseSalary" label={t('hr.baseSalary')}>
                  <InputNumber
                    min={0}
                    disabled={!isCreate && !canWriteCompensation}
                    className={styles.salaryInput}
                  />
                </Form.Item>
                {!isCreate && (
                  <>
                    <Form.Item name="identityCard" label={t('hr.identityCard')}>
                      <Input disabled={!canWriteCompensation} />
                    </Form.Item>
                    <Form.Item name="taxIdentification" label={t('hr.taxIdentification')}>
                      <Input disabled={!canWriteCompensation} />
                    </Form.Item>
                    <Form.Item name="socialInsuranceNumber" label={t('hr.socialInsuranceNumber')}>
                      <Input disabled={!canWriteCompensation} />
                    </Form.Item>
                    <Form.Item name={['bankAccount', 'bankName']} label={t('hr.bankName')}>
                      <Select
                        allowClear
                        disabled={!canWriteCompensation}
                        optionFilterProp="label"
                        options={bankOptions}
                        showSearch
                      />
                    </Form.Item>
                    <Form.Item
                      name={['bankAccount', 'accountNumber']}
                      label={t('hr.bankAccountNumber')}
                    >
                      <Input disabled={!canWriteCompensation} />
                    </Form.Item>
                    <Form.Item name={['allowances', 'lunch']} label={t('hr.lunchAllowance')}>
                      <InputNumber
                        min={0}
                        disabled={!canWriteCompensation}
                        className={styles.salaryInput}
                      />
                    </Form.Item>
                    <Form.Item name={['allowances', 'fuel']} label={t('hr.fuelAllowance')}>
                      <InputNumber
                        min={0}
                        disabled={!canWriteCompensation}
                        className={styles.salaryInput}
                      />
                    </Form.Item>
                    <Form.Item name={['allowances', 'other']} label={t('hr.otherAllowance')}>
                      <InputNumber
                        min={0}
                        disabled={!canWriteCompensation}
                        className={styles.salaryInput}
                      />
                    </Form.Item>
                    <Form.Item
                      name="responsibilityAllowance"
                      label={t('hr.responsibilityAllowance')}
                    >
                      <InputNumber
                        min={0}
                        disabled={!canWriteCompensation}
                        className={styles.salaryInput}
                      />
                    </Form.Item>
                  </>
                )}
              </div>
            ),
          },
        ]
      : []),
    ...(isCreate
      ? [
          {
            key: 'access',
            label: t('hr.accessInformation'),
            children: (
              <Form.Item name="roleId" label={t('hr.role')} rules={required}>
                <Radio.Group className={styles.roleChoices}>
                  {(roles.data ?? []).map((role) => (
                    <Radio key={role.id} value={role.id}>
                      <strong>{role.name}</strong>
                      {role.description && <small>{role.description}</small>}
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            ),
          },
        ]
      : []),
  ]

  const loading = !isCreate && detail.isLoading
  const loadError = detail.error || departments.error || teams.error || roles.error
  const columns = isCreate
    ? [
        ['identity', 'compensation'],
        ['employment', 'access'],
      ]
    : [['identity', 'personal'], ['employment', 'contract', 'dependants'], ['compensation']]

  return (
    <Modal
      open
      title={isCreate ? t('hr.addStaff') : readOnly ? t('hr.profile') : t('hr.editProfile')}
      width={isCreate ? 1180 : 'calc(100vw - 32px)'}
      style={isCreate ? undefined : { maxWidth: 1700 }}
      wrapClassName={`${styles.staffEditorModal} ${isCreate ? styles.staffCreateModal : ''}`}
      footer={null}
      afterOpenChange={(open) => open && setContentReady(true)}
      onCancel={onClose}
    >
      {!contentReady || loading ? (
        <Skeleton active paragraph={{ rows: isCreate ? 6 : 12 }} />
      ) : (
        <Form
          className={styles.editorForm}
          form={form}
          layout="vertical"
          disabled={readOnly}
          onFinish={(values) => save.mutate(values)}
        >
          {loadError && <FeedbackAlert type="error" title={t('hr.profileUnavailable')} />}
          <div className={styles.editorMatrix}>
            {columns.map((column) => (
              <div className={styles.editorColumn} key={column.join('-')}>
                {column.map((key) => {
                  const item = items.find((candidate) => candidate.key === key)
                  return item ? (
                    <section className={styles.editorSection} key={key}>
                      <h3>{item.label}</h3>
                      {item.children}
                    </section>
                  ) : null
                })}
              </div>
            ))}
          </div>
          <Space className={styles.formActions}>
            <Button onClick={onClose}>{t('hr.cancel')}</Button>
            {!readOnly && (
              <Button type="primary" htmlType="submit" loading={save.isPending}>
                {t('hr.save')}
              </Button>
            )}
          </Space>
        </Form>
      )}
    </Modal>
  )
}
