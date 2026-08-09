import { AlertOutlined, CheckCircleOutlined, StarOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Space, Spin, Tag, Tooltip, Typography } from 'antd'

import { useFeedbackToast } from '@/shared/ui'

import { type Listing, listListingVariants, requestListingVariantPsd } from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import styles from './ListingVariantCard.module.scss'

interface ListingVariantCardProps {
  listing: Listing
  canWrite: boolean
}

export function ListingVariantCard({ listing, canWrite }: ListingVariantCardProps) {
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const variants = useQuery({
    queryKey: catalogKeys.variants(listing.id),
    queryFn: () => listListingVariants(listing.id),
  })

  const requestPsd = useMutation({
    mutationFn: (variantId: string) => requestListingVariantPsd(listing.id, variantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogKeys.variants(listing.id) })
      toast('success', 'PSD task created successfully')
    },
    onError: (err) => toast('error', err instanceof Error ? err.message : 'Could not request PSD'),
  })

  if (variants.isLoading) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
        <Spin />
      </div>
    )
  }

  const data = variants.data ?? []

  if (!data.length) {
    return (
      <div
        style={{
          padding: '16px',
          color: '#aaa',
          textAlign: 'center',
          border: '1.5px dashed #e8e8e8',
          borderRadius: 8,
        }}
      >
        <Typography.Text type="secondary">No variants configured yet</Typography.Text>
      </div>
    )
  }

  return (
    <div className={styles.variantList}>
      {data.map((variant) => {
        const isDefault = listing.defaultVariantId === variant.id
        const psdMissing = variant.psdReadiness.status === 'MISSING'
        const psdPresent = variant.psdReadiness.status === 'PRESENT'

        return (
          <div
            key={variant.id}
            className={`${styles.variantItem} ${psdMissing ? styles.psdAlert : ''}`}
          >
            <div className={styles.variantHeader}>
              <Space size={6} wrap>
                <Typography.Text strong>{variant.productTypeGroup.name}</Typography.Text>
                <Tag style={{ margin: 0 }}>{variant.productTypeGroup.code}</Tag>
                {isDefault && (
                  <Tooltip title="This is the default variant used for production">
                    <Tag icon={<StarOutlined />} color="blue" style={{ margin: 0 }}>
                      Default
                    </Tag>
                  </Tooltip>
                )}
                <Tag
                  color={variant.status === 'ACTIVE' ? 'success' : 'default'}
                  style={{ margin: 0 }}
                >
                  {variant.status}
                </Tag>
              </Space>
            </div>

            <div className={styles.variantMeta}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Template: {variant.internalTemplate?.name ?? <em>Not configured</em>}
              </Typography.Text>
            </div>

            <div className={styles.psdRow}>
              {psdPresent && (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  PSD Ready
                </Tag>
              )}
              {variant.psdReadiness.status === 'NOT_REQUIRED' && (
                <Tag color="default">PSD Not Required</Tag>
              )}
              {psdMissing && (
                <Space size={8}>
                  <Tag icon={<AlertOutlined />} color="warning">
                    PSD Missing
                  </Tag>
                  {canWrite && (
                    <Button
                      size="small"
                      type="primary"
                      danger
                      loading={requestPsd.isPending && requestPsd.variables === variant.id}
                      onClick={() => requestPsd.mutate(variant.id)}
                    >
                      Request PSD
                    </Button>
                  )}
                </Space>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
