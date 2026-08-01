import { useState } from 'react'
import { DownloadOutlined, FileOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Space, Typography } from 'antd'

import {
  DataTable,
  DateRangePicker,
  FilterBar,
  PageHeader,
  SectionCard,
  StatusTag,
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
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'REFERENCE' | 'SUBMISSION' | 'APPROVED'>()
  const [designerId, setDesignerId] = useState<string>()
  const [taskStatus, setTaskStatus] = useState<string>()
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const params = {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    role,
    designerId,
    taskStatus,
    ...dates,
  }
  const files = useQuery({
    queryKey: designKeys.psdFiles(params),
    queryFn: () => listPsdFiles(params),
  })
  const assignees = useQuery({ queryKey: designKeys.assignees(), queryFn: listDesignAssignees })
  const columns: TableColumnsType<PsdFileListItem> = [
    {
      title: 'File',
      dataIndex: 'asset',
      render: (asset) =>
        asset ? (
          <Space>
            {asset.mimeType?.startsWith('image/') ? (
              <img
                alt={asset.originalFilename ?? 'File'}
                src={asset.downloadUrl ?? undefined}
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
      title: 'Role',
      dataIndex: 'role',
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
      title: 'Listing',
      dataIndex: 'listing',
      render: (value) => (
        <Space direction="vertical" size={0}>
          <strong>{value.code ?? '-'}</strong>
          <Typography.Text type="secondary">{value.title ?? '-'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Task status',
      dataIndex: 'task',
      render: (value) => <StatusTag status={tone(value.status)}>{value.status}</StatusTag>,
    },
    { title: 'Designer', dataIndex: 'designer', render: (value) => value.name ?? 'Unassigned' },
    {
      title: 'Version',
      dataIndex: 'submission',
      render: (value) => (value.version ? `v${value.version}` : '-'),
    },
    {
      title: 'Actions',
      dataIndex: 'asset',
      render: (asset) =>
        asset?.downloadUrl ? (
          <Space size={0}>
            <Button
              type="link"
              href={asset.downloadUrl}
              target="_blank"
              aria-label={`Open ${asset.originalFilename}`}
            >
              Open
            </Button>
            <Button
              type="link"
              icon={<DownloadOutlined />}
              href={asset.downloadUrl}
              download
              aria-label={`Download ${asset.originalFilename}`}
            >
              Download
            </Button>
          </Space>
        ) : (
          'Unavailable'
        ),
    },
  ]
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeader
        title="PSD files"
        description="Browse PSD references, submissions, and approved files."
      />
      <SectionCard>
        <DataTable
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
            <FilterBar label="PSD file filters">
              <Input.Search
                placeholder="Search file, SKU, or title"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={() => setPage(1)}
              />
              <Select
                allowClear
                placeholder="All roles"
                value={role}
                onChange={(value) => {
                  setRole(value)
                  setPage(1)
                }}
                options={['REFERENCE', 'SUBMISSION', 'APPROVED'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <Select
                allowClear
                placeholder="All designers"
                value={designerId}
                onChange={(value) => {
                  setDesignerId(value)
                  setPage(1)
                }}
                options={(assignees.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.fullName ?? item.name ?? item.id,
                }))}
              />
              <Select
                allowClear
                placeholder="All task statuses"
                value={taskStatus}
                onChange={(value) => {
                  setTaskStatus(value)
                  setPage(1)
                }}
                options={[
                  'OPEN',
                  'ASSIGNED',
                  'IN_PROGRESS',
                  'SUBMITTED',
                  'APPROVED',
                  'REJECTED',
                  'CANCELLED',
                ].map((value) => ({ value, label: value }))}
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
