import { useTranslation } from 'react-i18next'
import { Divider, Form, Input, Select } from 'antd'

import { DateTimePicker } from '@/shared/ui'

import styles from '../ScheduleEditor.module.scss'
import type { ScheduleEditorModel } from '../useScheduleEditor'

type Props = {
  model: ScheduleEditorModel
}

export function OverrideEditorFields({ model }: Props) {
  const { t } = useTranslation()
  const required = [{ required: true, message: t('hrOperations.common.required') }]

  if (model.editor?.kind !== 'override') return null

  return (
    <>
      <Divider plain className={styles.modalSection}>
        {t('hrOperations.schedule.sections.calendarOverride')}
      </Divider>
      <Form.Item name="dateKey" label={t('hrOperations.common.date')} rules={required}>
        <DateTimePicker mode="date" />
      </Form.Item>
      <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
        <Input placeholder={t('hrOperations.schedule.placeholders.overrideName')} />
      </Form.Item>
      <Form.Item name="kind" label={t('hrOperations.common.type')} rules={required}>
        <Select
          options={['HOLIDAY', 'REST_DAY', 'WORKING_DAY'].map((value) => ({
            value,
            label: model.overrideKindLabel(value),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="scopeType"
        label={t('hrOperations.common.scope')}
        initialValue="GLOBAL"
        rules={required}
      >
        <Select
          options={['GLOBAL', 'WORK_LOCATION', 'DEPARTMENT', 'TEAM', 'PROFILE'].map((value) => ({
            value,
            label: model.scopeTypeLabel(value),
          }))}
        />
      </Form.Item>
    </>
  )
}
