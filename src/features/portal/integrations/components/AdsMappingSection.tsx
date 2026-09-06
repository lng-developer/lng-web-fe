import { useState } from 'react'
import { Alert, Button, Form, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { AdsUnassignedRow } from '@/features/portal/finance/api/financeApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { SectionCard } from '@/shared/ui'

import { useAdsUnassignedRows, useSaveAdsMappingMutation } from '../hooks/useFinanceImports'
import { AdsMappingModal } from '../pages/AdsMappingModal'

export interface AdsMappingSectionProps {
  readonly canRead: boolean
  readonly canManage: boolean
  readonly shops: Shop[]
  readonly isActiveTab: boolean
}

export function AdsMappingSection({
  canRead,
  canManage,
  shops,
  isActiveTab,
}: AdsMappingSectionProps) {
  const [selectedAdsUnassignedRow, setSelectedAdsUnassignedRow] = useState<AdsUnassignedRow>()
  const [adsMappingForm] = Form.useForm<{ shopId: string; matchType: 'CAMPAIGN' | 'PORTFOLIO' }>()

  const adsUnassignedRows = useAdsUnassignedRows(isActiveTab && canRead)
  const saveAdsMapping = useSaveAdsMappingMutation(() => {
    setSelectedAdsUnassignedRow(undefined)
    adsMappingForm.resetFields()
  })

  return (
    <SectionCard title="Unassigned Amazon Ads rows">
      <Typography.Paragraph type="secondary">
        Map each campaign or portfolio to an internal shop. The unread Amazon report retries on the
        next scan.
      </Typography.Paragraph>
      {canRead ? (
        <CoreDataTable<AdsUnassignedRow>
          rowKey="id"
          loading={adsUnassignedRows.isLoading}
          dataSource={adsUnassignedRows.data?.items ?? []}
          pagination={false}
          columns={[
            {
              title: 'Report date',
              dataIndex: 'reportDate',
              render: (value: string) => value.slice(0, 10),
            },
            { title: 'Advertiser account', dataIndex: 'advertiserAccountId' },
            {
              title: 'Campaign / portfolio',
              render: (_, row) =>
                row.campaignName || row.campaignId || row.portfolioName || row.portfolioId || '—',
            },
            {
              title: 'Action',
              render: (_, row) => (
                <Button
                  disabled={!canManage}
                  onClick={() => {
                    setSelectedAdsUnassignedRow(row)
                    adsMappingForm.setFieldsValue({
                      matchType: row.campaignId ? 'CAMPAIGN' : 'PORTFOLIO',
                      shopId: undefined,
                    })
                  }}
                >
                  Map shop
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          message="Finance read permission is required to view unassigned Ads rows."
        />
      )}
      {canRead && !canManage ? (
        <Alert
          type="info"
          showIcon
          message="Finance write permission is required to change Ads mappings."
        />
      ) : null}
      <AdsMappingModal
        form={adsMappingForm}
        row={selectedAdsUnassignedRow}
        saving={saveAdsMapping.isPending}
        shops={shops}
        onCancel={() => setSelectedAdsUnassignedRow(undefined)}
        onSave={(input) => saveAdsMapping.mutate(input)}
      />
    </SectionCard>
  )
}
