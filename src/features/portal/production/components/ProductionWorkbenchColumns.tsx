import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TableColumnsType } from 'antd'
import { Button, Space, Tag } from 'antd'

import {
  CopyableOrderId,
  EmployeeIdentity,
  FormattedDateTime,
  humanizeCode,
  StatusTag,
} from '@/shared/ui'
import type { ProductionTask } from '../api/productionApi'

export type ProductionTab =
  | 'all'
  | 'scale'
  | 'unassigned'
  | 'need_scale'
  | 'qc_rejected'
  | 'unclassified'
  | 'qc_pending'
  | 'qc'
  | 'ready'
  | 'sent'
  | 'blocked'
  | 'cancelled'

export type ViewMode = 'scale' | 'qc' | 'general'

export function tone(status: string) {
  if (['PASSED', 'SENT_TO_VENDOR'].includes(status)) return 'operational'
  if (['READY_TO_SEND_VENDOR'].includes(status)) return 'ready'
  if (['QC_PENDING', 'PENDING', 'NEED_SCALE'].includes(status)) return 'processing'
  if (['QC_REJECTED', 'REJECTED', 'BLOCKED', 'CANCELLED'].includes(status)) return 'critical'
  return 'pending'
}

export interface UseProductionTableColumnsOptions {
  tab: ProductionTab
  viewMode: ViewMode
  allowed: Set<string>
  claimTask: {
    isPending: boolean
    variables?: unknown
    mutate: (taskId: string) => void
  }
}

