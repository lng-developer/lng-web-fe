import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UploadFile } from 'antd'
import { Modal } from 'antd'

import { FileUpload } from '@/shared/ui'

export function MediaUploadModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (file: File) => Promise<void>
}) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<UploadFile[]>([])
  const close = () => {
    if (submitting) return
    setFiles([])
    onClose()
  }
  return (
    <Modal
      centered
      open={open}
      title={t('media.upload.title')}
      okText={t('media.upload.submit')}
      cancelText={t('media.upload.cancel')}
      okButtonProps={{ disabled: !files[0]?.originFileObj, loading: submitting }}
      onCancel={close}
      onOk={() => files[0]?.originFileObj && void onSubmit(files[0].originFileObj).then(close)}
      destroyOnHidden
    >
      <FileUpload
        title={t('media.upload.drop')}
        description={t('media.upload.hint')}
        fileList={files}
        maxCount={1}
        onChange={({ fileList }) => setFiles(fileList.slice(-1))}
      />
    </Modal>
  )
}
