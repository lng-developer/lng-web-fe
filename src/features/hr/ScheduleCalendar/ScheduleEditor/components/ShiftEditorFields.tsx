import { useTranslation } from 'react-i18next'
import { Col, Divider, Form, Input, InputNumber, Row, Select } from 'antd'

import { DateTimePicker } from '@/shared/ui'

import styles from '../ScheduleEditor.module.scss'
import type { ScheduleEditorModel } from '../useScheduleEditor'

type Props = {
  model: ScheduleEditorModel
}

export const ShiftEditorFields = ({ model }: Props) => {
  const { t } = useTranslation()
  const required = [{ required: true, message: t('hrOperations.common.required') }]

  if (model.editor?.kind !== 'shift') return null

  return (
    <>
      <Divider plain className={styles.modalSection}>
        {t('hrOperations.schedule.sections.shiftDetails')}
      </Divider>
      <Form.Item name="code" label={t('hrOperations.common.code')} rules={required}>
        <Input placeholder={t('hrOperations.schedule.placeholders.shiftCode')} />
      </Form.Item>
      <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
        <Input placeholder={t('hrOperations.schedule.placeholders.shiftName')} />
      </Form.Item>
      <Form.Item name="workLocationId" label={t('hrOperations.common.location')}>
        <Select
          allowClear
          options={model.locations.data?.items.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="startTime" label={t('hrOperations.schedule.start')} rules={required}>
            <DateTimePicker mode="time" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="endTime" label={t('hrOperations.schedule.end')} rules={required}>
            <DateTimePicker mode="time" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="breakMinutes" label={t('hrOperations.schedule.breakMinutes')}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="60" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="graceMinutes" label={t('hrOperations.schedule.graceMinutes')}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="15" />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}
