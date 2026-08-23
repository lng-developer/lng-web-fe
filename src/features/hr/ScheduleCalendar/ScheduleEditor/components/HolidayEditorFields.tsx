import { useTranslation } from 'react-i18next'
import { Divider, Form, Input, Select } from 'antd'

import { DateTimePicker } from '@/shared/ui'

import styles from '../ScheduleEditor.module.scss'
import type { ScheduleEditorModel } from '../useScheduleEditor'

type Props = {
  model: ScheduleEditorModel
}

export const HolidayEditorFields = ({ model }: Props) => {
  const { t } = useTranslation()
  const required = [{ required: true, message: t('hrOperations.common.required') }]

  if (model.editor?.kind !== 'holiday') return null

  return (
    <>
      <Divider plain className={styles.modalSection}>
        {t('hrOperations.schedule.sections.holidayInfo')}
      </Divider>
      <Form.Item name="dateKey" label={t('hrOperations.common.date')} rules={required}>
        <DateTimePicker mode="date" />
      </Form.Item>
      <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
        <Input placeholder={t('hrOperations.schedule.placeholders.holidayName')} />
      </Form.Item>
      <Form.Item
        name="holidayType"
        label={t('hrOperations.common.type')}
        initialValue="PUBLIC_HOLIDAY"
      >
        <Select
          options={['PUBLIC_HOLIDAY', 'SUBSTITUTE_WORK_DAY'].map((value) => ({
            value,
            label: model.holidayTypeLabel(value),
          }))}
        />
      </Form.Item>
      <Form.Item name="note" label={t('hrOperations.common.note')}>
        <Input placeholder={t('hrOperations.schedule.placeholders.optionalNote')} />
      </Form.Item>
    </>
  )
}
