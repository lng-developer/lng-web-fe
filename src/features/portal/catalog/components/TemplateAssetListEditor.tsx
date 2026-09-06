import { useTranslation } from 'react-i18next'
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Form, Input, Select, Space, Upload } from 'antd'

import { useFeedbackToast } from '@/shared/ui'

import { uploadCatalogAsset } from '../api/catalogApi'

const ASSET_TYPES = [
  'PSD_TEMPLATE',
  'PREVIEW_IMAGE',
  'MASK_FILE',
  'SVG_TEMPLATE',
  'SAMPLE_OUTPUT',
  'OTHER',
]

export function TemplateAssetListEditor() {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const form = Form.useFormInstance()

  return (
    <Form.List name="designAssets">
      {(fields, { add, remove }) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          {fields.map(({ key, name }) => (
            <Space key={key} align="start" wrap>
              <Upload
                showUploadList={false}
                beforeUpload={async (file) => {
                  try {
                    const asset = await uploadCatalogAsset(file)
                    form.setFieldValue(['designAssets', name, 'mediaAssetId'], asset.id)
                    toast(
                      'success',
                      t('portal.catalog.master.templateEditor.uploaded', {
                        filename: asset.originalFilename,
                      }),
                    )
                  } catch (error) {
                    toast(
                      'error',
                      error instanceof Error
                        ? error.message
                        : t('portal.catalog.master.templateEditor.uploadFailed'),
                    )
                  }
                  return Upload.LIST_IGNORE
                }}
              >
                <Button icon={<UploadOutlined />}>
                  {t('portal.catalog.master.templateEditor.uploadFile')}
                </Button>
              </Upload>
              <Form.Item
                name={[name, 'mediaAssetId']}
                rules={[
                  {
                    required: true,
                    message: t('portal.catalog.master.templateEditor.uploadFileRequired'),
                  },
                ]}
              >
                <Input
                  readOnly
                  placeholder={t('portal.catalog.master.templateEditor.assetIdPlaceholder')}
                />
              </Form.Item>
              <Form.Item name={[name, 'type']} rules={[{ required: true }]}>
                <Select
                  style={{ width: 170 }}
                  placeholder={t('portal.catalog.master.templateEditor.assetType')}
                  options={ASSET_TYPES.map((value) => ({
                    value,
                    label: t(`portal.catalog.master.templateEditor.assetTypes.${value}`),
                  }))}
                />
              </Form.Item>
              <Form.Item name={[name, 'label']}>
                <Input placeholder={t('portal.catalog.master.templateEditor.label')} />
              </Form.Item>
              <Form.Item name={[name, 'version']}>
                <Input placeholder={t('portal.catalog.master.templateEditor.version')} />
              </Form.Item>
              <Form.Item name={[name, 'status']}>
                <Select
                  style={{ width: 110 }}
                  options={['ACTIVE', 'INACTIVE'].map((value) => ({
                    value,
                    label: t(`portal.catalog.master.statuses.${value}`),
                  }))}
                />
              </Form.Item>
              <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
            </Space>
          ))}
          <Button
            block
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => add({ type: 'PSD_TEMPLATE', version: 'v1', status: 'ACTIVE' })}
          >
            {t('portal.catalog.master.templateEditor.addDesignAsset')}
          </Button>
        </Space>
      )}
    </Form.List>
  )
}
