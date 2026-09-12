import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UploadFile } from 'antd'
import { Form, Input, Modal, Select } from 'antd'

import { FileUpload, FormSection, FormSectionFull } from '@/shared/ui'

import type { CreateDesignTaskInput } from '../api/designApi'

const TASK_TYPES = ['MOCKUP', 'PNG_ASSET', 'IDEA', 'CLONE'] as const
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const
const OUTPUT_TYPES = ['MOCKUP', 'PNG_ASSET', 'IDEA'] as const

const enumLabelKey = (group: 'taskTypes' | 'priorities' | 'outputTypes', value: string) =>
  `portal.design.${group}.${value}`

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
  const taskType = Form.useWatch('taskType', form) ?? 'MOCKUP'
  const sourceMode = Form.useWatch('sourceMode', form)
  const fixedOutput = taskType === 'MOCKUP' || taskType === 'PNG_ASSET' ? taskType : undefined

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
      ...(fixedOutput
        ? { expectedOutputs: [fixedOutput] }
        : values.expectedOutputs?.length
          ? { expectedOutputs: values.expectedOutputs }
          : {}),
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
      width="min(640px, calc(100vw - 32px))"
      styles={{ body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' } }}
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
        initialValues={{ taskType: 'MOCKUP', priority: 'NORMAL', expectedOutputs: [] }}
        onFinish={submit}
        onValuesChange={(changed) => {
          if (changed.taskType !== undefined)
            form.setFieldsValue({
              sourceMode: undefined,
              sourceId: undefined,
              expectedOutputs: [],
            })
          if (changed.sourceMode !== undefined) form.setFieldValue('sourceId', undefined)
        }}
      >
        <FormSection title={t('portal.design.taskSetup', 'Task setup')}>
          <FormSectionFull>
            <Form.Item
              name="listingId"
              label={t('portal.design.listing')}
              rules={[{ required: true, message: t('portal.design.listingRequired') }]}
            >
              <Select
                aria-label={t('portal.design.listing')}
                showSearch
                optionFilterProp="label"
                options={listings.map(({ id, sku }) => ({
                  value: id,
                  label: sku,
                }))}
              />
            </Form.Item>
          </FormSectionFull>
          <Form.Item
            name="taskType"
            label={t('portal.design.taskType')}
            rules={[{ required: true }]}
          >
            <Select
              aria-label={t('portal.design.taskType')}
              options={TASK_TYPES.map((value) => ({
                value,
                label: t(enumLabelKey('taskTypes', value)),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="priority"
            label={t('portal.design.priority')}
            rules={[{ required: true }]}
          >
            <Select
              aria-label={t('portal.design.priority')}
              options={PRIORITIES.map((value) => ({
                value,
                label: t(enumLabelKey('priorities', value)),
              }))}
            />
          </Form.Item>
        </FormSection>

        <FormSection title={t('portal.design.requirements', 'Requirements')}>
          <FormSectionFull>
            <Form.Item
              name="brief"
              label={t('portal.design.brief')}
              rules={[{ required: taskType === 'IDEA', message: t('portal.design.briefRequired') }]}
            >
              <Input.TextArea rows={2} />
            </Form.Item>
          </FormSectionFull>
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
                        ? listings.map(({ id, sku }) => ({
                            value: id,
                            label: sku,
                          }))
                        : templates.map(({ id, name }) => ({ value: id, label: name }))
                    }
                  />
                </Form.Item>
              ) : null}
            </>
          ) : null}
          {fixedOutput ? (
            <Form.Item label={t('portal.design.expectedOutputs')}>
              <Input value={t(enumLabelKey('outputTypes', fixedOutput))} disabled />
            </Form.Item>
          ) : (
            <Form.Item name="expectedOutputs" label={t('portal.design.expectedOutputs')}>
              <Select
                mode="multiple"
                aria-label={t('portal.design.expectedOutputs')}
                options={OUTPUT_TYPES.map((value) => ({
                  value,
                  label: t(enumLabelKey('outputTypes', value)),
                }))}
              />
            </Form.Item>
          )}
          <FormSectionFull>
            <Form.Item name="note" label={t('portal.design.note')}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </FormSectionFull>
        </FormSection>

        <FormSection title={t('portal.design.attachments', 'Attachments')}>
          <FormSectionFull>
            <Form.Item label={t('portal.design.referenceFiles')}>
              <FileUpload
                multiple
                fileList={referenceFiles}
                title={t('portal.design.dropFiles')}
                description={t('portal.design.referenceFiles')}
                onChange={({ fileList }) => setReferenceFiles(fileList)}
              />
            </Form.Item>
          </FormSectionFull>
        </FormSection>
      </Form>
    </Modal>
  )
}
