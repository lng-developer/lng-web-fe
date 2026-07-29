import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import { Alert, Button, CircularProgress, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import ImagePreview from '@/components/common/ImagePreview'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import {
  useDownloadScaleAssetMutation,
  useUploadScaleOutputMutation,
} from '@/features/scale/api/scale.mutations'
import { useScaleTasksQuery } from '@/features/scale/api/scale.queries'
import { SCALE_STATUS_TABS } from '@/features/scale/constants/scaleConstants'
import { getScaleSlotPreviewAssetId } from '@/features/scale/utils/scaleDisplay'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

function ScaleOutputPreview({ assetId, alt, downloadName, onDownload }) {
  const [preview, setPreview] = useState({ assetId: null, url: '' })

  useEffect(() => {
    let active = true
    let objectUrl = null

    if (!assetId) return undefined

    apiClient
      .get(ENDPOINTS.MEDIA.ASSET_DOWNLOAD(assetId), { responseType: 'blob' })
      .then((blob) => {
        if (!active || !blob?.type?.startsWith('image/')) return

        objectUrl = URL.createObjectURL(blob)
        setPreview({ assetId, url: objectUrl })
      })
      .catch(() => {})

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assetId])

  const previewUrl = preview.assetId === assetId ? preview.url : ''

  if (!previewUrl) {
    return <CloudUploadOutlinedIcon className="!text-[48px] text-ink-muted mb-2" />
  }

  return (
    <ImagePreview
      src={previewUrl}
      alt={alt}
      downloadName={downloadName}
      onDownload={() => onDownload?.(assetId, downloadName)}
      className="h-full w-full"
    >
      <img src={previewUrl} alt={alt} className="h-full w-full object-cover rounded-lg" />
    </ImagePreview>
  )
}

function DropzoneSlot({ mockup, task, onUploadOutput, onDownloadAsset, uploadingSlotId, t }) {
  const previewAssetId = getScaleSlotPreviewAssetId(mockup)
  const slotUploadId = mockup.fileCheckId || mockup.slotKey || mockup.id || 'unknown'
  const slotIsUploading = uploadingSlotId === slotUploadId

  const uploadTarget = useMemo(
    () => ({
      ...mockup,
      slotLabel: mockup.label,
      sourceType: mockup.sourceType || 'CUSTOMER_IMAGE',
    }),
    [mockup],
  )

  const [isDragActive, setIsDragActive] = useState(false)

  const handleDragEnter = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!slotIsUploading) setIsDragActive(true)
    },
    [slotIsUploading],
  )

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      if (slotIsUploading) return

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onUploadOutput(task, uploadTarget, e.dataTransfer.files[0])
      }
    },
    [onUploadOutput, task, uploadTarget, slotIsUploading],
  )

  const fileInputRef = useRef(null)

  return (
    <div className="flex flex-col gap-2 p-4 border border-border rounded-xl bg-surface">
      <Typography variant="subtitle2" className="font-bold text-ink-strong">
        {mockup.label}
      </Typography>

      <div
        role="button"
        tabIndex={0}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !slotIsUploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!slotIsUploading) fileInputRef.current?.click()
          }
        }}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors min-h-[200px]
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
          ${slotIsUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadOutput(task, uploadTarget, e.target.files[0])
              e.target.value = ''
            }
          }}
        />

        {previewAssetId ? (
          <div className="absolute inset-2">
            <ScaleOutputPreview
              assetId={previewAssetId}
              alt={mockup.label}
              downloadName={`${task.orderId}-${mockup.label}`}
              onDownload={onDownloadAsset}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <CloudUploadOutlinedIcon className="!text-[48px] text-ink-muted mb-2" />
            <Typography variant="body2" className="text-ink-strong font-semibold">
              {t('scale.workbench.dragDrop', { defaultValue: 'Drag & drop image here' })}
            </Typography>
            <Typography variant="caption" className="text-ink-muted mt-1">
              {t('scale.workbench.orClick', { defaultValue: 'or click to select file' })}
            </Typography>
          </div>
        )}

        {slotIsUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/50 rounded-xl backdrop-blur-sm">
            <CircularProgress size={32} />
          </div>
        )}
      </div>

      {previewAssetId && (
        <Typography variant="caption" className="text-success text-center mt-1">
          {t('scale.workbench.uploadSuccess', {
            defaultValue: 'Uploaded successfully. Drag new file to replace.',
          })}
        </Typography>
      )}
    </div>
  )
}

