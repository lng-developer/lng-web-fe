import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckOutlined,
  DisconnectOutlined,
  FileTextOutlined,
  LinkOutlined,
  StopOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import {
  Button,
  Flex,
  Input,
  Modal,
  Popover,
  Radio,
  Segmented,
  Slider,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

import { AuthenticatedMediaImage } from '@/shared/media'

import type { FileCheck, ProductionTask } from '../api/productionApi'
import { formatCustomization } from './inspectionReference'
import styles from './ProductionWorkbenchPage.module.scss'

const REJECTION_PRESETS = [
  'Low Resolution / Pixelated (<150 DPI)',
  'White Edge / Fringe Effect',
  'Distorted / Aspect Ratio Mismatch',
  'Missing Transparency / Solid BG',
  'Artwork Cropped / Edge Cut',
]

interface ArtworkInspectorProps {
  readonly check: FileCheck
  readonly task?: ProductionTask
  readonly originalInputUrl?: string | null
  readonly originalInputLabel?: string | null
  readonly listingReferenceUrl?: string | null
  readonly readonly?: boolean
  readonly onClose: () => void
  readonly onPass: (note?: string) => void
  readonly onReject: (note: string) => void
}

export function ArtworkInspector({
  check,
  task,
  originalInputUrl,
  originalInputLabel,
  listingReferenceUrl,
  readonly = false,
  onClose,
  onPass,
  onReject,
}: ArtworkInspectorProps) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'sideBySide' | 'split' | 'overlay'>('sideBySide')
  const [bgType, setBgType] = useState<'checkerboard' | 'white' | 'black' | 'navy'>('checkerboard')
  const [splitPos, setSplitPos] = useState(50)
  const [opacity, setOpacity] = useState(60)

  // Pan & Zoom controls (Supports both synchronized and independent alignment)
  const [isSync, setIsSync] = useState(true)
  const [originalPan, setOriginalPan] = useState({ x: 0, y: 0 })
  const [scaledPan, setScaledPan] = useState({ x: 0, y: 0 })
  const [originalZoom, setOriginalZoom] = useState(100)
  const [scaledZoom, setScaledZoom] = useState(100)

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [rejectNote, setRejectNote] = useState('')

  const canvasRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const isDraggingSplitRef = useRef(false)
  const activeDragTargetRef = useRef<'original' | 'scaled' | 'both'>('both')
  const dragStartRef = useRef({
    x: 0,
    y: 0,
    origOriginX: 0,
    origOriginY: 0,
    scaledOriginX: 0,
    scaledOriginY: 0,
  })

  const originalUrl = originalInputUrl ?? check.inputAssetDownloadUrl
  const originalLabel = originalInputLabel ?? t('portal.production.customerArtwork')
  const scaledUrl = check.outputAssetDownloadUrl

  const customizationEntries = useMemo(
    () => formatCustomization(task?.customization?.customerInputs),
    [task?.customization?.customerInputs],
  )

  const resetView = useCallback(() => {
    setOriginalPan({ x: 0, y: 0 })
    setScaledPan({ x: 0, y: 0 })
    setOriginalZoom(100)
    setScaledZoom(100)
    setSplitPos(50)
    setOpacity(60)
  }, [])

  // Mouse wheel zoom
  const handleWheelOn = useCallback(
    (target: 'original' | 'scaled' | 'both', e: ReactWheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 15 : -15
      if (isSync || target === 'both') {
        setOriginalZoom((prev) => Math.min(500, Math.max(25, prev + delta)))
        setScaledZoom((prev) => Math.min(500, Math.max(25, prev + delta)))
      } else if (target === 'original') {
        setOriginalZoom((prev) => Math.min(500, Math.max(25, prev + delta)))
      } else {
        setScaledZoom((prev) => Math.min(500, Math.max(25, prev + delta)))
      }
    },
    [isSync],
  )

  // Pointer drag pan
  const handlePointerDownOn = useCallback(
    (target: 'original' | 'scaled' | 'both', e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      isDraggingRef.current = true
      activeDragTargetRef.current = isSync ? 'both' : target
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        origOriginX: originalPan.x,
        origOriginY: originalPan.y,
        scaledOriginX: scaledPan.x,
        scaledOriginY: scaledPan.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [isSync, originalPan.x, originalPan.y, scaledPan.x, scaledPan.y],
  )

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    const target = activeDragTargetRef.current

    if (target === 'both' || target === 'original') {
      setOriginalPan({
        x: dragStartRef.current.origOriginX + dx,
        y: dragStartRef.current.origOriginY + dy,
      })
    }
    if (target === 'both' || target === 'scaled') {
      setScaledPan({
        x: dragStartRef.current.scaledOriginX + dx,
        y: dragStartRef.current.scaledOriginY + dy,
      })
    }
  }, [])

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [])

  // Split slider interactive dragging
  const handleSplitPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    isDraggingSplitRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handleSplitPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingSplitRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    if (rect.width <= 0) return
    const x = e.clientX - rect.left
    const percent = Math.min(100, Math.max(0, (x / rect.width) * 100))
    setSplitPos(Math.round(percent))
  }, [])

  const handleSplitPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    isDraggingSplitRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [])

  // Keyboard Shortcuts (P = Pass, R = Reject, 1/2/3 = View Mode, Space = Reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (!readonly && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        onPass()
      } else if (!readonly && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        setRejectModalOpen(true)
      } else if (e.key === '1') {
        setViewMode('sideBySide')
      } else if (e.key === '2') {
        setViewMode('split')
      } else if (e.key === '3') {
        setViewMode('overlay')
      } else if (e.code === 'Space') {
        e.preventDefault()
        resetView()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onPass, readonly, resetView])

  const handlePresetToggle = (preset: string) => {
    setSelectedPresets((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset],
    )
  }

  const handleConfirmReject = () => {
    const combinedReason = [...selectedPresets, rejectNote.trim()].filter(Boolean).join(' · ')

    if (!combinedReason) return
    onReject(combinedReason)
    setRejectModalOpen(false)
  }

  const bgClass =
    bgType === 'checkerboard'
      ? styles.checkerboardBg
      : bgType === 'white'
        ? styles.bgWhite
        : bgType === 'black'
          ? styles.bgBlack
          : styles.bgNavy

  const originalTransformStyle: CSSProperties = {
    transform: `translate(${originalPan.x}px, ${originalPan.y}px) scale(${originalZoom / 100})`,
    transformOrigin: 'center',
    willChange: 'transform',
    transition: 'transform 0.05s ease-out',
  }

  const scaledTransformStyle: CSSProperties = {
    transform: `translate(${scaledPan.x}px, ${scaledPan.y}px) scale(${scaledZoom / 100})`,
    transformOrigin: 'center',
    willChange: 'transform',
    transition: 'transform 0.05s ease-out',
  }

  const zoomDisplay = isSync ? `${scaledZoom}%` : `${originalZoom}% · ${scaledZoom}%`

  return (
    <Modal
      open
      width="96vw"
      centered
      style={{ top: 12, paddingBottom: 12 }}
      styles={{
        body: {
          height: 'calc(94vh - 76px)',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
      footer={null}
      title={
        <Flex justify="space-between" align="center" style={{ paddingRight: 32 }}>
          <Space size={8}>
            <span>
              {t('portal.production.inspectArtwork', { slot: check.slotLabel || check.slotKey })}
            </span>
            <Tag color="blue">{check.slotKey}</Tag>
          </Space>
          {task && (customizationEntries.length > 0 || task.csNote) ? (
            <Popover
              title={
                <Flex justify="space-between" align="center" gap={12}>
                  <Typography.Text strong>{t('portal.production.customerInputs')}</Typography.Text>
                  <Tag color="cyan">{customizationEntries.length}</Tag>
                </Flex>
              }
              content={
                <div style={{ maxWidth: 360, maxHeight: 280, overflowY: 'auto' }}>
                  {task.csNote && (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: '6px 10px',
                        background: 'var(--ant-color-warning-bg)',
                        borderRadius: 6,
                        border: '1px solid var(--ant-color-warning-border)',
                      }}
                    >
                      <Typography.Text
                        strong
                        style={{
                          fontSize: 11,
                          display: 'block',
                          color: 'var(--ant-color-warning-text)',
                        }}
                      >
                        CS Note:
                      </Typography.Text>
                      <Typography.Text style={{ fontSize: 12 }}>{task.csNote}</Typography.Text>
                    </div>
                  )}
                  {customizationEntries.length > 0 ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {customizationEntries.map(([label, value]) => (
                        <div
                          key={`${label}-${value}`}
                          style={{
                            fontSize: 12,
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            borderBottom: '1px solid var(--ant-color-border-secondary)',
                            paddingBottom: 4,
                          }}
                        >
                          <span style={{ color: 'var(--ant-color-text-secondary)' }}>{label}:</span>
                          <strong style={{ textAlign: 'right' }}>{value}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      -
                    </Typography.Text>
                  )}
                </div>
              }
              trigger="click"
              placement="bottomRight"
            >
              <Button size="small" icon={<FileTextOutlined />}>
                {t('portal.production.customerInputs')} ({customizationEntries.length})
              </Button>
            </Popover>
          ) : null}
        </Flex>
      }
      onCancel={onClose}
      destroyOnHidden
    >
      {/* Inspector Toolbar */}
      <div className={styles.inspectToolbar}>
        {/* Comparison View Mode Segmented */}
        <Space size={12}>
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as typeof viewMode)}
            options={[
              { label: '↔️ Side-by-Side (1)', value: 'sideBySide' },
              { label: '🔀 Split Slider (2)', value: 'split' },
              { label: '👁️ Overlay (3)', value: 'overlay' },
            ]}
          />

          {/* Mode specific controls */}
          {viewMode === 'split' ? (
            <Flex align="center" gap={8} style={{ width: 180 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Split:
              </Typography.Text>
              <Slider
                value={splitPos}
                onChange={setSplitPos}
                min={0}
                max={100}
                style={{ flex: 1, margin: 0 }}
              />
            </Flex>
          ) : null}

          {viewMode === 'overlay' ? (
            <Flex align="center" gap={8} style={{ width: 180 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Opacity:
              </Typography.Text>
              <Slider
                value={opacity}
                onChange={setOpacity}
                min={0}
                max={100}
                style={{ flex: 1, margin: 0 }}
              />
            </Flex>
          ) : null}
        </Space>

        {/* Background & Zoom controls */}
        <Space size={12}>
          <Radio.Group
            size="small"
            value={bgType}
            onChange={(e) => setBgType(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="checkerboard">🏁 Transparent</Radio.Button>
            <Radio.Button value="white">⚪ White</Radio.Button>
            <Radio.Button value="black">⚫ Black</Radio.Button>
            <Radio.Button value="navy">🔵 Navy</Radio.Button>
          </Radio.Group>

          {/* Sync Pan/Zoom toggle */}
          <Tooltip
            title={
              isSync
                ? t('portal.production.syncZoom')
                : t('portal.production.independentZoom', { defaultValue: 'Independent Pan/Zoom' })
            }
          >
            <Button
              size="small"
              type={isSync ? 'primary' : 'default'}
              icon={isSync ? <LinkOutlined /> : <DisconnectOutlined />}
              onClick={() => setIsSync((prev) => !prev)}
            >
              {isSync
                ? t('portal.production.syncZoom')
                : t('portal.production.independentZoom', { defaultValue: 'Independent' })}
            </Button>
          </Tooltip>

          <Space size={4}>
            <Button
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={() => {
                if (isSync) {
                  setOriginalZoom((z) => Math.max(25, z - 25))
                  setScaledZoom((z) => Math.max(25, z - 25))
                } else {
                  setScaledZoom((z) => Math.max(25, z - 25))
                }
              }}
            />
            <Typography.Text strong style={{ fontSize: 12, minWidth: 46, textAlign: 'center' }}>
              {zoomDisplay}
            </Typography.Text>
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              onClick={() => {
                if (isSync) {
                  setOriginalZoom((z) => Math.min(500, z + 25))
                  setScaledZoom((z) => Math.min(500, z + 25))
                } else {
                  setScaledZoom((z) => Math.min(500, z + 25))
                }
              }}
            />
          </Space>

          <Button size="small" onClick={resetView}>
            {t('portal.production.resetView')}
          </Button>
          {listingReferenceUrl ? (
            <Typography.Link href={listingReferenceUrl} target="_blank" rel="noreferrer">
              {t('portal.production.mainListing', 'Main listing')}
            </Typography.Link>
          ) : null}
        </Space>
      </div>

      {/* Main Inspection Canvas Container */}
      <div className={styles.canvasContainer}>
        {viewMode === 'sideBySide' ? (
          <div className={styles.inspector}>
            {/* Original */}
            <div
              className={`${styles.inspectPanel} ${bgClass}`}
              onWheel={(e) => handleWheelOn('original', e)}
              onPointerDown={(e) => handlePointerDownOn('original', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div className={styles.inspectPanelBadge}>
                <span className={styles.badgeDot} />
                {t('portal.production.original')} ({originalLabel})
              </div>
              {originalUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={originalUrl}
                  alt={t('portal.production.original')}
                  style={originalTransformStyle}
                  draggable={false}
                />
              ) : (
                <Typography.Text type="secondary">
                  {t('portal.production.customerArtworkMissing', 'Customer artwork is not linked')}
                </Typography.Text>
              )}
            </div>

            {/* Scaled Output */}
            <div
              className={`${styles.inspectPanel} ${bgClass}`}
              onWheel={(e) => handleWheelOn('scaled', e)}
              onPointerDown={(e) => handlePointerDownOn('scaled', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div className={styles.inspectPanelBadge}>
                <span className={`${styles.badgeDot} ${styles.badgeDotSuccess}`} />
                {t('portal.production.scaled')} (Scaled Output)
              </div>
              {scaledUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={scaledUrl}
                  alt={t('portal.production.scaled')}
                  style={scaledTransformStyle}
                  draggable={false}
                />
              ) : (
                <Typography.Text type="secondary">
                  {t('portal.production.fileMissing')}
                </Typography.Text>
              )}
            </div>
          </div>
        ) : viewMode === 'split' ? (
          /* Split Screen Slider Canvas with Direct Dragging */
          <div
            ref={canvasRef}
            className={`${styles.singleInspectCanvas} ${bgClass}`}
            onWheel={(e) => handleWheelOn('scaled', e)}
            onPointerDown={(e) => handlePointerDownOn('both', e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Original Layer (full width, clipped) */}
            <div
              className={styles.splitLayerOriginal}
              style={{ clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)` }}
            >
              {originalUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={originalUrl}
                  alt={t('portal.production.original')}
                  style={originalTransformStyle}
                />
              ) : null}
            </div>

            {/* Scaled Layer (full width, right clipped) */}
            <div
              className={styles.splitLayerScaled}
              style={{ clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)` }}
            >
              {scaledUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={scaledUrl}
                  alt={t('portal.production.scaled')}
                  style={scaledTransformStyle}
                />
              ) : null}
            </div>

            {/* Interactive Divider Track Handle */}
            <div
              className={styles.splitSliderTrack}
              style={{ left: `${splitPos}%` }}
              onPointerDown={handleSplitPointerDown}
              onPointerMove={handleSplitPointerMove}
              onPointerUp={handleSplitPointerUp}
            />
          </div>
        ) : (
          /* Overlay Opacity Canvas */
          <div
            className={`${styles.singleInspectCanvas} ${bgClass}`}
            onWheel={(e) => handleWheelOn('scaled', e)}
            onPointerDown={(e) => handlePointerDownOn('both', e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Original (Base Layer) */}
            <div className={styles.splitLayerOriginal}>
              {originalUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={originalUrl}
                  alt={t('portal.production.original')}
                  style={originalTransformStyle}
                />
              ) : null}
            </div>

            {/* Scaled (Overlay Layer with Opacity) */}
            <div className={styles.splitLayerScaled} style={{ opacity: opacity / 100 }}>
              {scaledUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={scaledUrl}
                  alt={t('portal.production.scaled')}
                  style={scaledTransformStyle}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* QC Fixed Footer Guide and Action Bar */}
      {!readonly ? (
        <div className={styles.inspectFooter}>
          <div className={styles.shortcutBar}>
            <span>
              ⚡ <strong>QC Shortcuts</strong>:
            </span>
            <span>
              <kbd>P</kbd> {t('portal.production.passSlot')}
            </span>
            <span>
              <kbd>R</kbd> {t('portal.production.rejectSlot')}
            </span>
            <span>
              <kbd>1</kbd> Side-by-Side
            </span>
            <span>
              <kbd>2</kbd> Split Slider
            </span>
            <span>
              <kbd>3</kbd> Overlay
            </span>
            <span>
              <kbd>Space</kbd> {t('portal.production.resetView')}
            </span>
          </div>

          <div className={styles.inspectBottomRow}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {isSync
                ? t('portal.production.syncZoom')
                : t('portal.production.independentZoom', { defaultValue: 'Independent Pan/Zoom' })}
            </Typography.Text>
            <Flex gap={12}>
              <Button danger icon={<StopOutlined />} onClick={() => setRejectModalOpen(true)}>
                {t('portal.production.rejectSlot')} (R)
              </Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={() => onPass()}>
                {t('portal.production.passSlot')} (P)
              </Button>
            </Flex>
          </div>
        </div>
      ) : null}

      {/* Quick Rejection Modal with Preset Reason Chips */}
      <Modal
        open={rejectModalOpen}
        title={t('portal.production.rejectSlot')}
        okText={t('portal.production.confirmReject', { defaultValue: 'Confirm Rejection' })}
        okButtonProps={{ danger: true, disabled: !selectedPresets.length && !rejectNote.trim() }}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleConfirmReject}
      >
        <Typography.Text
          type="secondary"
          style={{ display: 'block', marginBottom: 10, fontSize: 12 }}
        >
          {t('portal.production.selectPresetReasons', {
            defaultValue: 'Select one or more rejection reasons:',
          })}
        </Typography.Text>

        <div className={styles.presetChips}>
          {REJECTION_PRESETS.map((preset) => {
            const isSelected = selectedPresets.includes(preset)
            return (
              <button
                key={preset}
                type="button"
                className={`${styles.presetChip} ${isSelected ? styles.selected : ''}`}
                onClick={() => handlePresetToggle(preset)}
              >
                {isSelected ? '✓ ' : '+ '} {preset}
              </button>
            )
          })}
        </div>

        <Input.TextArea
          rows={3}
          value={rejectNote}
          placeholder={t('portal.production.customRejectNote', {
            defaultValue: 'Add additional QC notes or specific rework instructions...',
          })}
          onChange={(e) => setRejectNote(e.target.value)}
        />
      </Modal>
    </Modal>
  )
}
