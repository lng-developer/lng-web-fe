import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LockOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input } from 'antd'

import { ApiError } from '@/shared/api'

import { changeOwnPassword, login } from '../../api/authApi'
import { SetupLayout } from '../components/SetupLayout'

type PasswordValues = { currentPassword: string; newPassword: string; confirmation: string }

export function PasswordSetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function submit(values: PasswordValues) {
    setError(undefined)
    setSubmitting(true)
    try {
      const account = await changeOwnPassword(values.currentPassword, values.newPassword)
      try {
        await login(account.email, values.newPassword)
      } catch {
        navigate('/login', { replace: true, state: { passwordChanged: true } })
        return
      }
      navigate('/setup/profile', { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('errors.unexpected'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SetupLayout
      currentStep={0}
      title={t('auth.setup.password.title')}
      description={t('auth.setup.password.description')}
    >
      {error && <Alert showIcon type="error" title={error} />}
      <Form<PasswordValues> layout="vertical" requiredMark={false} onFinish={submit}>
        <Form.Item
          name="currentPassword"
          label={t('auth.setup.password.current')}
          rules={[{ required: true }]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t('auth.setup.password.new')}
          rules={[{ required: true }, { min: 6 }]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmation"
          label={t('auth.setup.password.confirm')}
          dependencies={['newPassword']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                return !value || getFieldValue('newPassword') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('auth.setup.password.mismatch')))
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" autoComplete="new-password" />
        </Form.Item>
        <Button block size="large" type="primary" htmlType="submit" loading={submitting}>
          {t('auth.setup.continue')}
        </Button>
      </Form>
    </SetupLayout>
  )
}
