import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadOutlined, FileOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { downloadMediaAsset } from '@/shared/media'
import {
  DateRangePicker,
  EmployeeAvatar,
  FilterBar,
  PageHeader,
  SectionCard,
  StatusTag,
  useDebouncedValue,
  ZoomableImage,
} from '@/shared/ui'

import { listDesignAssignees, listPsdFiles, type PsdFileListItem } from '../api/designApi'
import { designKeys } from '../api/designKeys'

const PAGE_SIZE = 20
const tone = (status: string) =>
  status === 'APPROVED'
    ? 'approved'
    : status === 'REJECTED'
      ? 'rejected'
      : status === 'CANCELLED'
        ? 'cancelled'
        : 'processing'

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
        label: value,
      })),
    [],
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
        (value) => ({ value, label: value }),
      ),
    [],
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
            {value}
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
        render: (value) => <StatusTag status={tone(value.status)}>{value.status}</StatusTag>,
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
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeader
        title={t('portal.design.psdFiles', { defaultValue: 'PSD files' })}
        description={t('portal.design.psdFilesDesc', {
          defaultValue: 'Browse PSD references, submissions, and approved files.',
        })}
      />
      <SectionCard>
        <CoreDataTable
          tableLayout="fixed"
          scroll={{ x: 980 }}
          rowKey="rowKey"
          columns={columns}
          dataSource={files.data?.items ?? []}
          loading={files.isLoading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: files.data?.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar label={t('portal.design.psdFilters', { defaultValue: 'PSD file filters' })}>
              <Input.Search
                placeholder={t('portal.design.searchFileOrSku', {
                  defaultValue: 'Search file or SKU',
                })}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={() => setPage(1)}
              />
              <Select
                allowClear
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
                placeholder={t('portal.design.allDesigners', { defaultValue: 'All designers' })}
                value={designerId}
                onChange={(value) => {
                  setDesignerId(value)
                  setPage(1)
                }}
                options={designerOptions}
              />
              <Select
                allowClear
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
                value={dates}
                onChange={(value) => {
                  setDates(value)
                  setPage(1)
                }}
              />
            </FilterBar>
          }
        />
      </SectionCard>
    </Space>
  )
}
