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
  isScaleTab?: boolean
  csAssignees?: Array<{ id: string; fullName?: string | null; employeeCode?: string | null }>
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
  isScaleTab,
  csAssignees,
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
        title: t('portal.production.requiredSlots'),
        width: 118,
        render: (_, row) => {
          const allTasks = (row as unknown as { orderTasks?: ProductionTask[] }).orderTasks || [row]
          const checks = allTasks.flatMap(
            (item) => item.qcPreviewFileChecks || item.fileChecks || [],
          )
          return (
            checks
              .filter((check) => check.required && check.sourceType !== 'PSD_TEMPLATE')
              .map((check) => check.slotLabel || check.slotKey)
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .join(', ') || '-'
          )
        },
      },
      {
        title: t('portal.production.blockers'),
        width: 180,
        render: (_, row) => {
          const allTasks = (row as unknown as { orderTasks?: ProductionTask[] }).orderTasks || [row]
          const allBlockers = Array.from(new Set(allTasks.flatMap((item) => item.blockers || [])))
          return allBlockers.join(', ') || (row.blockers || []).join(', ') || '-'
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
      ...(viewMode === 'scale' || isScaleTab
        ? [
            {
              title: t('portal.production.columns.csAssignee', { defaultValue: 'CS Phụ trách' }),
              width: 140,
              render: (_: unknown, row: ProductionTask) => {
                const allTasks = (row as unknown as { orderTasks?: ProductionTask[] })
                  .orderTasks || [row]
                const csAssignee = allTasks.map((t) => t.csAssignee).find(Boolean)
                const csId = allTasks.find((t) => t.csAssigneeId)?.csAssigneeId
                const matchedCs = csAssignees?.find((item) => item.id === csId)
                const name =
                  csAssignee?.fullName ||
                  matchedCs?.fullName ||
                  csAssignee?.employeeCode ||
                  matchedCs?.employeeCode

                if (name) {
                  return <Tag color="cyan">{name}</Tag>
                }
                if (csId) {
                  return <Tag color="cyan">{csId}</Tag>
                }
                return (
                  <Tag color="orange">
                    {t('portal.production.csUnassigned', { defaultValue: 'Chưa phân công' })}
                  </Tag>
                )
              },
            },
          ]
        : []),
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
      {
        title: t('portal.production.columns.updated'),
        width: 148,
        render: (_, row) => {
          const allTasks = (row as unknown as { orderTasks?: ProductionTask[] }).orderTasks || [row]
          const latestUpdated = allTasks.reduce(
            (max, item) => (new Date(item.updatedAt) > new Date(max) ? item.updatedAt : max),
            row.updatedAt,
          )
          return <FormattedDateTime value={latestUpdated} />
        },
      },
    ],
    [allowed, claimTask, csAssignees, isScaleTab, t, tab, viewMode],
  )
}
