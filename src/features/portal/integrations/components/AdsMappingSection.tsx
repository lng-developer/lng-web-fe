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
        See why an Ads row is unassigned. Map rows with a campaign or portfolio ID to an internal
        shop; seller attribution needs an employee code in the campaign or portfolio name.
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
            { title: 'Reason', dataIndex: 'reason' },
            {
              title: 'Action',
              render: (_, row) => (
                <Button
                  disabled={!canManage || row.canMap === false}
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
