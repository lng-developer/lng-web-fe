import type { ReactNode } from 'react'
/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components -- animation state follows the controlled open prop */
import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { ModalProps } from 'antd'
import { Modal } from 'antd'

import styles from './PopupModal.module.scss'

type PopupPhase = 'opening' | 'opened' | 'closing'

export type PopupModalAnchor = {
  x: number
  y: number
  width?: number
  height?: number
}

const ANIMATION_MS = 180
let lastPointerPopupAnchor: PopupModalAnchor | null = null

export interface PopupModalProps extends Omit<ModalProps, 'open' | 'title'> {
  readonly title?: ReactNode
  readonly open: boolean
  readonly anchor?: PopupModalAnchor | null
  readonly anchorRect?: PopupModalAnchor | null
}

function getPopupAnchorFromElement(target: Element | null): PopupModalAnchor | null {
  if (!target) {
    return null
  }

  const rect = target.getBoundingClientRect()

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    width: rect.width,
    height: rect.height,
  }
}

export function getPopupAnchorFromMouseEvent(event: MouseEvent<HTMLElement>): PopupModalAnchor {
  return getPopupAnchorFromElement(event.currentTarget)!
}

export function setPopupAnchorFromPointerEvent(event: PointerEvent): void {
  const target = event.target as Element | null
  lastPointerPopupAnchor = getPopupAnchorFromElement(target)
}

export function PopupModal({
  open,
  anchor,
  anchorRect,
  children,
  className,
  onCancel,
  ...props
}: PopupModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [resolvedAnchor, setResolvedAnchor] = useState<PopupModalAnchor | null>(null)
  const [phase, setPhase] = useState<PopupPhase>('opening')
  const [origin, setOrigin] = useState({ x: '50%', y: '50%' })
  const modalRef = useRef<HTMLDivElement | null>(null)
  const source = anchor ?? anchorRect ?? resolvedAnchor

  useEffect(() => {
    const onPointerDownCapture = (event: PointerEvent) => {
      setPopupAnchorFromPointerEvent(event)
    }

    document.addEventListener('pointerdown', onPointerDownCapture, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDownCapture, true)
    }
  }, [])

  useEffect(() => {
    if (open) {
      if (!anchor && !anchorRect) {
        const fromPointer = lastPointerPopupAnchor
        const fromActive = getPopupAnchorFromElement(document.activeElement)
        setResolvedAnchor(fromPointer ?? fromActive)
      }

      setIsOpen(true)
      setPhase('opening')
      requestAnimationFrame(() => setPhase('opened'))
      return
    }

    if (!isOpen) {
      return
    }

    setPhase('closing')
    if (!anchor && !anchorRect) {
      setResolvedAnchor(null)
    }
    const timer = window.setTimeout(() => {
      setIsOpen(false)
      setOrigin({ x: '50%', y: '50%' })
    }, ANIMATION_MS)

    return () => window.clearTimeout(timer)
  }, [anchor, anchorRect, open, isOpen])

  useLayoutEffect(() => {
    if (!isOpen || !modalRef.current || !source) {
      return
    }

    const modalRect = modalRef.current.getBoundingClientRect()

    const clamp = (value: number, min: number, max: number) => {
      if (value < min) return min
      if (value > max) return max
      return value
    }

    const nextOriginX = Math.round(
      clamp(source.x - modalRect.left, 8, Math.max(8, modalRect.width - 8)),
    )
    const nextOriginY = Math.round(
      clamp(source.y - modalRect.top, 8, Math.max(8, modalRect.height - 8)),
    )

    setOrigin({ x: `${nextOriginX}px`, y: `${nextOriginY}px` })
  }, [isOpen, source])

  if (!isOpen) {
    return null
  }

  const phaseClass =
    phase === 'opening'
      ? styles.popupOpening
      : phase === 'opened'
        ? styles.popupOpened
        : styles.popupClosing

  const mergedClassName = `${styles.popupModal} ${phaseClass} ${className ?? ''}`.trim()

  return (
    <Modal
      open
      centered
      transitionName=""
      maskTransitionName=""
      destroyOnHidden
      wrapClassName={mergedClassName}
      className={mergedClassName}
      onCancel={onCancel}
      {...props}
      modalRender={(node) => (
        <div
          ref={modalRef}
          data-popup-phase={phase}
          className={styles.popupModalContent}
          style={
            {
              ['--popup-origin-x' as const]: origin.x,
              ['--popup-origin-y' as const]: origin.y,
              ['--popup-duration' as const]: `${ANIMATION_MS}ms`,
            } as CSSProperties
          }
        >
          {node}
        </div>
      )}
    >
      {children}
    </Modal>
  )
}
