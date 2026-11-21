import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import type { UploadFile } from 'antd'
import { Input, Modal, Progress, Select, Typography } from 'antd'

import { ConfirmDangerModal, FileUpload } from '@/shared/ui'
import type { DesignAssignee } from '../api/designApi'

const { Text } = Typography

export interface PsdTasksActionModalsProps {
  // Assign modal
  assignModalOpen: boolean
  onCloseAssignModal: () => void
  onConfirmAssign: () => void
  selectedDesignerId?: string
  onSelectDesignerId: (id?: string) => void
  assignees: DesignAssignee[]
  isAssigning: boolean
  isReassign: boolean
  canConfirmAssignment: boolean

  // Reject modal
  rejectModalOpen: boolean
  onCloseRejectModal: () => void
  onConfirmReject: () => void
  rejectReason: string
  onRejectReasonChange: (reason: string) => void
  isRejecting: boolean

  // Reopen modal
  reopenModalOpen: boolean
  onCloseReopenModal: () => void
  onConfirmReopen: () => void
  reopenReason: string
  onReopenReasonChange: (reason: string) => void
  isReopening: boolean

  // Upload modal
  uploadModalOpen: boolean
  onCloseUploadModal: () => void
  onConfirmUpload: () => void
  uploadFiles: UploadFile[]
  onUploadFilesChange: (files: UploadFile[]) => void
  uploadNote: string
  onUploadNoteChange: (note: string) => void
  uploadProgress: number
  isSubmittingUpload: boolean

  // Request modal
  requestModalOpen: boolean
  onCloseRequestModal: () => void
  onConfirmRequest: () => void
  requestNote: string
  onRequestNoteChange: (note: string) => void
  isRequesting: boolean

  // Delete modal
  deleteModalOpen: boolean
  onCloseDeleteModal: () => void
  onConfirmDelete: () => void
  isDeleting: boolean
}

export const PsdTasksActionModals: FC<PsdTasksActionModalsProps> = ({
  assignModalOpen,
  onCloseAssignModal,
  onConfirmAssign,
  selectedDesignerId,
  onSelectDesignerId,
  assignees,
  isAssigning,
  isReassign,
  canConfirmAssignment,
  rejectModalOpen,
  onCloseRejectModal,
  onConfirmReject,
  rejectReason,
  onRejectReasonChange,
  isRejecting,
  reopenModalOpen,
  onCloseReopenModal,
  onConfirmReopen,
  reopenReason,
  onReopenReasonChange,
  isReopening,
  uploadModalOpen,
  onCloseUploadModal,
  onConfirmUpload,
  uploadFiles,
  onUploadFilesChange,
  uploadNote,
  onUploadNoteChange,
  uploadProgress,
  isSubmittingUpload,
  requestModalOpen,
  onCloseRequestModal,
  onConfirmRequest,
  requestNote,
  onRequestNoteChange,
  isRequesting,
  deleteModalOpen,
  onCloseDeleteModal,
  onConfirmDelete,
  isDeleting,
}) => {
  const { t } = useTranslation()
  const selectedUploadFile = uploadFiles[0]

  return (
    <>
      {/* Assign Designer Modal */}
      <Modal
        open={assignModalOpen}
        title={t(isReassign ? 'portal.design.reassignDesigner' : 'portal.design.assignDesigner')}
        okText={t('portal.design.confirmAssignment')}
        okButtonProps={{ disabled: !canConfirmAssignment }}
        confirmLoading={isAssigning}
        onCancel={onCloseAssignModal}
        onOk={onConfirmAssign}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('portal.design.selectDesigner')}
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder={t('portal.design.selectDesigner')}
            value={selectedDesignerId}
            onChange={(val) => onSelectDesignerId(val)}
            options={assignees.map((a) => ({
              label: a.fullName || a.name || a.id,
              value: a.id,
            }))}
          />
        </div>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        open={rejectModalOpen}
        title="Reject Task"
        okText="Reject"
        okButtonProps={{ danger: true }}
        confirmLoading={isRejecting}
        onCancel={onCloseRejectModal}
        onOk={onConfirmReject}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Reject Reason
          </Text>
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Enter reason for rejection..."
          />
        </div>
      </Modal>

      {/* Reopen Modal */}
      <Modal
        open={reopenModalOpen}
        title="Reopen PSD Task"
        okText="Reopen"
        okButtonProps={{ danger: true }}
        confirmLoading={isReopening}
        onCancel={onCloseReopenModal}
        onOk={onConfirmReopen}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Revision reason
          </Text>
          <Input.TextArea
            rows={4}
            value={reopenReason}
            onChange={(e) => onReopenReasonChange(e.target.value)}
            placeholder="Explain what needs to change..."
          />
        </div>
      </Modal>

      {/* Upload Finished PSD Modal */}
      <Modal
        open={uploadModalOpen}
        title="Upload Finished PSD"
        okText="Submit"
        confirmLoading={isSubmittingUpload}
        onCancel={onCloseUploadModal}
        onOk={onConfirmUpload}
      >
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <FileUpload
              title={
                selectedUploadFile
                  ? t('portal.design.replaceSelectedFile', { name: selectedUploadFile.name })
                  : t('portal.design.finishedPsdUpload')
              }
              description={
                selectedUploadFile
                  ? t('portal.design.replaceSelectedFileHint')
                  : t('portal.design.finishedPsdUploadHint')
              }
              accept=".psd,.zip,.rar,.png,.jpg,.jpeg"
              fileList={uploadFiles}
              onChange={({ fileList }) => onUploadFilesChange(fileList)}
              onRemove={() => {
                onUploadFilesChange([])
                return false
              }}
              showUploadList={{ showRemoveIcon: true }}
              maxCount={1}
            />
            {isSubmittingUpload ? (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">{t('portal.design.uploadingFile')}</Text>
                <Progress
                  percent={uploadProgress}
                  status={uploadProgress < 100 ? 'active' : 'success'}
                  style={{ marginTop: 6 }}
                />
              </div>
            ) : null}
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Note
            </Text>
            <Input.TextArea
              rows={3}
              value={uploadNote}
              onChange={(e) => onUploadNoteChange(e.target.value)}
              placeholder="Optional notes about the design..."
            />
          </div>
        </div>
      </Modal>

      {/* Request Upload Modal */}
      <Modal
        open={requestModalOpen}
        title="Request Upload PSD"
        okText="Request"
        confirmLoading={isRequesting}
        onCancel={onCloseRequestModal}
        onOk={onConfirmRequest}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Note (optional)
          </Text>
          <Input.TextArea
            rows={4}
            value={requestNote}
            onChange={(e) => onRequestNoteChange(e.target.value)}
            placeholder="Enter request note..."
          />
        </div>
      </Modal>

      {/* Delete Task Confirmation Modal */}
      <ConfirmDangerModal
        open={deleteModalOpen}
        title="Delete task"
        description="Delete this PSD task? Tasks with an approved PSD must be cancelled instead."
        confirmLabel="Delete"
        loading={isDeleting}
        onConfirm={onConfirmDelete}
        onCancel={onCloseDeleteModal}
      />
    </>
  )
}
