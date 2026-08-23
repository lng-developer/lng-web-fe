import { useTranslation } from 'react-i18next'
import { Divider, Form, Input } from 'antd'

import styles from '../ScheduleEditor.module.scss'
import type { ScheduleEditorModel } from '../useScheduleEditor'

type Props = {
  model: ScheduleEditorModel
}

export const LocationEditorFields = ({ model }: Props) => {
  const { t } = useTranslation()
  const required = [{ required: true, message: t('hrOperations.common.required') }]

  if (model.editor?.kind !== 'location') return null

  return (
    <>
      <Divider plain className={styles.modalSection}>
        {t('hrOperations.schedule.sections.locationIdentity')}
      </Divider>
      <Form.Item name="code" label={t('hrOperations.common.code')} rules={required}>
        <Input placeholder={t('hrOperations.schedule.placeholders.locationCode')} />
      </Form.Item>
      <Form.Item name="name" label={t('hrOperations.common.name')} rules={required}>
        <Input placeholder={t('hrOperations.schedule.placeholders.locationName')} />
      </Form.Item>
      <Form.Item
        name="timezone"
        label={t('hrOperations.common.timezone')}
        initialValue="Asia/Ho_Chi_Minh"
        rules={required}
      >
        <Input placeholder="Asia/Ho_Chi_Minh" />
      </Form.Item>
    </>
  )
}
