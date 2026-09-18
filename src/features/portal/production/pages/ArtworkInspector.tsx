import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { CheckOutlined, StopOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons'
import { Button, Flex, Input, Modal, Radio, Segmented, Slider, Space, Tag, Typography } from 'antd'

import { AuthenticatedMediaImage } from '@/shared/media'

import type { FileCheck } from '../api/productionApi'
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
  readonly originalInputUrl?: string | null
  readonly listingReferenceUrl?: string | null
  readonly readonly?: boolean
  readonly onClose: () => void
  readonly onPass: (note?: string) => void
  readonly onReject: (note: string) => void
}

export function ArtworkInspector({
  check,
  originalInputUrl,
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
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [rejectNote, setRejectNote] = useState('')

  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, originX: 0, originY: 0 })

  const originalUrl = originalInputUrl ?? check.inputAssetDownloadUrl
  const originalLabel = 'Customer input'
  const scaledUrl = check.outputAssetDownloadUrl

  const resetView = useCallback(() => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
    setSplitPos(50)
    setOpacity(60)
  }, [])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault()
    setZoom((prev) => Math.min(500, Math.max(25, prev + (e.deltaY < 0 ? 15 : -15))))
  }, [])

  // Pointer drag pan
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      isDraggingRef.current = true
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        originX: pan.x,
        originY: pan.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [pan.x, pan.y],
  )

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPan({
      x: dragStartRef.current.originX + dx,
      y: dragStartRef.current.originY + dy,
    })
  }, [])

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
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

  const transformStyle: CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
    transformOrigin: 'center',
    willChange: 'transform',
    transition: 'transform 0.05s ease-out',
  }

  return (
    <Modal
      open
      width="94vw"
      footer={null}
      title={
        <Flex justify="space-between" align="center" style={{ paddingRight: 32 }}>
          <span>
            {t('portal.production.inspectArtwork', { slot: check.slotLabel || check.slotKey })}
          </span>
          <Tag color="blue">{check.slotKey}</Tag>
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

          <Space size={4}>
            <Button
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={() => setZoom((z) => Math.max(25, z - 25))}
            />
            <Typography.Text strong style={{ fontSize: 12, minWidth: 42, textAlign: 'center' }}>
              {zoom}%
            </Typography.Text>
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              onClick={() => setZoom((z) => Math.min(500, z + 25))}
            />
          </Space>

          <Button size="small" onClick={resetView}>
            Reset View
          </Button>
          {listingReferenceUrl ? (
            <Typography.Link href={listingReferenceUrl} target="_blank" rel="noreferrer">
              {t('portal.production.mainListing', 'Main listing')}
            </Typography.Link>
          ) : null}
        </Space>
      </div>

      {/* Main Inspection Canvas */}
      <div onWheel={handleWheel}>
        {viewMode === 'sideBySide' ? (
          <div className={styles.inspector}>
            {/* Original */}
            <div
              className={`${styles.inspectPanel} ${bgClass}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <Typography.Text strong>
                {t('portal.production.original')} ({originalLabel})
              </Typography.Text>
              {originalUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={originalUrl}
                  alt={t('portal.production.original')}
                  style={transformStyle}
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
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <Typography.Text strong>
                {t('portal.production.scaled')} (Scaled Output)
              </Typography.Text>
              {scaledUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={scaledUrl}
                  alt={t('portal.production.scaled')}
                  style={transformStyle}
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
          /* Split Screen Slider Canvas */
          <div
            className={`${styles.singleInspectCanvas} ${bgClass}`}
            onPointerDown={handlePointerDown}
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
                  alt="Original"
                  style={transformStyle}
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
                  alt="Scaled"
                  style={transformStyle}
                />
              ) : null}
            </div>

            {/* Divider Track Handle */}
            <div className={styles.splitSliderTrack} style={{ left: `${splitPos}%` }} />
          </div>
        ) : (
          /* Overlay Opacity Canvas */
          <div
            className={`${styles.singleInspectCanvas} ${bgClass}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Original (Base Layer) */}
            <div className={styles.splitLayerOriginal}>
              {originalUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={originalUrl}
                  alt="Original"
                  style={transformStyle}
                />
              ) : null}
            </div>

            {/* Scaled (Overlay Layer with Opacity) */}
            <div className={styles.splitLayerScaled} style={{ opacity: opacity / 100 }}>
              {scaledUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={scaledUrl}
                  alt="Scaled"
                  style={transformStyle}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {!readonly ? (
        <>
          {/* QC Keyboard Shortcuts Footer Guide */}
          <div className={styles.shortcutBar}>
            <span>
              ⚡ <strong>QC Shortcuts</strong>:
            </span>
            <span>
              <kbd>P</kbd> Pass Slot
            </span>
            <span>
              <kbd>R</kbd> Reject Slot
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
              <kbd>Space</kbd> Center View
            </span>
          </div>

          {/* Main Action Bar */}
          <Flex justify="end" gap={12} style={{ marginTop: 16 }}>
            <Button danger icon={<StopOutlined />} onClick={() => setRejectModalOpen(true)}>
              {t('portal.production.rejectSlot')} (R)
            </Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={() => onPass()}>
              {t('portal.production.passSlot')} (P)
            </Button>
          </Flex>
        </>
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
