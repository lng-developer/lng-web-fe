import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClockCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Popover, Segmented, Select, Tag, Typography } from 'antd'

import type { ExtensionScheduleType } from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const HOURLY_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0')
  return { value: `${h}:00`, label: `${h}:00` }
})

export interface IntervalOption {
  value: number
  label: string
}

export interface ExtensionSchedulePopoverProps {
  readonly title: string
  readonly enabled: boolean
  readonly scheduleType?: ExtensionScheduleType
  readonly intervalMinutes?: number
  readonly intervalOptions: IntervalOption[]
  readonly fixedTimes?: string[]
  readonly timezone?: string
  readonly loading?: boolean
  readonly buttonAriaLabel?: string
  readonly iconOnly?: boolean
  readonly onSave: (input: {
    enabled: boolean
    scheduleType: ExtensionScheduleType
    intervalMinutes: number
    fixedTimes: string[]
    timezone: string
  }) => void
}

export function ExtensionSchedulePopover({
  title,
  enabled,
  scheduleType,
  intervalMinutes,
  intervalOptions,
  fixedTimes,
  timezone = 'Asia/Ho_Chi_Minh',
  loading = false,
  buttonAriaLabel,
  iconOnly = false,
  onSave,
}: ExtensionSchedulePopoverProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const initialMode: ExtensionScheduleType =
    scheduleType === 'FIXED_TIMES' || (fixedTimes && fixedTimes.length > 0)
      ? 'FIXED_TIMES'
      : 'INTERVAL'

  const [mode, setMode] = useState<ExtensionScheduleType>(initialMode)
  const [times, setTimes] = useState<string[]>(
    fixedTimes && fixedTimes.length > 0 ? fixedTimes : ['10:00', '17:00'],
  )
  const [interval, setInterval] = useState<number>(
    intervalMinutes ?? intervalOptions[0]?.value ?? 120,
  )

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setMode(
        scheduleType === 'FIXED_TIMES' || (fixedTimes && fixedTimes.length > 0)
          ? 'FIXED_TIMES'
          : 'INTERVAL',
      )
      setTimes(fixedTimes && fixedTimes.length > 0 ? fixedTimes : ['10:00', '17:00'])
      setInterval(intervalMinutes ?? intervalOptions[0]?.value ?? 120)
    }
    setOpen(newOpen)
  }

  const handleSave = () => {
    const validTimes = Array.from(new Set(times.filter((time) => TIME_REGEX.test(time)))).sort()
    const resolvedTimes =
      mode === 'FIXED_TIMES' && validTimes.length === 0 ? ['10:00', '17:00'] : validTimes
    onSave({
      enabled: true,
      scheduleType: mode,
      intervalMinutes: interval,
      fixedTimes: resolvedTimes,
      timezone,
    })
    setOpen(false)
  }

  const handleDisable = () => {
    const validTimes = Array.from(new Set(times.filter((time) => TIME_REGEX.test(time)))).sort()
    onSave({
      enabled: false,
      scheduleType: mode,
      intervalMinutes: interval,
      fixedTimes: validTimes,
      timezone,
    })
    setOpen(false)
  }

  const content = (
    <div className={styles.schedulePopover}>
      <Segmented
        block
        value={mode}
        onChange={(val) => setMode(val as ExtensionScheduleType)}
        options={[
          {
            label: t('portal.integrations.extension.scheduleModeFixed', {
              defaultValue: 'Fixed times',
            }),
            value: 'FIXED_TIMES',
          },
          {
            label: t('portal.integrations.extension.scheduleModeInterval', {
              defaultValue: 'Interval',
            }),
            value: 'INTERVAL',
          },
        ]}
      />

      {mode === 'FIXED_TIMES' ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('portal.integrations.extension.fixedTimesLabel', {
              defaultValue: 'Run times (UTC+7)',
            })}
          </Typography.Text>
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder={t('portal.integrations.extension.fixedTimesPlaceholder', {
              defaultValue: 'Select or enter HH:mm',
            })}
            value={times}
            onChange={(val) => {
              const cleaned = val.map((item) => item.trim())
              setTimes(cleaned)
            }}
            options={HOURLY_OPTIONS}
            tokenSeparators={[',', ' ']}
          />
          <div className={styles.schedulePopoverPresets}>
            <Tag style={{ cursor: 'pointer' }} onClick={() => setTimes(['06:00', '18:00'])}>
              {t('portal.integrations.extension.presetAdsTwiceDaily', {
                defaultValue: '06:00, 18:00',
              })}
            </Tag>
            <Tag style={{ cursor: 'pointer' }} onClick={() => setTimes(['10:00', '17:00'])}>
              {t('portal.integrations.extension.presetCommon', { defaultValue: '10:00, 17:00' })}
            </Tag>
            <Tag
              style={{ cursor: 'pointer' }}
              onClick={() => setTimes(['09:00', '15:00', '21:00'])}
            >
              {t('portal.integrations.extension.presetThreeTimes', {
                defaultValue: '09:00, 15:00, 21:00',
              })}
            </Tag>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {t('portal.integrations.extension.timezoneNote', {
              defaultValue: 'Timezone: Asia/Ho_Chi_Minh (UTC+7)',
            })}
          </Typography.Text>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('portal.integrations.extension.intervalLabel', { defaultValue: 'Repeat every' })}
          </Typography.Text>
          <Select
            style={{ width: '100%' }}
            value={interval}
            onChange={setInterval}
            options={intervalOptions}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
        {enabled ? (
          <Button size="small" danger loading={loading} onClick={handleDisable}>
            {t('portal.integrations.extension.disableSchedule', { defaultValue: 'Disable' })}
          </Button>
        ) : (
          <div />
        )}
        <Button size="small" type="primary" loading={loading} onClick={handleSave}>
          {enabled
            ? t('portal.integrations.extension.saveSchedule', { defaultValue: 'Save schedule' })
            : t('portal.integrations.extension.enableSchedule', { defaultValue: 'Enable & Save' })}
        </Button>
      </div>
    </div>
  )

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      title={title}
      content={content}
      destroyTooltipOnHide
    >
      <Button
        aria-label={
          buttonAriaLabel ??
          t('portal.integrations.extension.configureSchedule', {
            defaultValue: 'Configure schedule',
          })
        }
        icon={iconOnly ? <SettingOutlined /> : <ClockCircleOutlined />}
        size="small"
        title={t('portal.integrations.extension.configure', { defaultValue: 'Configure' })}
      >
        {iconOnly
          ? null
          : t('portal.integrations.extension.configure', { defaultValue: 'Configure' })}
      </Button>
    </Popover>
  )
}
