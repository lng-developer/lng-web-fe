import { type ReactNode } from 'react'
import { Checkbox } from 'antd'

import styles from './PermissionCheckboxGroup.module.scss'

export type PermissionCheckboxOption = {
  readonly label: string | ReactNode
  readonly value: string
  readonly disabled?: boolean
}

export type PermissionCheckboxGroupSection = {
  readonly title: string
  readonly options: PermissionCheckboxOption[]
}

export interface PermissionCheckboxGroupProps {
  readonly options?: PermissionCheckboxOption[]
  readonly sections?: PermissionCheckboxGroupSection[]
  readonly value?: string[]
  readonly onChange?: (values: string[]) => void
  readonly columns?: number
  readonly loading?: boolean
  readonly className?: string
  readonly disabled?: boolean
}

export function PermissionCheckboxGroup({
  options,
  sections,
  value,
  onChange,
  columns = 3,
  loading = false,
  className,
  disabled = false,
}: PermissionCheckboxGroupProps) {
  if (loading) {
    return (
      <div className={className}>{/* TODO: load state handled by parent while data loads */}</div>
    )
  }

  const groupedSections = sections?.length
    ? sections
    : options?.length
      ? [{ title: '', options }]
      : []

  if (groupedSections.length === 0) {
    return <div className={className} />
  }

  const showSectionTitle = groupedSections.some((section) => Boolean(section.title))

  return (
    <Checkbox.Group
      className={`${styles.checkboxGroup} ${className ?? ''}`}
      value={value}
      disabled={disabled}
      onChange={(selected) => onChange?.(selected as string[])}
      style={{ '--permission-columns': String(columns) } as Record<string, string>}
    >
      {groupedSections.map((section) => (
        <div key={section.title || 'permissions'} className={styles.section}>
          {showSectionTitle && section.title ? (
            <div className={styles.sectionTitle}>{section.title}</div>
          ) : null}
          <div className={styles.sectionGrid}>
            {section.options.map((option) => (
              <Checkbox
                key={option.value}
                value={option.value}
                disabled={option.disabled || disabled}
              >
                {option.label}
              </Checkbox>
            ))}
          </div>
        </div>
      ))}
    </Checkbox.Group>
  )
}
