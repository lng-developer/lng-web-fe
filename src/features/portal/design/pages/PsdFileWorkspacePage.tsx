import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadOutlined, FileOutlined, ReloadOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Space, Tooltip, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { downloadMediaAsset } from '@/shared/media'
import {
  DateRangePicker,
  type DateRangeValue,
  EmployeeAvatar,
  StatusTag,
  useDebouncedValue,
  ZoomableImage,
} from '@/shared/ui'

import { listDesignAssignees, listPsdFiles, type PsdFileListItem } from '../api/designApi'
import { designKeys } from '../api/designKeys'
import styles from './PsdFileWorkspacePage.module.scss'

const PAGE_SIZE = DEFAULT_PAGE_SIZE
const tone = (status: string) =>
  status === 'APPROVED'
    ? 'approved'
    : status === 'REJECTED'
      ? 'rejected'
      : status === 'CANCELLED'
        ? 'cancelled'
        : 'processing'

function formatEnumLabel(val?: string | null): string {
  if (!val) return ''
  return val
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function PsdFileWorkspacePage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)
  const [role, setRole] = useState<'REFERENCE' | 'SUBMISSION' | 'APPROVED'>()
  const [designerId, setDesignerId] = useState<string>()
  const [taskStatus, setTaskStatus] = useState<string>()
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      role,
      designerId,
      taskStatus,
      ...dates,
    }),
    [page, debouncedSearch, role, designerId, taskStatus, dates],
  )

  const files = useQuery({
    queryKey: designKeys.psdFiles(params),
    queryFn: () => listPsdFiles(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const assignees = useQuery({
    queryKey: designKeys.assignees(),
    queryFn: listDesignAssignees,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const roleOptions = useMemo(
    () =>
      ['REFERENCE', 'SUBMISSION', 'APPROVED'].map((value) => ({
        value,
        label: t(`portal.design.psdRoles.${value}`, { defaultValue: formatEnumLabel(value) }),
      })),
    [t],
  )

  const designerOptions = useMemo(
    () =>
      (assignees.data ?? []).map((item) => ({
        value: item.id,
        label: item.fullName ?? item.name ?? item.id,
      })),
    [assignees.data],
  )

  const taskStatusOptions = useMemo(
    () =>
      ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].map(
        (value) => ({
          value,
          label: t(`portal.design.statuses.${value}`, { defaultValue: formatEnumLabel(value) }),
        }),
      ),
    [t],
  )

  const columns: TableColumnsType<PsdFileListItem> = useMemo(
    () => [
      {
        title: t('portal.design.psdFile', { defaultValue: 'File' }),
        dataIndex: 'asset',
        render: (asset) =>
          asset ? (
            <Space>
              {asset.mimeType?.startsWith('image/') ? (
                <ZoomableImage
                  alt={asset.originalFilename ?? 'File'}
                  downloadUrl={asset.downloadUrl}
                  width={32}
                  height={32}
                />
              ) : (
                <FileOutlined />
              )}
              <Typography.Text>{asset.originalFilename ?? 'Unavailable'}</Typography.Text>
            </Space>
          ) : (
            'Unavailable'
          ),
      },
      {
        title: t('portal.design.psdRole', { defaultValue: 'Role' }),
        dataIndex: 'role',
        width: 120,
        render: (value) => (
          <StatusTag
            status={
              value === 'APPROVED' ? 'approved' : value === 'SUBMISSION' ? 'ready' : 'processing'
            }
          >
            {t(`portal.design.psdRoles.${value}`, { defaultValue: formatEnumLabel(value) })}
          </StatusTag>
        ),
      },
      {
        title: '',
        dataIndex: 'listing',
        width: 140,
        render: (value) => <strong>{value.code ?? '-'}</strong>,
      },
      {
        title: t('portal.design.taskStatus', { defaultValue: 'Task status' }),
        dataIndex: 'task',
        width: 140,
        render: (value) => (
          <StatusTag status={tone(value.status)}>
            {t(`portal.design.statuses.${value.status}`, {
              defaultValue: formatEnumLabel(value.status),
            })}
          </StatusTag>
        ),
      },
      {
        title: t('portal.design.designer', { defaultValue: 'Designer' }),
        dataIndex: 'designer',
        width: 180,
        render: (value) => {
          const assignee = (assignees.data ?? []).find(({ id }) => id === value.id)
          const name = value.name ?? assignee?.fullName ?? assignee?.name ?? 'Unassigned'
          return (
            <Space size="small">
              <EmployeeAvatar name={name} avatarUrl={assignee?.avatarUrl} />
              <span>{name}</span>
            </Space>
          )
        },
      },
      {
        title: t('portal.design.version', { defaultValue: 'Version' }),
        dataIndex: 'submission',
        width: 88,
        render: (value) => (value.version ? `v${value.version}` : '-'),
      },
      {
        title: t('portal.design.actions', { defaultValue: 'Actions' }),
        dataIndex: 'asset',
        width: 144,
        render: (asset) =>
          asset?.downloadUrl ? (
            <Space size={0}>
              <Button
                type="link"
                onClick={() =>
                  void downloadMediaAsset(asset.downloadUrl!, asset.originalFilename ?? undefined)
                }
                aria-label={`Open ${asset.originalFilename}`}
              >
                Open
              </Button>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() =>
                  void downloadMediaAsset(asset.downloadUrl!, asset.originalFilename ?? undefined)
                }
                aria-label={`Download ${asset.originalFilename}`}
              >
                Download
              </Button>
            </Space>
          ) : (
            'Unavailable'
          ),
      },
    ],
    [assignees.data, t],
  )

  return (
    <section className={styles.page}>
      <div className={styles.filterBar}>
        <Input
          allowClear
          className={styles.search}
          placeholder={t('portal.design.searchFileOrSku', {
            defaultValue: 'Search file or SKU...',
          })}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        <Select
          allowClear
          className={styles.roleFilter}
          placeholder={t('portal.design.allRoles', { defaultValue: 'All roles' })}
          value={role}
          onChange={(value) => {
            setRole(value)
            setPage(1)
          }}
          options={roleOptions}
        />
        <Select
          allowClear
          className={styles.designerFilter}
          placeholder={t('portal.design.allDesigners', { defaultValue: 'All designers' })}
          value={designerId}
          onChange={(value) => {
            setDesignerId(value)
            setPage(1)
          }}
          options={designerOptions}
          showSearch
          optionFilterProp="label"
        />
        <Select
          allowClear
          className={styles.statusFilter}
          placeholder={t('portal.design.allTaskStatuses', {
            defaultValue: 'All task statuses',
          })}
          value={taskStatus}
          onChange={(value) => {
            setTaskStatus(value)
            setPage(1)
          }}
          options={taskStatusOptions}
        />
        <DateRangePicker
          allowClear
          className={styles.dateFilter}
          value={dates}
          onChange={(value: DateRangeValue) => {
            setDates(value)
            setPage(1)
          }}
        />
        <Tooltip title={t('common.refresh', { defaultValue: 'Refresh' })}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void files.refetch()}
            loading={files.isFetching}
          />
        </Tooltip>
      </div>

      <div className={styles.tableArea}>
        <CoreDataTable
          rowKey="rowKey"
          columns={columns}
          dataSource={files.data?.items ?? []}
          loading={files.isLoading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: files.data?.total,
            showSizeChanger: false,
            onChange: (p) => setPage(p),
          }}
          scroll={{ x: 1000 }}
        />
      </div>
    </section>
  )
}
