import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { Box, Button, Divider, IconButton, Stack, Typography } from '@mui/material'
import { z } from 'zod'

import FormTextField from '@/components/form/FormTextField'

const requiredText = (message) => z.string().trim().min(1, message)
const optionalText = z.string().trim().optional()

const personalProfileSchema = z.object({
  avatarUrl: z.string().trim().url('profile.validation.avatarUrl').or(z.literal('')),
  gender: optionalText,
  birthDate: optionalText,
  phoneNumber: requiredText('profile.validation.phoneRequired'),
  address: requiredText('profile.validation.addressRequired'),
  personalEmail: z.email('profile.validation.personalEmailInvalid'),
  emergencyContact: z.object({
    name: requiredText('profile.validation.emergencyNameRequired'),
    phone: requiredText('profile.validation.emergencyPhoneRequired'),
    relation: requiredText('profile.validation.emergencyRelationRequired'),
  }),
  dependantDetails: z.array(
    z.object({
      name: requiredText('profile.validation.dependantNameRequired'),
      relation: requiredText('profile.validation.dependantRelationRequired'),
      dob: optionalText,
      gender: optionalText,
    }),
  ),
  identityCard: optionalText,
  taxIdentification: optionalText,
  socialInsuranceNumber: optionalText,
  bankAccount: z.object({
    bankName: optionalText,
    accountNumber: optionalText,
  }),
})

function asText(value) {
  return typeof value === 'string' ? value : ''
}

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : ''
}

function defaultValues(profile = {}) {
  return {
    avatarUrl: asText(profile.avatarUrl),
    gender: asText(profile.gender),
    birthDate: toDateInput(profile.birthDate),
    phoneNumber: asText(profile.phoneNumber),
    address: asText(profile.address),
    personalEmail: asText(profile.personalEmail),
    emergencyContact: {
      name: asText(profile.emergencyContact?.name),
      phone: asText(profile.emergencyContact?.phone),
      relation: asText(profile.emergencyContact?.relation),
    },
    dependantDetails: (profile.dependantDetails || []).map((dependant) => ({
      name: asText(dependant.name),
      relation: asText(dependant.relation),
      dob: toDateInput(dependant.dob),
      gender: asText(dependant.gender),
    })),
    identityCard: asText(profile.identityCard),
    taxIdentification: asText(profile.taxIdentification),
    socialInsuranceNumber: asText(profile.socialInsuranceNumber),
    bankAccount: {
      bankName: asText(profile.bankAccount?.bankName),
      accountNumber: asText(profile.bankAccount?.accountNumber),
    },
  }
}

function buildPayload(values) {
  const payload = { ...values }

  if (!payload.birthDate) delete payload.birthDate
  payload.dependantDetails = payload.dependantDetails.map((dependant) => {
    const next = { ...dependant }
    if (!next.dob) delete next.dob
    return next
  })

  return payload
}

function FieldGroup({ title, children }) {
  return (
    <Box className="flex flex-col gap-4">
      <Typography variant="subtitle1" className="font-semibold">
        {title}
      </Typography>
      <Box className="grid gap-4 sm:grid-cols-2">{children}</Box>
    </Box>
  )
}

