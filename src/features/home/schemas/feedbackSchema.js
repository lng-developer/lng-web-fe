import { z } from 'zod'

// Message của mỗi rule là một i18n key (locales/{vi,en}/common.json),
// được dịch trong FormTextField bằng useTranslation().
export const feedbackSchema = z.object({
  name: z.string().min(1, 'feedback.errors.nameRequired'),
  email: z.email('feedback.errors.emailInvalid'),
  message: z.string().min(1, 'feedback.errors.messageRequired'),
})

export const feedbackDefaultValues = {
  name: '',
  email: '',
  message: '',
}
