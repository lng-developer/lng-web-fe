import { useRef, useState } from 'react'
import { Tooltip } from '@mui/material'

export default function OverflowTooltip({ children, className = '', text }) {
  const contentRef = useRef(null)
  const [title, setTitle] = useState('')

  function handleMouseEnter() {
    const content = contentRef.current
    const isOverflowing = content && content.scrollWidth > content.clientWidth

    setTitle(isOverflowing ? text : '')
  }

  return (
    <Tooltip title={title}>
      <span
        ref={contentRef}
        className={`block min-w-0 truncate ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setTitle('')}
      >
        {children ?? text}
      </span>
    </Tooltip>
  )
}
