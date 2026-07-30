import { useEffect, useMemo, useState } from 'react'
import { Input, Modal } from 'antd'

import styles from './sharedUi.module.scss'

export interface Command {
  readonly key: string
  readonly label: string
  readonly description?: string
  readonly onSelect: () => void
}

export interface CommandPaletteProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly commands: readonly Command[]
  readonly placeholder?: string
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder = 'Search commands',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const filteredCommands = useMemo(
    () => commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenChange(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpenChange])

  return (
    <Modal open={open} footer={null} onCancel={() => onOpenChange(false)} title={null} width={560}>
      <Input.Search
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className={styles.commandList}>
        {filteredCommands.map((command) => (
          <button
            className={styles.commandItem}
            key={command.key}
            onClick={() => {
              command.onSelect()
              onOpenChange(false)
            }}
          >
            <span>{command.label}</span>
            {command.description ? <small>{command.description}</small> : null}
          </button>
        ))}
      </div>
    </Modal>
  )
}
