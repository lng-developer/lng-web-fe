import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Input, Modal, Radio } from 'antd'

import { FeedbackAlert } from '@/shared/ui'

import type { ImportIssue, IssueUpdateInput } from '../api/integrationApi'

type ResolutionFormValues = IssueUpdateInput

export interface IssueResolutionModalProps {
  readonly issue?: ImportIssue
  readonly open: boolean
  readonly saving: boolean
  readonly error?: Error | null
  readonly onClose: () => void
  readonly onSubmit: (input: IssueUpdateInput) => void
}

export function IssueResolutionModal({
  issue,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: IssueResolutionModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<ResolutionFormValues>()

  useEffect(() => {
    if (open) form.setFieldsValue({ status: 'RESOLVED', note: '' })
  }, [form, issue?.id, open])

  const requestClose = () => {
    if (!form.isFieldsTouched()) {
      onClose()
      return
    }
    Modal.confirm({
      title: t('portal.integrations.resolution.discardTitle', {
        defaultValue: 'Discard this resolution?',
      }),
      content: t('portal.integrations.resolution.discardDescription', {
        defaultValue: 'Your note and selected outcome will be lost.',
      }),
      okText: t('portal.integrations.resolution.discard', { defaultValue: 'Discard' }),
      cancelText: t('portal.integrations.cancel', { defaultValue: 'Cancel' }),
      onOk: onClose,
    })
  }

  return (
    <Modal
      open={open}
      title={t('portal.integrations.resolution.title', { defaultValue: 'Resolve import issue' })}
      okText={t('portal.integrations.resolution.save', { defaultValue: 'Save resolution' })}
      cancelText={t('portal.integrations.cancel', { defaultValue: 'Cancel' })}
      confirmLoading={saving}
      onCancel={requestClose}
      onOk={() => void form.submit()}
    >
      <Form<ResolutionFormValues>
        form={form}
        initialValues={{ status: 'RESOLVED', note: '' }}
        layout="vertical"
        onFinish={onSubmit}
      >
        {error ? (
          <Form.Item>
            <FeedbackAlert type="error" title={error.message} />
          </Form.Item>
        ) : null}
        <Form.Item
          label={t('portal.integrations.resolution.outcome', { defaultValue: 'Outcome' })}
          name="status"
        >
          <Radio.Group
            aria-label={t('portal.integrations.resolution.outcome', { defaultValue: 'Outcome' })}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="RESOLVED">
              {t('portal.integrations.resolution.outcomes.RESOLVED', {
                defaultValue: 'RESOLVED',
              })}
            </Radio.Button>
            <Radio.Button value="IGNORED">
              {t('portal.integrations.resolution.outcomes.IGNORED', {
                defaultValue: 'IGNORED',
              })}
            </Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label={t('portal.integrations.resolution.note', { defaultValue: 'Resolution note' })}
          name="note"
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('portal.integrations.resolution.noteRequired', {
                defaultValue: 'Enter a resolution note',
              }),
            },
          ]}
        >
          <Input.TextArea
            aria-label={t('portal.integrations.resolution.note', {
              defaultValue: 'Resolution note',
            })}
            autoSize={{ minRows: 4, maxRows: 8 }}
            maxLength={2000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