function CompanyContext({ profile, t }) {
  const items = [
    [t('profile.companyContext.employeeCode'), profile.employeeCode],
    [t('profile.companyContext.workEmail'), profile.workEmail],
    [t('profile.companyContext.department'), profile.department?.name || profile.department?.code],
    [t('profile.companyContext.team'), profile.team?.name || profile.team?.code],
    [t('profile.companyContext.jobTitle'), profile.jobTitle],
  ]

  return (
    <Box className="grid gap-3 rounded-lg border border-default bg-page p-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <Box key={label}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2" className="font-medium">
            {value || '—'}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

export default function PersonalProfileForm({ profile, isPending, onSubmit, submitLabel }) {
  const { t } = useTranslation()
  const form = useForm({
    resolver: zodResolver(personalProfileSchema),
    defaultValues: defaultValues(profile),
  })
  const dependants = useFieldArray({ control: form.control, name: 'dependantDetails' })

  useEffect(() => {
    form.reset(defaultValues(profile))
  }, [form, profile])

  return (
    <Stack
      component="form"
      spacing={3}
      onSubmit={form.handleSubmit((values) => onSubmit(buildPayload(values)))}
    >
      <CompanyContext profile={profile} t={t} />
      <FieldGroup title={t('profile.sections.personal')}>
        <FormTextField
          name="avatarUrl"
          control={form.control}
          label={t('profile.fields.avatarUrl')}
          placeholder={t('profile.placeholders.avatarUrl')}
        />
        <FormTextField
          name="gender"
          control={form.control}
          label={t('profile.fields.gender')}
          placeholder={t('profile.placeholders.gender')}
        />
        <FormTextField
          name="birthDate"
          control={form.control}
          label={t('profile.fields.birthDate')}
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </FieldGroup>
      <Divider />
      <FieldGroup title={t('profile.sections.contact')}>
        <FormTextField
          name="phoneNumber"
          control={form.control}
          label={t('profile.fields.phoneNumber')}
          autoComplete="tel"
        />
        <FormTextField
          name="personalEmail"
          control={form.control}
          label={t('profile.fields.personalEmail')}
          type="email"
          autoComplete="email"
        />
        <Box className="sm:col-span-2">
          <FormTextField
            name="address"
            control={form.control}
            label={t('profile.fields.address')}
            multiline
            minRows={2}
            autoComplete="street-address"
          />
        </Box>
      </FieldGroup>
      <Divider />
      <FieldGroup title={t('profile.sections.emergencyContact')}>
        <FormTextField
          name="emergencyContact.name"
          control={form.control}
          label={t('profile.fields.emergencyName')}
        />
        <FormTextField
          name="emergencyContact.phone"
          control={form.control}
          label={t('profile.fields.emergencyPhone')}
          autoComplete="tel"
        />
        <FormTextField
          name="emergencyContact.relation"
          control={form.control}
          label={t('profile.fields.emergencyRelation')}
        />
      </FieldGroup>
      <Divider />
      <FieldGroup title={t('profile.sections.dependants')}>
        <Box className="flex flex-col gap-3 sm:col-span-2">
          {dependants.fields.map((dependant, index) => (
            <Box
              key={dependant.id}
              className="grid gap-3 rounded-lg border border-default p-4 sm:grid-cols-2"
            >
              <FormTextField
                name={`dependantDetails.${index}.name`}
                control={form.control}
                label={t('profile.fields.dependantName')}
              />
              <FormTextField
                name={`dependantDetails.${index}.relation`}
                control={form.control}
                label={t('profile.fields.dependantRelation')}
              />
              <FormTextField
                name={`dependantDetails.${index}.dob`}
                control={form.control}
                label={t('profile.fields.dependantBirthDate')}
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Box className="flex items-end gap-2">
                <Box className="flex-1">
                  <FormTextField
                    name={`dependantDetails.${index}.gender`}
                    control={form.control}
                    label={t('profile.fields.gender')}
                  />
                </Box>
                <IconButton
                  aria-label={t('profile.actions.removeDependant')}
                  onClick={() => dependants.remove(index)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
          <Button
            variant="outlined"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => dependants.append({ name: '', relation: '', dob: '', gender: '' })}
            className="self-start"
          >
            {t('profile.actions.addDependant')}
          </Button>
        </Box>
      </FieldGroup>
      <Divider />
      <FieldGroup title={t('profile.sections.identityTax')}>
        <FormTextField
          name="identityCard"
          control={form.control}
          label={t('profile.fields.identityCard')}
        />
        <FormTextField
          name="taxIdentification"
          control={form.control}
          label={t('profile.fields.taxIdentification')}
        />
        <FormTextField
          name="socialInsuranceNumber"
          control={form.control}
          label={t('profile.fields.socialInsuranceNumber')}
        />
      </FieldGroup>
      <Divider />
      <FieldGroup title={t('profile.sections.bank')}>
        <FormTextField
          name="bankAccount.bankName"
          control={form.control}
          label={t('profile.fields.bankName')}
        />
        <FormTextField
          name="bankAccount.accountNumber"
          control={form.control}
          label={t('profile.fields.bankAccountNumber')}
        />
      </FieldGroup>
      <Box className="flex justify-end">
        <Button type="submit" variant="contained" disabled={isPending}>
          {submitLabel}
        </Button>
      </Box>
    </Stack>
  )
}
