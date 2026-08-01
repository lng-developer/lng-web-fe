import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Input, InputNumber, Modal, Select } from 'antd'

import type { WorkScoreDetail, WorkScoreLevel } from '../api/workScoreApi'

type Props = {
  readonly mode: 'override' | 'void'
  readonly score?: WorkScoreDetail
  readonly open: boolean
  readonly loading: boolean
  readonly onClose: () => void
  readonly onSubmit: (input: {
    points?: number
    scoreLevel?: WorkScoreLevel
    reason: string
    expectedVersion: number
  }) => void
}

export function WorkScoreAdjustmentModal({ mode, score, open, loading, onClose, onSubmit }: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const wasOpen = useRef(false)

  useEffect(() => {
    if (!open) {
      wasOpen.current = false
      return
    }
    form.setFieldsValue({ points: score?.finalPoints, scoreLevel: score?.scoreLevel })
    if (!wasOpen.current) form.setFieldValue('reason', '')
    wasOpen.current = true
  }, [form, open, score])

  return (
    <Modal
      open={open}
      title={t(`portal.workScores.actions.${mode}`)}
      okText={t('portal.workScores.actions.confirm')}
      confirmLoading={loading}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((values) =>
          onSubmit({
            ...(mode === 'override'
              ? { points: values.points, scoreLevel: values.scoreLevel }
              : {}),
            reason: values.reason,
            expectedVersion: score?.version ?? 0,
          }),
        )
      }
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {mode === 'override' ? (
          <>
            <Form.Item
              name="points"
              label={t('portal.workScores.fields.points')}
              rules={[{ required: true }, { type: 'number', min: 0 }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="scoreLevel" label={t('portal.workScores.fields.level')}>
              <Select
                options={['BASIC', 'STANDARD', 'HARD', 'BONUS'].map((value) => ({ value }))}
              />
            </Form.Item>
          </>
        ) : null}
        <Form.Item
          name="reason"
          label={t('portal.workScores.fields.reason')}
          rules={[{ required: true }, { min: 2 }, { max: 500 }]}
        >
          <Input.TextArea minLength={2} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}
