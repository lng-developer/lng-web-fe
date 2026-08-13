import { type ReactNode, useState } from 'react'
import { Checkbox, Input } from 'antd'

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
  readonly searchPlaceholder?: string
  readonly emptyText?: string
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
  searchPlaceholder = 'Search permissions',
  emptyText = 'No permissions found',
}: PermissionCheckboxGroupProps) {
  const [search, setSearch] = useState('')
  const groupedSections = sections?.length
    ? sections
    : options?.length
      ? [{ title: '', options }]
      : []
  const selectedValues = new Set(value ?? [])
  const normalizedSearch = search.trim().toLowerCase()
  const filteredSections = groupedSections
    .map((section) => ({
      ...section,
      options: normalizedSearch
        ? section.options.filter((option) =>
            String(option.label ?? option.value)
              .toLowerCase()
              .includes(normalizedSearch),
          )
        : section.options,
    }))
    .filter((section) => section.options.length > 0)

  if (loading) {
    return (
      <div className={className}>{/* TODO: load state handled by parent while data loads */}</div>
    )
  }

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
      <Input.Search
        className={styles.search}
        allowClear
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {filteredSections.length === 0 ? <div className={styles.empty}>{emptyText}</div> : null}
      <div className={styles.sections}>
        {filteredSections.map((section) => {
          const selectedCount = section.options.filter((option) =>
            selectedValues.has(option.value),
          ).length

          return (
            <div key={section.title || 'permissions'} className={styles.section}>
              {showSectionTitle && section.title ? (
                <div className={styles.sectionTitle}>
                  <span>{section.title}</span>
                  <span className={styles.sectionCount}>
                    {selectedCount}/{section.options.length}
                  </span>
                </div>
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
          )
        })}
      </div>
    </Checkbox.Group>
  )
}
