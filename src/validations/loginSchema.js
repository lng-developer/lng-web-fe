import { z } from 'zod'

// Message của mỗi rule là một i18n key (i18n/locales/{vi,en}/common.json),
// được dịch trong FormTextField bằng useTranslation().
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.login.errors.emailRequired')
    .pipe(z.email('auth.login.errors.emailInvalid')),
  password: z.string().min(1, 'auth.login.errors.passwordRequired'),
})

export const loginDefaultValues = {
  email: '',
  password: '',
}
