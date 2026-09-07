import { memo, type ReactNode, useCallback, useMemo, useState } from 'react'
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

export const PermissionCheckboxGroup = memo(function PermissionCheckboxGroup({
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

  const groupedSections = useMemo(
    () => (sections?.length ? sections : options?.length ? [{ title: '', options }] : []),
    [sections, options],
  )

  const selectedValues = useMemo(() => new Set(value ?? []), [value])
  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search])

  const filteredSections = useMemo(
    () =>
      groupedSections
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
        .filter((section) => section.options.length > 0),
    [groupedSections, normalizedSearch],
  )

  const showSectionTitle = useMemo(
    () => groupedSections.some((section) => Boolean(section.title)),
    [groupedSections],
  )

  const groupStyle = useMemo(
    () => ({ '--permission-columns': String(columns) }) as Record<string, string>,
    [columns],
  )

  const handleChange = useCallback(
    (selected: unknown[]) => onChange?.(selected as string[]),
    [onChange],
  )

  if (loading) {
    return (
      <div className={className}>{/* TODO: load state handled by parent while data loads */}</div>
    )
  }

  if (groupedSections.length === 0) {
    return <div className={className} />
  }

  return (
    <Checkbox.Group
      className={`${styles.checkboxGroup} ${className ?? ''}`}
      value={value}
      disabled={disabled}
      onChange={handleChange}
      style={groupStyle}
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
})
