import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.login.errors.emailRequired')
    .pipe(z.email('auth.errors.emailInvalid')),
})

export const forgotPasswordDefaultValues = {
  email: '',
}

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'auth.errors.passwordMin'),
    confirmPassword: z.string().min(1, 'auth.errors.confirmPasswordRequired'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'auth.errors.passwordMismatch',
    path: ['confirmPassword'],
  })

export const resetPasswordDefaultValues = {
  password: '',
  confirmPassword: '',
}
