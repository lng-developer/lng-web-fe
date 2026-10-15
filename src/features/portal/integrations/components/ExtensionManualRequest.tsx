import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SyncOutlined } from '@ant-design/icons'
import { Button, InputNumber, Popover, Select, Typography } from 'antd'
import dayjs from 'dayjs'

import { DateRangePicker } from '@/shared/ui'

import type { ExtensionImportDays, ExtensionManagementAgent } from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'
import type { CreateExtensionCommandInput } from './extensionHelpers'

const commandTypes = {
  ORDERS: 'IMPORT_NEW_ORDERS',
  TRANSACTIONS: 'IMPORT_TRANSACTIONS',
  SETTLEMENTS: 'IMPORT_SETTLEMENTS',
  ADS: 'IMPORT_ADS_SPEND',
} as const

export function ExtensionManualRequest({
  agent,
  source,
  loading,
  onRequest,
}: {
  readonly agent: ExtensionManagementAgent
  readonly source: keyof typeof commandTypes
  readonly loading: boolean
  readonly onRequest: (input: CreateExtensionCommandInput) => void
}) {
  const { t } = useTranslation()
  const [numDays, setNumDays] = useState<ExtensionImportDays>(1)
  const [maxOrders, setMaxOrders] = useState<number | null>(1)
  const etsy = agent.provider === 'ETSY'
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const key = 'portal.integrations.extension.manualRequests'
  const label = t(`${key}.${source}`)
  const from = dates.dateFrom ? dayjs(dates.dateFrom).startOf('day') : null
  const to = dates.dateTo ? dayjs(dates.dateTo).startOf('day') : null
  const validDates =
    from?.isValid() && to?.isValid() && !to.isBefore(from) && to.diff(from, 'day') <= 119
  const validCount =
    maxOrders !== null && Number.isInteger(maxOrders) && maxOrders >= 1 && maxOrders <= 200
  if (etsy && source !== 'ORDERS') return null

  return (
    <Popover
      trigger="click"
      title={t(`${key}.title`, { label })}
      content={
        <div className={styles.commandPopover}>
          <Typography.Text>
            {t(
              `${key}.${etsy ? 'etsyHint' : source === 'ORDERS' ? 'ordersHint' : source === 'SETTLEMENTS' ? 'settlementHint' : 'dateHint'}`,
            )}
          </Typography.Text>
          {etsy ? (
            <InputNumber
              aria-label={t(`${key}.maxOrders`)}
              min={1}
              max={200}
              value={maxOrders}
              onChange={setMaxOrders}
            />
          ) : source === 'ORDERS' ? (
            <Select
              aria-label={t('portal.integrations.extension.orderHistoryWindow')}
              value={numDays}
              onChange={setNumDays}
              options={([1, 2, 7, 15, 30] as const).map((value) => ({
                value,
                label: t(`${key}.days`, { count: value }),
              }))}
            />
          ) : (
            <DateRangePicker
              aria-label={t(`${key}.dateRange`, { label })}
              value={dates}
              onChange={setDates}
            />
          )}
          <Button
            type="primary"
            loading={loading}
            disabled={
              agent.status !== 'ONLINE' ||
              loading ||
              (etsy && !validCount) ||
              (source !== 'ORDERS' && !validDates)
            }
            onClick={() =>
              onRequest({
                agentId: agent.id,
                type: commandTypes[source],
                ...(etsy ? { maxOrders: maxOrders! } : source === 'ORDERS' ? { numDays } : dates),
              })
            }
          >
            {t(`${key}.queue`)}
          </Button>
        </div>
      }
    >
      <Button
        aria-label={t(`${key}.requestLabel`, { label: label.toLowerCase() })}
        disabled={agent.status !== 'ONLINE' || loading}
        size="small"
        type="primary"
        icon={<SyncOutlined />}
      >
        {t(`${key}.requestNow`)}
      </Button>
    </Popover>
  )
}
