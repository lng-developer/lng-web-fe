import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Button, Form, Input, Modal } from 'antd'
import { FeedbackAlert } from '@/shared/ui'
import { updateLaunch } from '../api/listingLaunchApi'
import type { Launch } from '../api/listingLaunchTypes'

export default function DraftMetadataForm({
  launch,
  canWrite,
  onSaved,
  onDirty,
}: {
  launch: Launch
  canWrite: boolean
  onSaved: () => void
  onDirty: (value: boolean) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<Launch | null>(null)
  const [form] = Form.useForm<{ brief: string; workingTitle: string }>()
  const close = () => {
    setEditing(null)
    onDirty(false)
  }
  const mutation = useMutation({
    mutationFn: async (values: { brief: string; workingTitle: string }) => {
      const patch = {
        ...(values.brief !== editing?.brief ? { brief: values.brief } : {}),
        ...(values.workingTitle !== (editing?.workingTitle || '')
          ? { workingTitle: values.workingTitle }
          : {}),
      }
      if (Object.keys(patch).length) await updateLaunch(launch.id, patch)
    },
    onSuccess: () => {
      close()
      onSaved()
    },
  })
  return (
    <>
      <Button
        disabled={!canWrite}
        onClick={() => {
          mutation.reset()
          setEditing(launch)
          onDirty(true)
          form.setFieldsValue({ brief: launch.brief, workingTitle: launch.workingTitle || '' })
        }}
      >
        {t('listingLaunch.editDraft')}
      </Button>
      <Modal
        open={Boolean(editing)}
        title={t('listingLaunch.editDraft')}
        onCancel={() => {
          if (!mutation.isPending) close()
        }}
        onOk={() => form.submit()}
        okText={t('listingLaunch.saveDraft')}
        cancelText={t('listingLaunch.cancel')}
        confirmLoading={mutation.isPending}
        okButtonProps={{ disabled: !canWrite }}
      >
        <Form
          form={form}
          layout="vertical"
          disabled={!canWrite || mutation.isPending}
          onFinish={(values) => mutation.mutate(values)}
        >
          {mutation.error ? (
            <FeedbackAlert
              type="error"
              title={t('listingLaunch.error')}
              description={mutation.error.message}
            />
          ) : null}
          <Form.Item
            name="workingTitle"
            label={t('listingLaunch.workingTitle')}
            rules={[{ max: 500 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="brief"
            label={t('listingLaunch.brief')}
            rules={[{ required: true, whitespace: true, max: 5000 }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
