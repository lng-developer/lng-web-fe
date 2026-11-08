import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CompassOutlined, EnterOutlined, SearchOutlined } from '@ant-design/icons'
import { type InputRef, Input, Popover, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'

import {
  filterNavigationItems,
  getSearchableNavigationItems,
  type SearchableNavigationItem,
} from './navigationSearchItems'
import styles from './NavigationSearch.module.scss'

export function NavigationSearch({
  account,
  onNavigate,
  className,
}: {
  account?: CurrentAccount
  onNavigate?: () => void
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<InputRef>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isMac = useMemo(() => {
    if (typeof window === 'undefined') return false
    return navigator.platform?.toUpperCase().includes('MAC') || false
  }, [])

  const allItems = useMemo(() => getSearchableNavigationItems(account), [account])

  const filteredItems = useMemo(
    () => filterNavigationItems(allItems, query, t, i18n),
    [allItems, i18n, query, t],
  )

  const safeActiveIndex =
    filteredItems.length === 0 ? 0 : Math.min(activeIndex, filteredItems.length - 1)

  // Scroll active item into view during keyboard navigation
  useEffect(() => {
    if (!open || !listRef.current) return
    const activeEl = listRef.current.children[safeActiveIndex] as HTMLElement | undefined
    if (activeEl) {
      activeEl.scrollIntoView?.({ block: 'nearest' })
    }
  }, [safeActiveIndex, open])

  // Global shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const handleSelectItem = useCallback(
    (item: SearchableNavigationItem) => {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
      navigate(item.path)
      onNavigate?.()
    },
    [navigate, onNavigate],
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filteredItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredItems.length)
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (filteredItems.length > 0) {
        setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const target = filteredItems[safeActiveIndex] ?? filteredItems[0]
      if (target) {
        handleSelectItem(target)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setActiveIndex(0)
    if (!open) setOpen(true)
  }

  const popoverContent = (
    <div className={styles.popupContainer}>
      <div className={styles.resultsHeader}>
        <Typography.Text type="secondary" className={styles.headerLabel}>
          {query.trim() ? t('shell.searchResults') : t('shell.quickNav')}
        </Typography.Text>
        <span className={styles.resultCount}>{filteredItems.length}</span>
      </div>

      <div ref={listRef} className={styles.resultsList} role="listbox">
        {filteredItems.length === 0 ? (
          <div className={styles.emptyState}>
            <SearchOutlined className={styles.emptyIcon} />
            <span>{t('shell.noSearchResults')}</span>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isSelected = index === safeActiveIndex
            return (
              <button
                key={item.key}
                type="button"
                role="option"
                tabIndex={0}
                aria-selected={isSelected}
                className={`${styles.resultItem} ${isSelected ? styles.resultItemActive : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectItem(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelectItem(item)
                  }
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className={styles.itemIcon}>{item.icon ?? <CompassOutlined />}</span>
                <span className={styles.itemBody}>
                  <span className={styles.itemTitleRow}>
                    <span className={styles.itemTitle}>{t(item.labelKey)}</span>
                    <span className={styles.categoryBadge}>{t(item.categoryKey)}</span>
                  </span>
                  <span className={styles.itemPath}>{item.path}</span>
                </span>
                {isSelected && <EnterOutlined className={styles.enterIcon} />}
              </button>
            )
          })
        )}
      </div>

      <div className={styles.resultsFooter}>
        <span className={styles.shortcutHint}>
          <kbd className={styles.miniKbd}>↑</kbd>
          <kbd className={styles.miniKbd}>↓</kbd>
          <span>{t('shell.navigationHintNavigate')}</span>
        </span>
        <span className={styles.shortcutHint}>
          <kbd className={styles.miniKbd}>↵</kbd>
          <span>{t('shell.navigationHintSelect')}</span>
        </span>
        <span className={styles.shortcutHint}>
          <kbd className={styles.miniKbd}>esc</kbd>
          <span>{t('shell.navigationHintClose')}</span>
        </span>
      </div>
    </div>
  )

  return (
    <Popover
      content={popoverContent}
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      placement="bottomLeft"
      overlayClassName={styles.searchPopover}
      arrow={false}
      autoAdjustOverflow
    >
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        allowClear
        prefix={<SearchOutlined className={styles.searchPrefix} />}
        suffix={
          query ? null : (
            <span className={styles.shortcutBadge}>
              <kbd className={styles.kbd}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </span>
          )
        }
        placeholder={t('shell.searchPlaceholder')}
        className={[styles.navSearch, className].filter(Boolean).join(' ')}
        aria-label={t('shell.searchPlaceholder')}
      />
    </Popover>
  )
}