export default function ScaleWorkbenchPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const location = useLocation()

  const queryParams = new URLSearchParams(location.search)
  const urlTaskId = queryParams.get('taskId')

  // Fetch pending tasks
  const taskQuery = useMemo(
    () => ({
      statusTab: SCALE_STATUS_TABS.NEED_SCALE, // Designer queue
      page: 1,
      limit: 20,
    }),
    [],
  )

  const tasksQuery = useScaleTasksQuery(taskQuery, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const tasks = useMemo(() => tasksQuery.data?.items || [], [tasksQuery.data])

  const [activeTaskId, setActiveTaskId] = useState(urlTaskId || null)

  useEffect(() => {
    if (!activeTaskId && tasks.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTaskId(tasks[0].id)
    }
  }, [activeTaskId, tasks])

  const task = useMemo(
    () => tasks.find((t) => String(t.id) === String(activeTaskId)) || tasks[0],
    [activeTaskId, tasks],
  )

  const uploadOutputMutation = useUploadScaleOutputMutation()
  const downloadAssetMutation = useDownloadScaleAssetMutation()

  const [uploadingSlotId, setUploadingSlotId] = useState(null)

  const handleUploadOutput = useCallback(
    async (taskToUpload, slot, file) => {
      if (!taskToUpload || !slot || !file) return

      const slotUploadId = slot.fileCheckId || slot.slotKey || slot.id || 'unknown'
      setUploadingSlotId(slotUploadId)

      try {
        await uploadOutputMutation.mutateAsync({
          taskId: taskToUpload.id,
          fileCheckId: slot.fileCheckId,
          file,
          slotKey: slot.slotKey,
          slotLabel: slot.slotLabel,
          sourceType: slot.sourceType,
        })
        enqueueSnackbar(t('scale.messages.uploadSuccess', { defaultValue: 'Upload successful!' }), {
          variant: SNACKBAR_VARIANTS.SUCCESS,
        })
      } catch (error) {
        enqueueSnackbar(
          error.message || t('scale.manualUpload.uploadFailed', { defaultValue: 'Upload failed' }),
          {
            variant: SNACKBAR_VARIANTS.ERROR,
          },
        )
      } finally {
        setUploadingSlotId(null)
      }
    },
    [uploadOutputMutation, enqueueSnackbar, t],
  )

  const handleDownloadAsset = useCallback(
    async (assetId, fileName) => {
      try {
        const response = await downloadAssetMutation.mutateAsync(assetId)
        const url = URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch {
        enqueueSnackbar(
          t('scale.messages.downloadFailed', { defaultValue: 'Failed to download asset' }),
          {
            variant: SNACKBAR_VARIANTS.ERROR,
          },
        )
      }
    },
    [downloadAssetMutation, enqueueSnackbar, t],
  )

  const handleSkipNext = useCallback(() => {
    if (!task) return
    const currentIndex = tasks.findIndex((t) => t.id === task.id)
    if (currentIndex >= 0 && currentIndex < tasks.length - 1) {
      setActiveTaskId(tasks[currentIndex + 1].id)
    } else {
      tasksQuery.refetch()
    }
  }, [task, tasks, tasksQuery])

  if (tasksQuery.isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-page">
        <CircularProgress />
      </div>
    )
  }

  if (tasksQuery.isError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-page p-6">
        <Alert severity="error">{tasksQuery.error?.message || 'Failed to load tasks'}</Alert>
        <Button className="mt-4" onClick={() => tasksQuery.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden bg-page">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
        <Button
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(ROUTES.PORTAL_SCALE)}
          className="text-ink-muted"
        >
          {t('common.actions.back', { defaultValue: 'Back to Scale' })}
        </Button>
        <Typography variant="h6" className="font-bold text-ink-strong">
          {t('scale.workbench.title', { defaultValue: 'Scale Production Workbench' })}
        </Typography>
        <div className="ml-auto text-sm text-ink-muted">
          {tasks.length}{' '}
          {t('scale.workbench.pendingTasks', { defaultValue: 'pending tasks in queue' })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex min-h-0 flex-1 flex-col gap-6 p-6 md:flex-row">
        {task ? (
          <>
            {/* Left: Information Panel */}
            <div className="w-full shrink-0 md:w-[400px] lg:w-[450px] flex flex-col gap-4 overflow-y-auto pr-2">
              <div className="bg-surface rounded-xl border border-border p-5 flex flex-col gap-5">
                {/* Product Info */}
                <section>
                  <Typography
                    variant="subtitle2"
                    className="text-ink-muted uppercase font-bold text-xs mb-3"
                  >
                    {t('scale.detail.productAndOrder', { defaultValue: 'Product & Order' })}
                  </Typography>
                  <div className="flex items-center gap-4">
                    {task.detail.product.imageUrl ? (
                      <ImagePreview
                        src={task.detail.product.imageUrl}
                        alt={task.detail.product.primaryCode}
                        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle"
                      >
                        <img
                          src={task.detail.product.imageUrl}
                          alt={task.detail.product.primaryCode}
                          className="h-full w-full object-cover"
                        />
                      </ImagePreview>
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle">
                        <Typography variant="caption" className="text-ink-muted">
                          No Image
                        </Typography>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 min-w-0">
                      <Typography
                        variant="body2"
                        className="font-mono font-bold text-ink-strong break-all"
                      >
                        {task.orderId}
                      </Typography>
                      <Typography variant="body2" className="text-ink-secondary truncate">
                        {task.detail.product.primaryCode}
                      </Typography>
                      <Typography variant="body2" className="text-ink-secondary truncate">
                        {task.detail.product.secondaryCode}
                      </Typography>
                    </div>
                  </div>
                </section>

                {/* Customizations */}
                <section>
                  <Typography
                    variant="subtitle2"
                    className="text-ink-muted uppercase font-bold text-xs mb-3"
                  >
                    {t('scale.detail.customization', { defaultValue: 'Customization' })}
                  </Typography>
                  <div className="flex flex-col gap-3">
                    {(task.detail.customization || []).map((item, index) => (
                      <div key={index} className="flex flex-col gap-1">
                        <Typography variant="caption" className="font-bold text-ink-strong">
                          {item.label}:
                        </Typography>
                        {item.type === 'image' ? (
                          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-border bg-surface-subtle overflow-hidden">
                            {item.url ? (
                              <a href={item.url} target="_blank" rel="noreferrer">
                                <img
                                  src={item.url}
                                  alt={item.label}
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            ) : (
                              <Typography variant="caption" className="text-ink-muted">
                                Missing
                              </Typography>
                            )}
                          </div>
                        ) : (
                          <Typography
                            variant="body2"
                            className="text-ink-secondary bg-surface-subtle p-2 rounded border border-border"
                          >
                            {item.value}
                          </Typography>
                        )}
                      </div>
                    ))}
                    {(!task.detail.customization || task.detail.customization.length === 0) && (
                      <Typography variant="body2" className="text-ink-muted">
                        {t('scale.workbench.noCustomization', {
                          defaultValue: 'No customization specified.',
                        })}
                      </Typography>
                    )}
                  </div>
                </section>

                {/* PSD Download */}
                <section>
                  <Typography
                    variant="subtitle2"
                    className="text-ink-muted uppercase font-bold text-xs mb-3"
                  >
                    {t('scale.workbench.assets', { defaultValue: 'Design Assets' })}
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<FileDownloadOutlinedIcon />}
                    fullWidth
                    disabled={!task.detail.psdTemplate?.assetId}
                    onClick={() =>
                      handleDownloadAsset(task.detail.psdTemplate.assetId, `${task.orderId}-psd`)
                    }
                  >
                    {t('scale.etsy.actions.downloadPsd', { defaultValue: 'Download PSD Template' })}
                  </Button>
                </section>
              </div>
            </div>

            {/* Right: Upload Zones */}
            <div className="min-w-0 flex-1 flex flex-col gap-4">
              <div className="bg-surface rounded-xl border border-border p-5 flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between">
                  <Typography variant="h6" className="font-bold text-ink-strong">
                    {t('scale.workbench.uploadScaledFiles', {
                      defaultValue: 'Upload Scaled Files',
                    })}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="inherit"
                    endIcon={<SkipNextIcon />}
                    onClick={handleSkipNext}
                  >
                    {t('scale.workbench.skipNext', { defaultValue: 'Skip & Next' })}
                  </Button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-2">
                  {(task.detail.mockups || []).map((mockup) => (
                    <DropzoneSlot
                      key={mockup.id}
                      mockup={mockup}
                      task={task}
                      onUploadOutput={handleUploadOutput}
                      onDownloadAsset={handleDownloadAsset}
                      uploadingSlotId={uploadingSlotId}
                      t={t}
                    />
                  ))}
                  {(!task.detail.mockups || task.detail.mockups.length === 0) && (
                    <div className="col-span-full py-10 text-center">
                      <Typography variant="body1" className="text-ink-muted">
                        {t('scale.messages.noScaleSlots', {
                          defaultValue: 'No scale slots found for this task.',
                        })}
                      </Typography>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-surface">
            <Typography className="text-ink-muted">
              {t('scale.workbench.noTasks', {
                defaultValue: 'No tasks waiting in queue! Great job!',
              })}
            </Typography>
          </div>
        )}
      </main>
    </div>
  )
}
