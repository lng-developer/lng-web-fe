import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Input, Modal, Typography } from 'antd'

import './RequestDecisionModal.module.scss'

export type RequestDecision = {
  action: 'approve' | 'reject'
  employeeName?: string
  requestKind: 'leave' | 'overtime'
}

type RequestDecisionModalProps = {
  decision?: RequestDecision
  pending?: boolean
  onClose: () => void
  onSubmit: (reason?: string) => void
}

type DecisionFormValues = {
  reason: string
}

export function RequestDecisionModal({
  decision,
  pending = false,
  onClose,
  onSubmit,
}: RequestDecisionModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<DecisionFormValues>()
  const isRejecting = decision?.action === 'reject'

  useEffect(() => {
    if (!decision) return
    form.resetFields()
  }, [decision, form])

  const requestType =
    decision?.requestKind === 'leave'
      ? t('hrOperations.requests.leave')
      : t('hrOperations.requests.overtime')

  const submit = () => {
    if (isRejecting) {
      void form.submit()
      return
    }

    onSubmit()
  }

  return (
    <Modal
      destroyOnHidden
      className="request-decision-modal"
      open={Boolean(decision)}
      width={440}
      styles={{
        container: { padding: 0 },
        body: { padding: '20px 24px 12px' },
        footer: {
          padding: '12px 24px 20px',
          borderTop: 0,
          background: 'transparent',
        },
      }}
      title={
        isRejecting
          ? t('hrOperations.requests.rejectTitle')
          : t('hrOperations.requests.approveConfirmTitle')
      }
      okText={
        isRejecting
          ? t('hrOperations.requests.confirmReject')
          : t('hrOperations.requests.confirmApprove')
      }
      okButtonProps={{ danger: isRejecting }}
      cancelText={t('hrOperations.common.cancel')}
      confirmLoading={pending}
      onCancel={onClose}
      onOk={submit}
    >
      {decision && (
        <>
          <Typography.Paragraph>
            {isRejecting
              ? t('hrOperations.requests.rejectDescription')
              : t('hrOperations.requests.approveConfirmDescription', {
                  employee: decision.employeeName || t('hrOperations.common.employee'),
                  type: requestType,
                })}
          </Typography.Paragraph>

          {isRejecting && (
            <Form form={form} layout="vertical" onFinish={({ reason }) => onSubmit(reason.trim())}>
              <Form.Item
                name="reason"
                label={t('hrOperations.requests.decisionReason')}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t('hrOperations.requests.reasonRequired'),
                  },
                ]}
              >
                <Input.TextArea
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  placeholder={t('hrOperations.requests.decisionReasonPlaceholder')}
                />
              </Form.Item>
            </Form>
          )}
        </>
      )}
    </Modal>
  )
}
