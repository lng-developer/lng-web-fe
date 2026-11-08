import { useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FullscreenExitOutlined,
  FullscreenOutlined,
  LayoutOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Modal, Space, Tooltip } from 'antd'

export interface DetailDrawerProps {
  readonly open: boolean
  readonly title?: ReactNode
  readonly children?: ReactNode
  readonly onClose?: () => void
  readonly onCancel?: () => void
  readonly footer?: ReactNode
  readonly width?: number | string
  readonly drawerWidth?: number | string
  readonly defaultMode?: 'modal' | 'drawer'
  readonly allowModeToggle?: boolean
  readonly allowMaximize?: boolean
  readonly centered?: boolean
  readonly loading?: boolean
  readonly style?: CSSProperties
  readonly className?: string
  readonly wrapClassName?: string
  readonly maskClosable?: boolean
  readonly closable?: boolean
  readonly zIndex?: number
  readonly afterOpenChange?: (open: boolean) => void
  readonly styles?: {
    body?: CSSProperties
    header?: CSSProperties
  }
  readonly destroyOnClose?: boolean
  readonly destroyOnHidden?: boolean
}

export function DetailDrawer({
  open,
  title,
  children,
  onClose,
  onCancel,
  footer,
  width = 'min(1500px, 94vw)',
  drawerWidth = 'min(920px, 75vw)',
  defaultMode = 'modal',
  allowModeToggle = true,
  allowMaximize = true,
  centered,
  loading,
  style,
  className,
  wrapClassName,
  maskClosable,
  closable,
  zIndex,
  afterOpenChange,
  styles: modalStyles,
  destroyOnClose = true,
  destroyOnHidden,
}: DetailDrawerProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'modal' | 'drawer'>(defaultMode)
  const [isMaximized, setIsMaximized] = useState(false)

  const handleToggleMode = () => {
    setMode((prev) => (prev === 'modal' ? 'drawer' : 'modal'))
  }

  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev)
  }

  const handleClose = () => {
    setIsMaximized(false)
    ;(onClose ?? onCancel)?.()
  }

  const shouldDestroy = destroyOnHidden ?? destroyOnClose

  if (mode === 'drawer') {
    return (
      <Drawer
        open={open}
        afterOpenChange={afterOpenChange}
        title={title}
        onClose={handleClose}
        width={drawerWidth}
        footer={footer ?? null}
        destroyOnClose={shouldDestroy}
        className={className}
        zIndex={zIndex}
        maskClosable={maskClosable}
        closable={closable}
        extra={
          allowModeToggle ? (
            <Tooltip title={t('common.switchToModal', { defaultValue: 'Switch to modal dialog' })}>
              <Button
                type="text"
                size="small"
                aria-label="Switch to modal dialog"
                icon={<MenuUnfoldOutlined />}
                onClick={handleToggleMode}
              />
            </Tooltip>
          ) : null
        }
        styles={{
          body: {
            overflowY: 'auto',
            padding: 16,
            ...modalStyles?.body,
          },
          header: modalStyles?.header,
        }}
      >
        {children}
      </Drawer>
    )
  }

  const hasControls = allowMaximize || allowModeToggle

  const modalTitle = hasControls ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 32,
        minHeight: 28,
        width: '100%',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 16 }}>{title}</div>
      <Space size={4} onClick={(e) => e.stopPropagation()}>
        {allowMaximize ? (
          <Tooltip
            title={
              isMaximized
                ? t('common.restore', { defaultValue: 'Restore' })
                : t('common.maximize', { defaultValue: 'Maximize' })
            }
          >
            <Button
              type="text"
              size="small"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
              icon={isMaximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={handleToggleMaximize}
            />
          </Tooltip>
        ) : null}
        {allowModeToggle ? (
          <Tooltip title={t('common.switchToDrawer', { defaultValue: 'Switch to side panel' })}>
            <Button
              type="text"
              size="small"
              aria-label="Switch to side panel"
              icon={<LayoutOutlined />}
              onClick={handleToggleMode}
            />
          </Tooltip>
        ) : null}
      </Space>
    </div>
  ) : (
    title
  )

  const isCentered = isMaximized ? false : (centered ?? style?.top === undefined)

  return (
    <Modal
      open={open}
      loading={loading}
      afterOpenChange={afterOpenChange}
      title={modalTitle}
      onCancel={handleClose}
      footer={footer ?? null}
      width={isMaximized ? 'calc(100vw - 20px)' : width}
      className={className}
      wrapClassName={wrapClassName}
      zIndex={zIndex}
      maskClosable={maskClosable}
      closable={closable}
      centered={isCentered}
      style={{
        top: isMaximized ? 8 : isCentered ? undefined : style?.top,
        maxWidth: isMaximized ? 'calc(100vw - 20px)' : undefined,
        paddingBottom: 16,
        ...style,
      }}
      styles={{
        body: {
          maxHeight: isMaximized
            ? 'calc(100vh - 110px)'
            : (modalStyles?.body?.maxHeight ?? 'calc(100vh - 130px)'),
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 16,
          ...modalStyles?.body,
        },
        header: modalStyles?.header,
      }}
      destroyOnClose={shouldDestroy}
    >
      {children}
    </Modal>
  )
}

export const DetailModal = DetailDrawer
export type DetailModalProps = DetailDrawerProps
