import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UploadFile } from 'antd'
import { Form, Input, Modal, Select, Upload } from 'antd'

import type { CreateDesignTaskInput } from '../api/designApi'

const TASK_TYPES = ['PSD_TEMPLATE', 'MOCKUP', 'PNG_ASSET', 'IDEA', 'CLONE'] as const
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const
const OUTPUT_TYPES = ['PSD_TEMPLATE', 'MOCKUP', 'PNG_ASSET', 'IDEA'] as const

type ListingOption = { id: string; sku: string; title: string }
type TemplateOption = { id: string; name: string }
type FormValues = {
  listingId: string
  taskType: CreateDesignTaskInput['taskType']
  priority: NonNullable<CreateDesignTaskInput['priority']>
  brief?: string
  note?: string
  expectedOutputs?: NonNullable<CreateDesignTaskInput['expectedOutputs']>
  sourceMode?: 'LISTING' | 'TEMPLATE'
  sourceId?: string
}

export type CreateDesignTaskDraft = Omit<CreateDesignTaskInput, 'referenceAssetIds'> & {
  referenceFiles: UploadFile[]
}

export function CreateDesignTaskModal({
  open,
  listings,
  templates,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean
  listings: ListingOption[]
  templates: TemplateOption[]
  saving: boolean
  onClose: () => void
  onSubmit: (draft: CreateDesignTaskDraft) => void
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm<FormValues>()
  const [referenceFiles, setReferenceFiles] = useState<UploadFile[]>([])
  const taskType = Form.useWatch('taskType', form) ?? 'PSD_TEMPLATE'
  const sourceMode = Form.useWatch('sourceMode', form)

  const submit = (values: FormValues) => {
    const source =
      taskType === 'CLONE' && values.sourceId
        ? values.sourceMode === 'LISTING'
          ? { sourceListingId: values.sourceId }
          : { sourceInternalTemplateId: values.sourceId }
        : {}
    onSubmit({
      listingId: values.listingId,
      taskType,
      priority: values.priority,
      ...(values.brief?.trim() ? { brief: values.brief.trim() } : {}),
      ...(values.note?.trim() ? { note: values.note.trim() } : {}),
      ...(values.expectedOutputs?.length ? { expectedOutputs: values.expectedOutputs } : {}),
      ...source,
      referenceFiles,
    })
  }

  return (
    <Modal
      open={open}
      title={t('portal.design.createDesignTask')}
      okText={t('portal.design.create')}
      confirmLoading={saving}
      afterClose={() => {
        form.resetFields()
        setReferenceFiles([])
      }}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ taskType: 'PSD_TEMPLATE', priority: 'NORMAL', expectedOutputs: [] }}
        onFinish={submit}
        onValuesChange={(changed) => {
          if (changed.taskType !== undefined)
            form.setFieldsValue({ sourceMode: undefined, sourceId: undefined })
          if (changed.sourceMode !== undefined) form.setFieldValue('sourceId', undefined)
        }}
      >
        <Form.Item
          name="listingId"
          label={t('portal.design.listing')}
          rules={[{ required: true, message: t('portal.design.listingRequired') }]}
        >
          <Select
            aria-label={t('portal.design.listing')}
            showSearch
            optionFilterProp="label"
            options={listings.map(({ id, sku, title }) => ({
              value: id,
              label: `${sku} - ${title}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="taskType" label={t('portal.design.taskType')} rules={[{ required: true }]}>
          <Select
            aria-label={t('portal.design.taskType')}
            options={TASK_TYPES.map((value) => ({ value, label: value }))}
          />
        </Form.Item>
        <Form.Item name="priority" label={t('portal.design.priority')} rules={[{ required: true }]}>
          <Select
            aria-label={t('portal.design.priority')}
            options={PRIORITIES.map((value) => ({ value, label: value }))}
          />
        </Form.Item>
        <Form.Item
          name="brief"
          label={t('portal.design.brief')}
          rules={[{ required: taskType === 'IDEA', message: t('portal.design.briefRequired') }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        {taskType === 'CLONE' ? (
          <>
            <Form.Item
              name="sourceMode"
              label={t('portal.design.sourceType')}
              rules={[{ required: true, message: t('portal.design.sourceRequired') }]}
            >
              <Select
                aria-label={t('portal.design.sourceType')}
                options={[
                  { value: 'LISTING', label: t('portal.design.sourceListing') },
                  { value: 'TEMPLATE', label: t('portal.design.sourceTemplate') },
                ]}
              />
            </Form.Item>
            {sourceMode ? (
              <Form.Item
                name="sourceId"
                label={t('portal.design.source')}
                rules={[{ required: true, message: t('portal.design.sourceRequired') }]}
              >
                <Select
                  aria-label={t('portal.design.source')}
                  showSearch
                  optionFilterProp="label"
                  options={
                    sourceMode === 'LISTING'
                      ? listings.map(({ id, sku, title }) => ({
                          value: id,
                          label: `${sku} - ${title}`,
                        }))
                      : templates.map(({ id, name }) => ({ value: id, label: name }))
                  }
                />
              </Form.Item>
            ) : null}
          </>
        ) : null}
        <Form.Item name="expectedOutputs" label={t('portal.design.expectedOutputs')}>
          <Select
            mode="multiple"
            aria-label={t('portal.design.expectedOutputs')}
            options={OUTPUT_TYPES.map((value) => ({ value, label: value }))}
          />
        </Form.Item>
        <Form.Item name="note" label={t('portal.design.note')}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label={t('portal.design.referenceFiles')}>
          <Upload.Dragger
            multiple
            fileList={referenceFiles}
            beforeUpload={(file) => {
              setReferenceFiles((current) => [...current, file])
              return false
            }}
            onRemove={(file) =>
              setReferenceFiles((current) => current.filter(({ uid }) => uid !== file.uid))
            }
          >
            <p>{t('portal.design.dropFiles')}</p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  )
}
