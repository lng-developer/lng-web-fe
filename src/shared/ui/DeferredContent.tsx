import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from 'antd'

/** Mount once near the viewport; keep drafts and focused controls alive after scrolling away. */
export function DeferredContent({
  children,
  revealLabel,
  placeholderHeight = 320,
}: {
  children: ReactNode
  revealLabel: string
  placeholderHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (visible || !ref.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div ref={ref} style={visible ? undefined : { minHeight: placeholderHeight }}>
      {visible ? children : <Button onClick={() => setVisible(true)}>{revealLabel}</Button>}
    </div>
  )
}
