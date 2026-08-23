import { useTranslation } from 'react-i18next'
import { Form, Modal } from 'antd'

import { FormActions } from '@/shared/ui'

import { AssignmentEditorFields } from './components/AssignmentEditorFields'
import { HolidayEditorFields } from './components/HolidayEditorFields'
import { LocationEditorFields } from './components/LocationEditorFields'
import { OverrideEditorFields } from './components/OverrideEditorFields'
import { RotationEditorFields } from './components/RotationEditorFields'
import { ShiftEditorFields } from './components/ShiftEditorFields'
import styles from './ScheduleEditor.module.scss'
import type { ScheduleEditorModel } from './useScheduleEditor'

type ScheduleEditorProps = {
  model: ScheduleEditorModel
}

export const ScheduleEditor = ({ model }: ScheduleEditorProps) => {
  const { t } = useTranslation()

  const title = t(
    `hrOperations.schedule.${
      model.editor?.kind === 'location'
        ? 'locationEditor'
        : model.editor?.kind === 'shift'
          ? 'shiftEditor'
          : model.editor?.kind === 'assignment'
            ? 'assignmentEditor'
            : model.editor?.kind === 'override'
              ? 'overrideEditor'
              : model.editor?.kind === 'holiday'
                ? 'holidayEditor'
                : 'rotationEditor'
    }`,
  )

  return (
    <Modal
      centered
      destroyOnHidden
      open={Boolean(model.editor)}
      title={title}
      footer={null}
      width="80%"
      style={{ maxWidth: 1200 }}
      onCancel={model.closeEditor}
    >
      <Form
        className={styles.modalForm}
        form={model.form}
        layout="vertical"
        onFinish={(values) => model.save.mutate(values)}
      >
        <LocationEditorFields model={model} />
        <ShiftEditorFields model={model} />
        <AssignmentEditorFields model={model} />
        <OverrideEditorFields model={model} />
        <HolidayEditorFields model={model} />
        <RotationEditorFields model={model} />

        <Form.Item shouldUpdate noStyle>
          {() => (
            <FormActions
              cancelLabel={t('hrOperations.common.cancel')}
              dirty={model.form.isFieldsTouched()}
              onCancel={model.closeEditor}
              saving={model.save.isPending}
              submitLabel={t('hrOperations.common.save')}
            />
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}
