import { z } from 'zod'

// Message của mỗi rule là một i18n key (i18n/locales/{vi,en}/common.json),
// được dịch trong FormTextField bằng useTranslation().
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'auth.login.errors.identifierRequired'),
  password: z.string().min(1, 'auth.login.errors.passwordRequired'),
})

export const loginDefaultValues = {
  identifier: '',
  password: '',
}
