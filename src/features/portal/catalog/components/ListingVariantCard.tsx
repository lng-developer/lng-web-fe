import { useTranslation } from 'react-i18next'
import { AlertOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Space, Spin, Tag, Typography } from 'antd'

import { humanizeCode, useFeedbackToast } from '@/shared/ui'

import { type Listing, listListingVariants, requestListingVariantPsd } from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import styles from './ListingVariantCard.module.scss'

interface ListingVariantCardProps {
  listing: Listing
  canWrite: boolean
}

function psdSourceKey(source?: string | null) {
  if (source === 'LISTING_VARIANT') return 'variant'
  if (source === 'LISTING_DEFAULT') return 'default'
  if (source === 'TEMPLATE') return 'template'
  return 'noSource'
}

export function ListingVariantCard({ listing, canWrite }: ListingVariantCardProps) {
  const { t } = useTranslation()
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
      toast('success', t('portal.catalog.variants.psdTaskCreated'))
    },
    onError: (err) =>
      toast(
        'error',
        err instanceof Error ? err.message : t('portal.catalog.variants.requestPsdFailed'),
      ),
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
      <div className={styles.empty}>
        <Typography.Text type="secondary">{t('portal.catalog.variants.empty')}</Typography.Text>
      </div>
    )
  }

  return (
    <div className={styles.variantList}>
      {data.map((variant) => {
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
                <Tag
                  color={variant.status === 'ACTIVE' ? 'success' : 'default'}
                  style={{ margin: 0 }}
                >
                  {t(`portal.catalog.master.statuses.${variant.status}`, {
                    defaultValue: humanizeCode(variant.status),
                  })}
                </Tag>
              </Space>
            </div>

            <div className={styles.variantMeta}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('portal.catalog.variants.template')}:{' '}
                {variant.internalTemplate?.name ?? (
                  <em>{t('portal.catalog.variants.notConfigured')}</em>
                )}
              </Typography.Text>
            </div>

            <div className={styles.psdRow}>
              {psdPresent && (
                <Space size={6}>
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    {t('portal.catalog.psd.readyTag')}
                  </Tag>
                  <Tag
                    color={variant.psdReadiness.source === 'LISTING_DEFAULT' ? 'blue' : 'default'}
                  >
                    {t(`portal.catalog.psd.${psdSourceKey(variant.psdReadiness.source)}`)}
                  </Tag>
                </Space>
              )}
              {variant.psdReadiness.status === 'NOT_REQUIRED' && (
                <Tag color="default">{t('portal.catalog.psd.notRequired')}</Tag>
              )}
              {psdMissing && (
                <Space size={8}>
                  <Tag icon={<AlertOutlined />} color="warning">
                    {t('portal.catalog.variants.psdMissing')}
                  </Tag>
                  {canWrite && (
                    <Button
                      size="small"
                      type="primary"
                      danger
                      loading={requestPsd.isPending && requestPsd.variables === variant.id}
                      onClick={() => requestPsd.mutate(variant.id)}
                    >
                      {t('portal.catalog.variants.requestPsd')}
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
