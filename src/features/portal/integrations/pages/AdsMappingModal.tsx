import { Form, Modal, Select } from 'antd'

import type {
  AdsShopMappingInput,
  AdsUnassignedRow,
} from '@/features/portal/finance/api/financeApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'

interface AdsMappingModalProps {
  readonly form: ReturnType<
    typeof Form.useForm<{ shopId: string; matchType: 'CAMPAIGN' | 'PORTFOLIO' }>
  >[0]
  readonly onCancel: () => void
  readonly onSave: (input: AdsShopMappingInput) => void
  readonly row?: AdsUnassignedRow
  readonly saving: boolean
  readonly shops: Shop[]
}

export function AdsMappingModal({
  form,
  onCancel,
  onSave,
  row,
  saving,
  shops,
}: AdsMappingModalProps) {
  return (
    <Modal
      title="Map Amazon Ads row to a shop"
      open={Boolean(row)}
      confirmLoading={saving}
      okText="Save mapping"
      onCancel={onCancel}
      onOk={() => {
        if (!row) return
        form.validateFields().then(({ matchType, shopId }) => {
          const externalId = matchType === 'CAMPAIGN' ? row.campaignId : row.portfolioId
          if (!externalId || !row.advertiserAccountId) return
          onSave({
            advertiserAccountId: row.advertiserAccountId,
            matchType,
            externalId,
            shopId,
            salesChannelCode: row.salesChannelCode ?? undefined,
            marketplaceCode: row.marketplaceCode ?? undefined,
          })
        })
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Match by" name="matchType" rules={[{ required: true }]}>
          <Select
            options={[
              ...(row?.campaignId ? [{ value: 'CAMPAIGN', label: 'Campaign' }] : []),
              ...(row?.portfolioId ? [{ value: 'PORTFOLIO', label: 'Portfolio' }] : []),
            ]}
          />
        </Form.Item>
        <Form.Item
          label="Shop"
          name="shopId"
          rules={[{ required: true, message: 'Select a shop' }]}
        >
          <Select
            options={shops.map((shop) => ({ value: shop.id, label: shop.name }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
