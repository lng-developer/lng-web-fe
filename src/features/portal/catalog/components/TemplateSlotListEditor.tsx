import { useTranslation } from 'react-i18next'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Checkbox, Form, Input, Select, Space } from 'antd'

const SLOT_TYPES = ['IMAGE', 'TEXT', 'VECTOR', 'PDF', 'MIXED']
const OUTPUT_ROLES = ['FRONT', 'BACK', 'LEFT_SLEEVE', 'RIGHT_SLEEVE', 'MOCKUP', 'PREVIEW', 'OTHER']

export function TemplateSlotListEditor({ fieldKeys }: { readonly fieldKeys: readonly string[] }) {
  const { t } = useTranslation()

  return (
    <Form.List name="artworkSlots">
      {(fields, { add, remove }) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          {fields.map(({ key, name }) => (
            <Space key={key} align="start" wrap>
              <Form.Item name={[name, 'key']} rules={[{ required: true }]}>
                <Input placeholder={t('portal.catalog.master.templateEditor.slotKey')} />
              </Form.Item>
              <Form.Item name={[name, 'label']}>
                <Input placeholder={t('portal.catalog.master.templateEditor.userLabel')} />
              </Form.Item>
              <Form.Item name={[name, 'type']}>
                <Select
                  style={{ width: 130 }}
                  placeholder={t('portal.catalog.master.templateEditor.type')}
                  options={SLOT_TYPES.map((value) => ({
                    value,
                    label: t(`portal.catalog.master.templateEditor.slotTypes.${value}`),
                  }))}
                />
              </Form.Item>
              <Form.Item name={[name, 'outputRole']}>
                <Select
                  style={{ width: 150 }}
                  placeholder={t('portal.catalog.master.templateEditor.output')}
                  options={OUTPUT_ROLES.map((value) => ({
                    value,
                    label: t(`portal.catalog.master.templateEditor.outputRoles.${value}`),
                  }))}
                />
              </Form.Item>
              <Form.Item name={[name, 'acceptedFieldKeys']}>
                <Select
                  mode="multiple"
                  style={{ minWidth: 210 }}
                  placeholder={t('portal.catalog.master.templateEditor.acceptedFields')}
                  options={fieldKeys.map((value) => ({ value, label: value }))}
                />
              </Form.Item>
              <Form.Item name={[name, 'required']} valuePropName="checked">
                <Checkbox>{t('portal.catalog.master.templateEditor.required')}</Checkbox>
              </Form.Item>
              <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
            </Space>
          ))}
          <Button
            block
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => add({ type: 'MIXED', required: true, acceptedFieldKeys: [] })}
          >
            {t('portal.catalog.master.templateEditor.addArtworkSlot')}
          </Button>
        </Space>
      )}
    </Form.List>
  )
}
