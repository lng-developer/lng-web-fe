import CloseIcon from '@mui/icons-material/Close'
import { Divider, Drawer, IconButton, Typography } from '@mui/material'

import SubmissionScoreEditor from '@/features/design-tasks/components/SubmissionScoreEditor'
import dayjs from '@/lib/dayjs'

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY HH:mm') : '-'
}

function formatSize(value) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '-'
  const bytes = Number(value)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DetailField({ label, value }) {
  return (
    <div className="min-w-0">
      <Typography variant="caption" className="text-ink-muted">
        {label}
      </Typography>
      <Typography variant="body2" className="break-words font-medium text-ink-strong">
        {value ?? '-'}
      </Typography>
    </div>
  )
}

export default function QualityScoreDetailDrawer({
  row,
  open,
  canReview,
  isSubmitting,
  onClose,
  onOverride,
  onVoid,
}) {
  if (!row) return null

  const submission = {
    ...row.submission,
    status: row.submission?.status || row.task?.status,
    score: { id: row.id, ...row.score },
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { className: 'w-full max-w-xl' } }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <Typography variant="h6" className="font-bold text-ink-strong">
              Score details
            </Typography>
            <Typography variant="body2" className="truncate text-ink-muted">
              {row.file?.filename || 'Unknown file'}
            </Typography>
          </div>
          <IconButton aria-label="Close score details" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Submission file" value={row.file?.filename} />
            <DetailField label="MIME type" value={row.file?.mimeType} />
            <DetailField label="File size" value={formatSize(row.file?.size)} />
            <DetailField label="Listing" value={row.listingLabel} />
            <DetailField label="Designer" value={row.designerLabel} />
            <DetailField label="Version" value={row.submission?.version} />
            <DetailField label="Approved" value={formatDate(row.submission?.approvedAt)} />
            <DetailField label="Scored" value={formatDate(row.score?.scoredAt)} />
          </section>

          <Divider />

          <section className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Base points" value={row.score?.basePoints} />
            <DetailField label="Final points" value={row.score?.finalPoints} />
            <DetailField label="Score level" value={row.score?.scoreLevel} />
            <DetailField label="Audit status" value={row.score?.status} />
            <DetailField
              label="Override reason"
              value={row.score?.override?.reason || row.override?.reason}
            />
            <DetailField label="Void reason" value={row.score?.voidReason || row.voidReason} />
          </section>

          <Divider />

          <SubmissionScoreEditor
            key={`${row.id}:${row.score.finalPoints}:${row.score.scoreLevel}`}
            submission={submission}
            canReview={canReview}
            isSubmitting={isSubmitting}
            onOverride={onOverride}
            onVoid={(voidReason) => onVoid(row.task.id, row.submission.id, voidReason)}
          />
        </div>
      </div>
    </Drawer>
  )
}
