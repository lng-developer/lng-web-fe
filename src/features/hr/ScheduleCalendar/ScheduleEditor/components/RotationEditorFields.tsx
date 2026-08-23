import { useTranslation } from 'react-i18next'
import { Checkbox, Divider, Form, InputNumber, Select } from 'antd'

import { DateTimePicker, MonthPicker } from '@/shared/ui'

import styles from '../ScheduleEditor.module.scss'
import type { ScheduleEditorModel } from '../useScheduleEditor'

type Props = {
  model: ScheduleEditorModel
}

export const RotationEditorFields = ({ model }: Props) => {
  const { t } = useTranslation()
  const required = [{ required: true, message: t('hrOperations.common.required') }]

  if (model.editor?.kind === 'rotation') {
    return (
      <>
        <Divider plain className={styles.modalSection}>
          {t('hrOperations.schedule.rotationGenerator')}
        </Divider>
        <Form.Item name="teamId" label={t('hrOperations.common.team')} rules={required}>
          <Select
            showSearch
            optionFilterProp="label"
            options={model.teams.data?.items.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            placeholder={t('hrOperations.schedule.placeholders.selectTeam')}
          />
        </Form.Item>
        <Form.Item
          name="minPresent"
          label={t('hrOperations.schedule.minimumStaff')}
          initialValue={1}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </>
    )
  }

  if (model.editor?.kind !== 'rotationManual') return null

  return (
    <>
      <Divider plain className={styles.modalSection}>
        {t('hrOperations.schedule.rotationDetail')}
      </Divider>
      <Form.Item name="teamId" label={t('hrOperations.common.team')} rules={required}>
        <Select
          showSearch
          optionFilterProp="label"
          options={model.teamOptions}
          placeholder={t('hrOperations.schedule.placeholders.selectTeam')}
          disabled={Boolean(model.editor.item)}
          onChange={() => {
            model.form.setFieldsValue({
              employeeProfileIdsByDate: model.manualDefaultOffByDate,
            })
          }}
        />
      </Form.Item>

      {model.editor.item ? (
        <Form.Item name="dateKey" label={t('hrOperations.common.date')} rules={required}>
          <DateTimePicker mode="date" disabled />
        </Form.Item>
      ) : (
        <Form.Item name="month" label={t('hrOperations.common.month')} rules={required}>
          <MonthPicker
            onChange={(value) => {
              if (!value) return
              model.form.setFieldsValue({
                employeeProfileIdsByDate: Object.fromEntries(
                  model.saturdaysOfMonth(value).map((dateKey) => [dateKey, []]),
                ),
              })
            }}
          />
        </Form.Item>
      )}

      {model.editor.item ? (
        <Form.Item
          name="employeeProfileIds"
          label={t('hrOperations.schedule.staff')}
          rules={required}
        >
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            options={model.manualTeamEmployees}
            placeholder={t('hrOperations.schedule.placeholders.selectStaff')}
          />
        </Form.Item>
      ) : (
        <div className={styles.modalStack}>
          {model.manualSaturdays.map((dateKey) => (
            <Form.Item
              key={dateKey}
              name={['employeeProfileIdsByDate', dateKey]}
              label={`${model.saturdayWeekLabel(dateKey)} ${t(
                'hrOperations.schedule.restingStaff',
              )}`}
            >
              <Checkbox.Group
                options={model.manualTeamEmployees}
                className={styles.checkboxGroup}
                disabled={!model.manualTeamId || !model.manualSaturdays.length}
              />
            </Form.Item>
          ))}
        </div>
      )}
    </>
  )
}
