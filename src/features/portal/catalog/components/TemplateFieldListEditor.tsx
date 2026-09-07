import { useTranslation } from 'react-i18next'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Checkbox, Form, Input, Select, Space } from 'antd'

const FIELD_TYPES = ['TEXT', 'IMAGE', 'OPTION', 'FILE', 'NUMBER', 'DATE', 'UNKNOWN']
const FIELD_SOURCES = ['CUSTOMER_INPUT', 'AMAZON_CUSTOMIZATION', 'MANUAL', 'SYSTEM']

export function TemplateFieldListEditor() {
  const { t } = useTranslation()

  return (
    <Form.List name="requiredFields">
      {(fields, { add, remove }) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          {fields.map(({ key, name }) => (
            <Space key={key} align="start" wrap>
              <Form.Item name={[name, 'key']} rules={[{ required: true }]}>
                <Input placeholder={t('portal.catalog.master.templateEditor.fieldKey')} />
              </Form.Item>
              <Form.Item name={[name, 'label']}>
                <Input placeholder={t('portal.catalog.master.templateEditor.userLabel')} />
              </Form.Item>
              <Form.Item name={[name, 'type']} rules={[{ required: true }]}>
                <Select
                  style={{ width: 130 }}
                  placeholder={t('portal.catalog.master.templateEditor.type')}
                  options={FIELD_TYPES.map((value) => ({
                    value,
                    label: t(`portal.catalog.master.templateEditor.fieldTypes.${value}`),
                  }))}
                />
              </Form.Item>
              <Form.Item name={[name, 'source']}>
                <Select
                  style={{ width: 190 }}
                  placeholder={t('portal.catalog.master.templateEditor.source')}
                  options={FIELD_SOURCES.map((value) => ({
                    value,
                    label: t(`portal.catalog.master.templateEditor.fieldSources.${value}`),
                  }))}
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
            onClick={() =>
              add({
                type: 'TEXT',
                source: 'CUSTOMER_INPUT',
                required: true,
                validation: {},
              })
            }
          >
            {t('portal.catalog.master.templateEditor.addField')}
          </Button>
        </Space>
      )}
    </Form.List>
  )
}
