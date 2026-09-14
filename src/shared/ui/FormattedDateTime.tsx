import { type FC, type ReactNode, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from 'antd'
import 'dayjs/locale/vi'
import dayjs, { type Dayjs } from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import styles from './sharedUi.module.scss'

dayjs.extend(relativeTime)

export interface FormattedDateTimeProps {
  readonly value?: string | number | Date | Dayjs | null
  readonly fallback?: ReactNode
  readonly format?: string
  readonly showRelative?: boolean
  readonly showTooltip?: boolean
  readonly className?: string
}

export const FormattedDateTime: FC<FormattedDateTimeProps> = memo(function FormattedDateTime({
  value,
  fallback = '—',
  format,
  showRelative = true,
  showTooltip = true,
  className,
}) {
  const { i18n } = useTranslation()

  if (!value) return <>{fallback}</>

  const date = dayjs(value)
  if (!date.isValid()) return <>{fallback}</>

  const lang = i18n.language === 'vi' ? 'vi' : 'en'
  const localizedDate = date.locale(lang)

  const dateFormatted = format
    ? localizedDate.format(format)
    : localizedDate.format(lang === 'vi' ? 'DD/MM/YYYY' : 'MMM D, YYYY')

  const relativeFormatted = showRelative ? `(${localizedDate.fromNow()})` : null
  const tooltipTitle = showTooltip ? date.format('DD/MM/YYYY HH:mm') : undefined

  const content = (
    <div className={[styles.dateTime, className].filter(Boolean).join(' ')}>
      <span className={styles.dateTimePrimary}>{dateFormatted}</span>
      {relativeFormatted ? (
        <span className={styles.dateTimeRelative}>{relativeFormatted}</span>
      ) : null}
    </div>
  )

  if (tooltipTitle) {
    return <Tooltip title={tooltipTitle}>{content}</Tooltip>
  }

  return content
})

export default FormattedDateTime
