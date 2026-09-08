import { useTranslation } from 'react-i18next'
import { ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { SectionCard, StatusTag, useFeedbackToast } from '@/shared/ui'

import { type ImportBatch, listImportBatches, reprocessImportBatch } from '../api/financeApi'

const statusTone = (status: string) => {
  if (status === 'COMPLETED') return 'operational' as const
  if (status === 'QUEUED' || status === 'PROCESSING') return 'processing' as const
  if (status === 'PARTIAL_FAILED') return 'warning' as const
  return 'critical' as const
}

const shortHash = (hash?: string | null) => (hash ? `${hash.slice(0, 12)}…` : '—')

export function FinanceImportHistory({ canReprocess }: { readonly canReprocess: boolean }) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const toast = useFeedbackToast()
  const imports = useQuery({
    queryKey: ['finance', 'import-batches'],
    queryFn: () => listImportBatches({ page: 1, limit: 20 }),
    retry: false,
  })
  const reprocess = useMutation({
    mutationFn: reprocessImportBatch,
    onSuccess: async () => {
      toast('success', t('finance.feedback.reprocessed'))
      await client.invalidateQueries({ queryKey: ['finance', 'import-batches'] })
    },
    onError: (error: Error) => toast('error', t('finance.feedback.failed'), error.message),
  })
  const columns: TableColumnsType<ImportBatch> = [
    {
      title: t('finance.imports.source'),
      width: 135,
      render: (_, row) => <Typography.Text>{row.sourceType}</Typography.Text>,
    },
    {
      title: t('finance.imports.file'),
      width: 230,
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text ellipsis>{row.originalFilename}</Typography.Text>
          <Typography.Text type="secondary" aria-label={t('finance.imports.hash')}>
            {shortHash(row.contentHash)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: t('finance.imports.quality'),
      width: 110,
      align: 'right',
      render: (_, row) => `${row.validRows} / ${row.processedRows}`,
    },
    {
      title: t('finance.columns.status'),
      width: 150,
      render: (_, row) => <StatusTag status={statusTone(row.status)}>{row.status}</StatusTag>,
    },
    {
      title: t('finance.imports.reason'),
      width: 240,
      render: (_, row) => row.errors[0]?.message || '—',
    },
    {
      title: t('finance.imports.importedAt'),
      width: 175,
      render: (_, row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'),
    },
    ...(canReprocess
      ? [{
          title: t('finance.imports.actions'),
          width: 130,
          render: (_: unknown, row: ImportBatch) => (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={reprocess.isPending && reprocess.variables === row.id}
              onClick={() => reprocess.mutate(row.id)}
            >
              {t('finance.actions.reprocess')}
            </Button>
          ),
        }]
      : []),
  ]

  return (
    <SectionCard title={t('finance.imports.title')}>
      <CoreDataTable
        rowKey="id"
        columns={columns}
        dataSource={imports.data?.items}
        loading={imports.isLoading}
        pagination={false}
        scroll={{ x: 1160 }}
      />
    </SectionCard>
  )
}
