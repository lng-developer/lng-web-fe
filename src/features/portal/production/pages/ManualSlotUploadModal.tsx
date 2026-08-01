import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { Button, Collapse, Form, Input, Modal, Radio, Typography, Upload } from 'antd'

import type { ManualScaledOutput } from '../api/productionApi'
import styles from './ManualSlotUploadModal.module.scss'

const SLOT_PRESETS = [
  ['FRONT', 'front'],
  ['BACK', 'back'],
  ['LEFT_CHEST', 'leftChest'],
  ['LEFT_SLEEVE', 'leftSleeve'],
  ['RIGHT_SLEEVE', 'rightSleeve'],
] as const

type Values = {
  position: (typeof SLOT_PRESETS)[number][0] | 'CUSTOM'
  customLabel?: string
}

function normalizeSlotName(value: string) {
  return value
    .replace(/[đĐ]/g, (letter) => (letter === 'đ' ? 'd' : 'D'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

export function ManualSlotUploadModal({
  open,
  saving = false,
  existingSlotKeys = [],
  onClose,
  onSubmit,
}: {
  readonly open: boolean
  readonly saving?: boolean
  readonly existingSlotKeys?: readonly string[]
  readonly onClose: () => void
  readonly onSubmit: (input: ManualScaledOutput) => void
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm<Values>()
  const [files, setFiles] = useState<UploadFile[]>([])
  const position = Form.useWatch('position', form)
  const customLabel = Form.useWatch('customLabel', form)
  const existing = useMemo(() => new Set(existingSlotKeys), [existingSlotKeys])
  const presets = SLOT_PRESETS.filter(([key]) => !existing.has(key))
  const customKey = normalizeSlotName(customLabel?.trim() ?? '')

  const reset = () => {
    form.resetFields()
    setFiles([])
  }

  return (
    <Modal
      open={open}
      width={680}
      title={t('portal.production.manualSlot.title')}
      footer={null}
      destroyOnHidden={false}
      afterClose={reset}
      onCancel={onClose}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          const file = (files[0]?.originFileObj ?? files[0]) as File | undefined
          if (!file) return
          const preset = SLOT_PRESETS.find(([key]) => key === values.position)
          const slotLabel =
            values.position === 'CUSTOM'
              ? values.customLabel!.trim()
              : t(`portal.production.manualSlot.positions.${preset![1]}`)
          onSubmit({
            file,
            slotKey:
              values.position === 'CUSTOM'
                ? `CUSTOM_${normalizeSlotName(slotLabel)}`
                : values.position,
            slotLabel,
          })
        }}
      >
        <Form.Item
          name="position"
          label={t('portal.production.manualSlot.choosePosition')}
          rules={[{ required: true }]}
        >
          <Radio.Group className={styles.grid}>
            {presets.map(([key, name]) => {
              const label = t(`portal.production.manualSlot.positions.${name}`)
              return (
                <Radio.Button key={key} value={key} aria-label={label} className={styles.card}>
                  <span className={`${styles.product} ${styles[name]}`} aria-hidden="true">
                    <span />
                  </span>
                  <Typography.Text strong>{label}</Typography.Text>
                </Radio.Button>
              )
            })}
            <Radio.Button
              value="CUSTOM"
              aria-label={t('portal.production.manualSlot.positions.custom')}
              className={styles.card}
            >
              <span className={`${styles.product} ${styles.custom}`} aria-hidden="true">
                <span />
              </span>
              <Typography.Text strong>
                {t('portal.production.manualSlot.positions.custom')}
              </Typography.Text>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {position === 'CUSTOM' ? (
          <Form.Item
            name="customLabel"
            label={t('portal.production.manualSlot.customLabel')}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input
              aria-label={t('portal.production.manualSlot.customLabel')}
              maxLength={120}
              placeholder={t('portal.production.manualSlot.customLabelPlaceholder')}
            />
          </Form.Item>
        ) : null}

        <Form.Item label={t('portal.production.manualSlot.file')} required>
          <Upload.Dragger
            fileList={files}
            maxCount={1}
            beforeUpload={(file) => {
              setFiles([file])
              return false
            }}
            onRemove={() => setFiles([])}
          >
            <InboxOutlined className={styles.uploadIcon} />
            <Typography.Text strong>{t('portal.production.manualSlot.dropFile')}</Typography.Text>
            <Typography.Text type="secondary">
              {t('portal.production.manualSlot.fileHint')}
            </Typography.Text>
          </Upload.Dragger>
        </Form.Item>

        {position ? (
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'technical',
                label: t('portal.production.manualSlot.technicalDetails'),
                children: (
                  <Typography.Text code>
                    {position === 'CUSTOM' ? `CUSTOM_${customKey}` : position}
                  </Typography.Text>
                ),
              },
            ]}
          />
        ) : null}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('portal.production.manualSlot.cancel')}</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            disabled={!position || !files.length || (position === 'CUSTOM' && !customKey)}
          >
            {t('portal.production.manualSlot.submit')}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
