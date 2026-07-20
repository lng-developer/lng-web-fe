import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import { Dialog, DialogContent, IconButton, Tooltip } from '@mui/material'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

export default function ImagePreview({
  alt = '',
  children,
  className = '',
  downloadName,
  onDownload,
  src,
}) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)

  if (!src) return children || null

  function close() {
    setOpen(false)
  }

  function download() {
    onDownload?.(src, downloadName || alt || 'image')
  }

  function openPreview() {
    setZoom(1)
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        aria-label={alt || 'Open image preview'}
        onClick={openPreview}
        className={`block cursor-zoom-in overflow-hidden border-0 bg-transparent p-0 ${className}`}
      >
        {children || <img src={src} alt={alt} className="h-full w-full object-contain" />}
      </button>
      <Dialog open={open} onClose={close} fullScreen PaperProps={{ className: 'bg-black/70' }}>
        <div className="relative flex h-full min-h-0 flex-col">
          <div className="flex justify-end p-3">
            <IconButton
              aria-label="Close image preview"
              onClick={close}
              className="text-white hover:bg-white/10"
            >
              <CloseIcon />
            </IconButton>
          </div>
          <DialogContent className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full object-contain"
              style={{ transform: `scale(${zoom})`, transition: 'transform 150ms ease' }}
            />
          </DialogContent>
          <div className="flex items-center justify-center gap-1 pb-5">
            <Tooltip title="Zoom out">
              <span>
                <IconButton
                  aria-label="Zoom out"
                  disabled={zoom <= MIN_ZOOM}
                  onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))}
                  className="text-white hover:bg-white/10 disabled:text-white/40"
                >
                  <ZoomOutIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Reset zoom">
              <IconButton
                aria-label="Reset zoom"
                onClick={() => setZoom(1)}
                className="text-white hover:bg-white/10"
              >
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom in">
              <span>
                <IconButton
                  aria-label="Zoom in"
                  disabled={zoom >= MAX_ZOOM}
                  onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))}
                  className="text-white hover:bg-white/10 disabled:text-white/40"
                >
                  <ZoomInIcon />
                </IconButton>
              </span>
            </Tooltip>
            {onDownload ? (
              <Tooltip title="Download image">
                <IconButton
                  aria-label="Download image"
                  onClick={download}
                  className="text-white hover:bg-white/10"
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </Dialog>
    </>
  )
}
