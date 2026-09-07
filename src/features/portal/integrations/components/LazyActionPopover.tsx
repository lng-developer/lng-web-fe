import { type ReactNode, useState } from 'react'
import { Popover } from 'antd'

export interface LazyActionPopoverProps {
  readonly renderContent: () => ReactNode
  readonly renderTrigger: (onOpen: () => void) => ReactNode
  readonly title: ReactNode
}

export function LazyActionPopover({ renderContent, renderTrigger, title }: LazyActionPopoverProps) {
  const [open, setOpen] = useState(false)

  if (!open) return renderTrigger(() => setOpen(true))

  return (
    <Popover
      destroyOnHidden
      title={title}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      content={open ? renderContent() : null}
    >
      {renderTrigger(() => undefined)}
    </Popover>
  )
}