export function useProductionTableColumns({
  tab,
  viewMode,
  allowed,
  claimTask,
}: UseProductionTableColumnsOptions): TableColumnsType<ProductionTask> {
  const { t } = useTranslation()

  return useMemo<TableColumnsType<ProductionTask>>(
    () => [
      {
        title: t('portal.production.columns.order'),
        width: 196,
        render: (_, row) => {
          const siblingCount =
            (row as unknown as { orderTasks?: ProductionTask[] }).orderTasks?.length || 1
          return (
            <Space size={6} wrap={false} align="center">
              <CopyableOrderId value={row.orderItem?.externalOrderId} />
              {siblingCount > 1 ? (
                <Tag color="blue" style={{ marginInlineEnd: 0, fontWeight: 500 }}>
                  {siblingCount} items
                </Tag>
              ) : null}
            </Space>
          )
        },
      },
      {
        title: t('taskQueue.shipBy'),
        width: 170,
        render: (_, row) => {
          const active = !['SENT_TO_VENDOR', 'CANCELLED'].includes(row.status)
          const overdue = active && row.shipByDate && dayjs(row.shipByDate).isBefore(dayjs())
          const age = Math.max(0, dayjs().diff(dayjs(row.orderDate || row.createdAt), 'day'))
          return (
            <Space orientation="vertical" size={2}>
              <FormattedDateTime value={row.shipByDate} />
              {overdue ? <Tag color="red">{t('taskQueue.overdue')}</Tag> : null}
              {active && (row.orderDate || row.createdAt) ? (
                <span>{t('taskQueue.age', { days: age })}</span>
              ) : null}
            </Space>
          )
        },
      },
      {
        title: t('portal.production.columns.shop'),
        width: 140,
        render: (_, row) => row.shop?.name || '-',
      },
      {
        title: t('portal.production.columns.seller', { defaultValue: 'Seller' }),
        width: 170,
        render: (_, row) => {
          if (!row.seller?.name && !row.seller?.employeeCode) return '-'
          return (
            <EmployeeIdentity
              size="small"
              mode="auto"
              name={row.seller.name}
              employeeCode={row.seller.employeeCode}
              avatarUrl={row.seller.avatarUrl}
            />
          )
        },
      },
      {
        title: t('common.channel', { defaultValue: 'Channel' }),
        width: 100,
        align: 'center',
        render: (_, row) => {
          const channel = row.orderItem?.salesChannelCode
          return channel ? (
            <Tag color={channel === 'AMAZON' ? 'orange' : 'volcano'}>{channel}</Tag>
          ) : (
            '-'
          )
        },
      },
      {
        title: t('portal.production.designType', { defaultValue: 'Design Type' }),
        width: 120,
        align: 'center',
        render: (_, row) => {
          const allTasks = (row as unknown as { orderTasks?: ProductionTask[] }).orderTasks || [row]
          const types = Array.from(new Set(allTasks.map((item) => item.designType).filter(Boolean)))
          if (!types.length) return '-'
          return (
            <Space size={4} wrap>
              {types.map((dt) => (
                <Tag key={dt} color="magenta">
                  {humanizeCode(dt!)}
                </Tag>
              ))}
            </Space>
          )
        },
      },
      {
        title: t('portal.production.columns.scaleDifficulty'),
        width: 96,
        render: (_, row) => {
          const allTasks = (row as unknown as { orderTasks?: ProductionTask[] }).orderTasks || [row]
          const hasHard = allTasks.some(
            (item) =>
              (item.scaleContext?.use?.listing?.scaleDifficulty?.level || 'NORMAL') !== 'NORMAL',
          )
          const level = hasHard
            ? 'HARD'
            : row.scaleContext?.use?.listing?.scaleDifficulty?.level || 'NORMAL'
          return (
            <StatusTag status={level === 'NORMAL' ? 'pending' : 'critical'}>
              {t(`portal.production.scaleDifficulties.${level}`, { defaultValue: level })}
            </StatusTag>
          )
        },
      },
      {
        title: t('portal.production.assignedTo'),
        width: 138,
        render: (_, row) => {
          const allTasks = (row as unknown as { orderTasks?: ProductionTask[] }).orderTasks || [row]
          const designers = allTasks
            .map((item) => item.assignedDesigner)
            .filter((d): d is NonNullable<typeof d> => Boolean(d?.fullName || d?.employeeCode))
            .filter((d, i, arr) => arr.findIndex((x) => x.employeeCode === d.employeeCode) === i)

          if (designers.length > 0) {
            return (
              <Space direction="vertical" size={2}>
                {designers.map((designer, idx) => (
                  <EmployeeIdentity
                    key={designer.employeeCode || idx}
                    size="small"
                    mode="code"
                    name={designer.fullName}
                    employeeCode={designer.employeeCode}
                  />
                ))}
              </Space>
            )
          }
          if (
            allTasks.some(
              (item) =>
                !item.assignedDesignUserId &&
                (item.status === 'NEED_SCALE' || item.status === 'QC_REJECTED'),
            ) &&
            (allowed.has('DESIGN:WORK') || allowed.has('PRODUCTION:SCALE_WORK'))
          ) {
            const isClaiming =
              claimTask.isPending && allTasks.some((item) => claimTask.variables === item.id)
            return (
              <Button
                size="small"
                type="link"
                style={{ padding: 0, height: 'auto' }}
                loading={isClaiming}
                onClick={() => {
                  allTasks
                    .filter(
                      (item) =>
                        !item.assignedDesignUserId &&
                        (item.status === 'NEED_SCALE' || item.status === 'QC_REJECTED'),
                    )
                    .forEach((item) => claimTask.mutate(item.id))
                }}
              >
                {t('portal.production.claimShort', { defaultValue: 'Nhận việc' })}
              </Button>
            )
          }
          return t('portal.production.unassigned')
        },
      },
      {
        title: t('portal.production.columns.status'),
        width: 126,
        render: (_, row) => {
          const allTasks = (row as unknown as { orderTasks?: ProductionTask[] }).orderTasks || [row]
          const statuses = Array.from(
            new Set(
              allTasks.map((item) =>
                viewMode === 'qc' || tab === 'qc' ? item.qcStatus : item.status,
              ),
            ),
          )
          return (
            <Space size={4} wrap>
              {statuses.map((value) => (
                <StatusTag key={value} status={tone(value)}>
                  {t(`portal.production.statuses.${value}`)}
                </StatusTag>
              ))}
            </Space>
          )
        },
      },
    ],
    [allowed, claimTask, t, tab, viewMode],
  )
}
