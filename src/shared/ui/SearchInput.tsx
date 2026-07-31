import { useEffect, useState } from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { Input, type InputProps } from 'antd'

export interface SearchInputProps extends Omit<
  InputProps,
  'defaultValue' | 'onChange' | 'prefix' | 'value'
> {
  readonly delay?: number
  readonly onSearchChange: (value: string) => void
  readonly value?: string
}

export function SearchInput({
  allowClear = true,
  delay = 200,
  onSearchChange,
  value = '',
  ...props
}: SearchInputProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (draft === value) return
    const timer = window.setTimeout(() => onSearchChange(draft), delay)
    return () => window.clearTimeout(timer)
  }, [delay, draft, onSearchChange, value])

  return (
    <Input
      {...props}
      allowClear={allowClear}
      prefix={<SearchOutlined aria-hidden />}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  )
}
