import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Stack } from '@mui/material'
import { useSnackbar } from 'notistack'

import FormTextField from '@/components/form/FormTextField'

import { feedbackDefaultValues, feedbackSchema } from '../schemas/feedbackSchema'

export default function FeedbackForm() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues: feedbackDefaultValues,
  })

  // Demo: thay phần dưới bằng mutation TanStack Query gọi API thực tế
  // (xem CONVENTIONS.md mục "Forms & validation").
  const onSubmit = () => {
    enqueueSnackbar(t('feedback.success'), { variant: 'success' })
    reset()
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2}>
      <FormTextField name="name" control={control} label={t('feedback.name')} />
      <FormTextField name="email" control={control} label={t('feedback.email')} />
      <FormTextField
        name="message"
        control={control}
        label={t('feedback.message')}
        multiline
        minRows={3}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting} className="self-start">
        {t('feedback.submit')}
      </Button>
    </Stack>
  )
}
