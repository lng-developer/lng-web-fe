import type { FC, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { DetailModal, FeedbackAlert } from '@/shared/ui'
import type { FileCheck, ManualScaledOutput, ProductionTask } from '../api/productionApi'
import { ArtworkInspector } from '../pages/ArtworkInspector'
import { ManualSlotUploadModal } from '../pages/ManualSlotUploadModal'

export interface InspectState {
  task?: ProductionTask
  check: FileCheck
  originalInputUrl?: string | null
  originalInputLabel?: string | null
  listingReferenceUrl?: string | null
  readonly?: boolean
}

export interface ManualSlotUploadState {
  taskId: string
  existingSlotKeys: string[]
}

export interface ProductionWorkbenchActionModalsProps {
  // Target Detail Modal
  targetId?: string
  isTargetLoading: boolean
  isTargetError: boolean
  targetData?: ProductionTask
  onCloseTargetModal: () => void
  renderExpandedRow: (task: ProductionTask) => ReactNode

  // Artwork Inspector
  inspect?: InspectState
  onCloseInspect: () => void
  onPassInspect: (note?: string) => void
  onRejectInspect: (note: string) => void

  // Manual Slot Upload
  manualSlotUploadTask: ManualSlotUploadState | null
  isManualSlotSaving: boolean
  onCloseManualSlotUpload: () => void
  onSubmitManualSlotUpload: (input: ManualScaledOutput) => void
}

export const ProductionWorkbenchActionModals: FC<ProductionWorkbenchActionModalsProps> = ({
  targetId,
  isTargetLoading,
  isTargetError,
  targetData,
  onCloseTargetModal,
  renderExpandedRow,
  inspect,
  onCloseInspect,
  onPassInspect,
  onRejectInspect,
  manualSlotUploadTask,
  isManualSlotSaving,
  onCloseManualSlotUpload,
  onSubmitManualSlotUpload,
}) => {
  const { t } = useTranslation()

  return (
    <>
      <DetailModal
        open={Boolean(targetId)}
        loading={isTargetLoading}
        onClose={onCloseTargetModal}
        footer={null}
        width="min(1440px, 94vw)"
        title={t('notifications.openResource')}
      >
        {isTargetError ? (
          <FeedbackAlert type="error" title={t('notifications.resourceUnavailable')} />
        ) : null}
        {targetData ? renderExpandedRow(targetData) : null}
      </DetailModal>

      {inspect ? (
        <ArtworkInspector
          task={inspect.task}
          check={inspect.check}
          originalInputUrl={inspect.originalInputUrl}
          originalInputLabel={inspect.originalInputLabel}
          listingReferenceUrl={inspect.listingReferenceUrl}
          readonly={inspect.readonly}
          onClose={onCloseInspect}
          onPass={onPassInspect}
          onReject={onRejectInspect}
        />
      ) : null}

      {manualSlotUploadTask ? (
        <ManualSlotUploadModal
          open
          saving={isManualSlotSaving}
          existingSlotKeys={manualSlotUploadTask.existingSlotKeys}
          onClose={onCloseManualSlotUpload}
          onSubmit={onSubmitManualSlotUpload}
        />
      ) : null}
    </>
  )
}
