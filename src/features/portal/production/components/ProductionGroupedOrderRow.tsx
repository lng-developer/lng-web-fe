import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Space, Tag, Typography } from 'antd'

import { StatusTag } from '@/shared/ui'
import type { FileCheck, FileDecision, ProductionTask } from '../api/productionApi'
import { ProductionWorkbenchExpandedRow } from '../pages/ProductionWorkbenchExpandedRow'
import { type ProductionTab, tone, type ViewMode } from './ProductionWorkbenchColumns'
import styles from '../pages/ProductionWorkbenchPage.module.scss'

export interface ProductionGroupedOrderRowProps {
  rowTask: ProductionTask
  tab: ProductionTab
  viewMode: ViewMode
  currentUserId?: string
  canScaleTask: (task: ProductionTask) => boolean
  canQcTask: (task: ProductionTask) => boolean
  decisions: Record<string, FileDecision>
  savingNoteTaskId?: string
  submittingQc: boolean
  submittingScaleTaskId?: string
  claimingTaskId?: string
  uploadingFileCheckIds: ReadonlySet<string>
  onSaveNote: (taskId: string, note: string) => void
  onSubmitQc: (task: ProductionTask, fileDecisions: FileDecision[]) => void
  onSubmitScaleForQc: (taskId: string) => void
  onUploadScaledOutput: (taskId: string, fileCheckId: string, file: File) => Promise<void>
  onInspectSlot: (task: ProductionTask, check: FileCheck, readonly?: boolean) => void
  onPassSlot: (fileCheckId: string) => void
  onManualSlotUploaded: () => Promise<void> | void
  onOpenManualSlotUpload: (taskId: string, existingSlotKeys: string[]) => void
  onDeleteSlot: (taskId: string, fileCheckId: string) => Promise<void>
  onClaimTask: (taskId: string) => void
}

export const ProductionGroupedOrderRow: FC<ProductionGroupedOrderRowProps> = ({
  rowTask,
  tab,
  viewMode,
  currentUserId,
  canScaleTask,
  canQcTask,
  decisions,
  savingNoteTaskId,
  submittingQc,
  submittingScaleTaskId,
  claimingTaskId,
  uploadingFileCheckIds,
  onSaveNote,
  onSubmitQc,
  onSubmitScaleForQc,
  onUploadScaledOutput,
  onInspectSlot,
  onPassSlot,
  onManualSlotUploaded,
  onOpenManualSlotUpload,
  onDeleteSlot,
  onClaimTask,
}) => {
  const { t } = useTranslation()

  const renderSingleTaskRow = (task: ProductionTask) => (
    <ProductionWorkbenchExpandedRow
      task={task}
      tab={tab}
      viewMode={viewMode}
      currentUserId={currentUserId}
      canScale={canScaleTask(task)}
      canQc={canQcTask(task)}
      decisions={decisions}
      savingNoteTaskId={savingNoteTaskId}
      submittingQc={submittingQc}
      submittingScale={submittingScaleTaskId === task.id}
      claimingTaskId={claimingTaskId}
      uploadingFileCheckIds={uploadingFileCheckIds}
      onSaveNote={onSaveNote}
      onSubmitQc={onSubmitQc}
      onSubmitScaleForQc={onSubmitScaleForQc}
      onUploadScaledOutput={onUploadScaledOutput}
      onInspectSlot={onInspectSlot}
      onPassSlot={onPassSlot}
      onManualSlotUploaded={onManualSlotUploaded}
      onOpenManualSlotUpload={onOpenManualSlotUpload}
      onDeleteSlot={onDeleteSlot}
      onClaimTask={onClaimTask}
    />
  )

  const orderTasks: ProductionTask[] = (rowTask as unknown as { orderTasks?: ProductionTask[] })
    .orderTasks || [rowTask]

  if (orderTasks.length <= 1) {
    return renderSingleTaskRow(orderTasks[0] || rowTask)
  }

  return (
    <div className={styles.groupedOrderItems}>
      {orderTasks.map((task, index) => {
        const rawContext = task.scaleContext as
          | (Record<string, unknown> & {
              variantSnapshot?: { size?: string | null; color?: string | null }
              vendorProduct?: { title?: string | null }
              size?: string | null
              color?: string | null
            })
          | undefined
        const variantSummary = [
          task.vendorCostCenter?.standardSize ||
            rawContext?.variantSnapshot?.size ||
            rawContext?.size,
          task.vendorCostCenter?.standardColor ||
            rawContext?.variantSnapshot?.color ||
            rawContext?.color,
        ]
          .filter(Boolean)
          .join(' / ')
        const productTitle =
          task.orderItem?.title ||
          task.vendorProduct?.name ||
          rawContext?.vendorProduct?.title ||
          task.orderItem?.sku ||
          `Item #${index + 1}`

        return (
          <div key={task.id} className={styles.groupedTaskItem}>
            <div className={styles.groupedTaskItemHeader}>
              <Space size={8} align="center">
                <Tag color="cyan" style={{ marginInlineEnd: 0 }}>
                  Item #{index + 1}
                </Tag>
                {variantSummary ? (
                  <Tag color="default" style={{ marginInlineEnd: 0, fontWeight: 500 }}>
                    {variantSummary}
                  </Tag>
                ) : null}
                <Typography.Text strong style={{ fontSize: 13 }}>
                  {productTitle}
                </Typography.Text>
                <StatusTag
                  status={tone(viewMode === 'qc' || tab === 'qc' ? task.qcStatus : task.status)}
                >
                  {t(
                    `portal.production.statuses.${
                      viewMode === 'qc' || tab === 'qc' ? task.qcStatus : task.status
                    }`,
                  )}
                </StatusTag>
              </Space>
            </div>
            {renderSingleTaskRow(task)}
          </div>
        )
      })}
    </div>
  )
}
