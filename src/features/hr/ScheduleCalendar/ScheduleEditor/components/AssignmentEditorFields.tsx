import { useTranslation } from 'react-i18next'
import { Col, Divider, Form, Row, Select } from 'antd'

import { DateTimePicker } from '@/shared/ui'

import styles from '../ScheduleEditor.module.scss'
import type { ScheduleEditorModel } from '../useScheduleEditor'

type Props = {
  model: ScheduleEditorModel
}

export const AssignmentEditorFields = ({ model }: Props) => {
  const { t } = useTranslation()
  const required = [{ required: true, message: t('hrOperations.common.required') }]

  if (model.editor?.kind !== 'assignment') return null

  return (
    <>
      <Divider plain className={styles.modalSection}>
        {t('hrOperations.schedule.sections.shiftAssignment')}
      </Divider>
      <Form.Item name="profileId" label={t('hrOperations.common.employee')} rules={required}>
        <Select
          showSearch
          optionFilterProp="label"
          options={model.employeeOptions}
          placeholder={t('hrOperations.schedule.placeholders.searchEmployee')}
        />
      </Form.Item>
      <Form.Item name="shiftId" label={t('hrOperations.schedule.shift')} rules={required}>
        <Select
          options={model.shifts.data?.items.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />
      </Form.Item>
      <Form.Item name="workLocationId" label={t('hrOperations.common.location')} rules={required}>
        <Select
          options={model.locations.data?.items.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="effectiveFrom" label={t('hrOperations.common.from')} rules={required}>
            <DateTimePicker mode="date" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="effectiveTo" label={t('hrOperations.common.to')}>
            <DateTimePicker mode="date" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="status" label={t('hrOperations.common.status')} rules={required}>
        <Select
          options={['ACTIVE', 'INACTIVE'].map((value) => ({
            value,
            label: t(`hrOperations.schedule.statuses.${value}`),
          }))}
        />
      </Form.Item>
    </>
  )
}
