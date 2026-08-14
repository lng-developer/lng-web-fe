import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Col, Divider, Form, Input, Modal, Row, Select } from 'antd'

import { DateTimePicker, FormActions, useFeedbackToast } from '@/shared/ui'

import {
  createLeaveRequest,
  createOvertimeRequest,
  type LeaveRequest,
  type OvertimeRequest,
  previewLeaveRequest,
  updateLeaveRequest,
  updateOvertimeRequest,
} from '../api/hrTimeApi'
import styles from './HrOperationsPage.module.scss'

export type TimeRequestKind = 'leave' | 'overtime'

export function TimeRequestEditorModal({
  dateKey,
  kind,
  onClose,
  request,
}: {
  dateKey?: string
  kind?: TimeRequestKind
  onClose: () => void
  request?: LeaveRequest | OvertimeRequest
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  useEffect(() => {
    if (!kind) return
    form.resetFields()
    form.setFieldsValue(
      kind === 'leave'
        ? {
            leaveType: 'ANNUAL',
            portion: 'FULL_DAY',
            startDateKey: dateKey,
            endDateKey: dateKey,
            ...request,
          }
        : { workDateKey: dateKey, ...request },
    )
  }, [dateKey, form, kind, request])

  const save = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      if (request)
        return kind === 'leave'
          ? updateLeaveRequest(request.id, values)
          : updateOvertimeRequest(request.id, values)
      return kind === 'leave'
        ? (await previewLeaveRequest(values), createLeaveRequest(values))
        : createOvertimeRequest(values)
    },
    onSuccess: () => {
      onClose()
      form.resetFields()
      toast(
        'success',
        t(request ? 'hrOperations.messages.updated' : 'hrOperations.messages.requestSent'),
      )
      void queryClient.invalidateQueries({ queryKey: ['hr-time'] })
      void queryClient.invalidateQueries({ queryKey: ['hr-workspace', 'self'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.requestFailed'), error.message),
  })

  const title = request
    ? `${t('hrOperations.common.edit')} ${t(kind === 'leave' ? 'hrOperations.requests.leave' : 'hrOperations.requests.overtime')}`
    : t(
        kind === 'leave'
          ? 'hrOperations.requests.createLeave'
          : 'hrOperations.requests.createOvertime',
      )

  return (
    <Modal
      centered
      destroyOnHidden
      open={Boolean(kind)}
      title={title}
      footer={null}
      width={520}
      onCancel={onClose}
    >
      <Form
        className={styles.modalForm}
        form={form}
        layout="vertical"
        onFinish={(values) => save.mutate(values)}
      >
        {kind === 'leave' ? (
          <>
            <Divider plain className={styles.modalSection}>
              {t('hrOperations.requests.leave')}
            </Divider>
            <Form.Item
              name="leaveType"
              label={t('hrOperations.requests.leaveType')}
              rules={[{ required: true }]}
            >
              <Select
                options={['ANNUAL', 'SICK', 'UNPAID', 'PERSONAL_PAID', 'PERSONAL_UNPAID'].map(
                  (value) => ({ value, label: value }),
                )}
              />
            </Form.Item>
            <Form.Item
              name="portion"
              label={t('hrOperations.requests.duration')}
              rules={[{ required: true }]}
            >
              <Select
                options={['FULL_DAY', 'MORNING', 'AFTERNOON'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="startDateKey"
                  label={t('hrOperations.common.from')}
                  rules={[{ required: true }]}
                >
                  <DateTimePicker mode="date" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="endDateKey"
                  label={t('hrOperations.common.to')}
                  rules={[{ required: true }]}
                >
                  <DateTimePicker mode="date" />
                </Form.Item>
              </Col>
            </Row>
          </>
        ) : (
          <>
            <Divider plain className={styles.modalSection}>
              {t('hrOperations.requests.overtime')}
            </Divider>
            <Form.Item
              name="workDateKey"
              label={t('hrOperations.common.date')}
              rules={[{ required: true }]}
            >
              <DateTimePicker mode="date" />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="plannedStartTime"
                  label={t('hrOperations.common.from')}
                  rules={[{ required: true }]}
                >
                  <DateTimePicker mode="time" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="plannedEndTime"
                  label={t('hrOperations.common.to')}
                  rules={[{ required: true }]}
                >
                  <DateTimePicker mode="time" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
        <Form.Item
          name="reason"
          label={t('hrOperations.common.reason')}
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={3} placeholder="Please provide reason for this request..." />
        </Form.Item>

        <Form.Item shouldUpdate noStyle>
          {() => (
            <FormActions
              cancelLabel={t('hrOperations.common.cancel')}
              dirty={form.isFieldsTouched()}
              onCancel={onClose}
              saving={save.isPending}
              submitLabel={t('hrOperations.common.submit')}
            />
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}
