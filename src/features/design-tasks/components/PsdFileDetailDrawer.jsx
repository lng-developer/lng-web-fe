import CloseIcon from '@mui/icons-material/Close'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { Button, Drawer, IconButton, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import dayjs from '@/lib/dayjs'
import { apiClient } from '@/services/axiosInstance'

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

export default function PsdFileDetailDrawer({ row, open, onClose }) {
  const { enqueueSnackbar } = useSnackbar()

  if (!row) return null

  async function handleDownload() {
    if (!row.downloadUrl) return

    try {
      const blob = await apiClient.get(row.downloadUrl, { responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = row.filename || 'psd-file'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch {
      enqueueSnackbar('Unable to download PSD file', { variant: 'error' })
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { className: 'w-full max-w-lg' } }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <Typography variant="h6" className="font-bold text-ink-strong">
              PSD file details
            </Typography>
            <Typography variant="body2" className="truncate text-ink-muted">
              {row.filename}
            </Typography>
          </div>
          <IconButton aria-label="Close PSD file details" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <DetailField label="File name" value={row.filename} />
            <DetailField label="MIME type" value={row.asset?.mimeType} />
            <DetailField label="File size" value={formatSize(row.size)} />
            <DetailField label="Role" value={row.role} />
            <DetailField label="Listing" value={row.listingLabel} />
            <DetailField label="Task status" value={row.taskStatus} />
            <DetailField label="Designer" value={row.designerLabel} />
            <DetailField label="Version" value={row.submissionVersion} />
            <DetailField label="Uploaded" value={formatDate(row.createdAt)} />
            <DetailField label="Submitted" value={formatDate(row.submittedAt)} />
          </section>

          <Button
            variant="contained"
            startIcon={<DownloadOutlinedIcon />}
            disabled={!row.downloadUrl}
            onClick={handleDownload}
          >
            Download PSD
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
