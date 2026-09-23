import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Input, Select } from 'antd'

import { FormSection, PopupModal } from '@/shared/ui'

import type { CreateDesignTaskInput, DesignTask } from '../api/designApi'

const { TextArea } = Input

export type IdeaTaskFormValues = {
  title: string
  productType: string
  referenceLink?: string
  image?: string
  description?: string
}

const DEFAULT_PRODUCT_TYPES = [
  'T-Shirt',
  'Hoodie',
  'Sweatshirt',
  'Tank Top',
  'Long Sleeve',
  'Mug',
  'Hat / Cap',
  'Poster / Canvas',
  'Other',
]

export function CreateIdeaTaskModal({
  open,
  initialData,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialData?: DesignTask | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: CreateDesignTaskInput) => void
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm<IdeaTaskFormValues>()
  const isEditing = Boolean(initialData)

  useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue({
        title: initialData.title || initialData.brief || '',
        productType: initialData.productType || initialData.listing?.productTypeName || '',
        referenceLink: initialData.referenceLink || '',
        image:
          initialData.image || initialData.imageUrl || initialData.listing?.productImageUrl || '',
        description: initialData.description || initialData.brief || '',
      })
    } else if (open) {
      form.resetFields()
    }
  }, [open, initialData, form])

  const handleFinish = (values: IdeaTaskFormValues) => {
    const payload: CreateDesignTaskInput = {
      taskType: 'IDEA',
      title: values.title.trim(),
      brief: values.title.trim(),
      productType: values.productType,
      referenceLink: values.referenceLink?.trim() || undefined,
      image: values.image?.trim() || undefined,
      description: values.description?.trim() || undefined,
      note: values.description?.trim() || undefined,
    }
    onSubmit(payload)
  }

  return (
    <PopupModal
      open={open}
      title={isEditing ? t('portal.design.updateIdeaTask') : t('portal.design.createIdeaTask')}
      okText={
        isEditing
          ? t('common.save', { defaultValue: 'Save' })
          : t('common.create', { defaultValue: 'Create' })
      }
      confirmLoading={saving}
      width="min(540px, calc(100vw - 32px))"
      afterClose={() => form.resetFields()}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <FormSection title={t('portal.design.taskSetup', { defaultValue: 'Task Information' })}>
          <Form.Item
            name="title"
            label={t('common.title', { defaultValue: 'Title' })}
            rules={[
              {
                required: true,
                message: t('common.required', { defaultValue: 'Title is required' }),
              },
            ]}
          >
            <Input
              placeholder={t('portal.design.enterTitle', { defaultValue: 'Enter idea title' })}
            />
          </Form.Item>

          <Form.Item
            name="productType"
            label={t('portal.design.productType', { defaultValue: 'Product Type' })}
            rules={[
              {
                required: true,
                message: t('common.required', { defaultValue: 'Product type is required' }),
              },
            ]}
          >
            <Select
              showSearch
              placeholder={t('portal.design.selectProductType', {
                defaultValue: 'Select product type',
              })}
              options={DEFAULT_PRODUCT_TYPES.map((pt) => ({ label: pt, value: pt }))}
            />
          </Form.Item>

          <Form.Item
            name="referenceLink"
            label={t('portal.design.referenceLink', { defaultValue: 'Reference Link' })}
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item name="image" label={t('portal.design.image', { defaultValue: 'Image URL' })}>
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('portal.design.description', { defaultValue: 'Description / Brief' })}
          >
            <TextArea
              rows={4}
              placeholder={t('portal.design.enterDescription', {
                defaultValue: 'Provide requirements, ideas or references...',
              })}
            />
          </Form.Item>
        </FormSection>
      </Form>
    </PopupModal>
  )
}
