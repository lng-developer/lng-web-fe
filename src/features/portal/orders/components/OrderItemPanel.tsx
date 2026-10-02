import { memo, type MouseEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EllipsisOutlined,
  ExportOutlined,
  HistoryOutlined,
  LinkOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { Button, Descriptions, Dropdown, type MenuProps, Space, Tooltip, Typography } from 'antd'

import { AuthenticatedMediaImage, downloadMediaAsset } from '@/shared/media'
import { CopyableAsin, CopyableSku, StatusTag } from '@/shared/ui'

import type { OrderWorkbenchItem } from '../api/orderApi'
import { FulfillmentInlineEditor } from '../pages/FulfillmentInlineEditor'
import { formatMinorMoney, formatPsdStatusLabel, orderStatusTone } from '../pages/orderPresentation'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import { OrderItemNoteEditor } from './OrderItemNoteEditor'
import {
  displayValue,
  getAmazonProductUrl,
  type OrderAction,
  type OrderItemConfirmation,
} from './orderTypes'

type MenuClickInfo = Parameters<NonNullable<MenuProps['onClick']>>[0]

type OrderItemPanelProps = {
  readonly item: OrderWorkbenchItem
  readonly canWrite: boolean
  readonly canOperate: boolean
  readonly pending: boolean
  readonly onAction: (action: OrderAction) => void
  readonly onConfirm: (
    target: EventTarget | null,
    kind: OrderItemConfirmation['kind'],
    item: OrderWorkbenchItem,
  ) => void
  readonly onHistory: (event: MouseEvent<HTMLElement>, itemId: string) => void
  readonly onOpenImageViewer: (
    event: MouseEvent<HTMLElement>,
    url?: string | null,
    images?: string[],
  ) => void
}

export const OrderItemPanel = memo(function OrderItemPanel({
  item,
  canWrite,
  canOperate,
  pending,
  onAction,
  onConfirm,
  onHistory,
  onOpenImageViewer,
}: OrderItemPanelProps) {
  const { t } = useTranslation()
  const preview = item.customization?.previewImageUrl
  const customizationImage = item.customization?.inputs.find(
    (input) => input.assetDownloadUrl,
  )?.assetDownloadUrl
  const psdSource = item.mapping?.listingVariant || item.mapping?.listingPsd
  const psdStatus = psdSource?.psdReadiness?.status
  const psdDownloadUrl = psdSource?.psdTemplate?.downloadUrl
  const terminal = ['CANCELLED', 'FAILED', 'REFUNDED', 'SHIPPED'].includes(item.item.status ?? '')
  const canRecheckProduction =
    item.workflow.nextActions.some((action) => action.startsWith('RECHECK_')) ||
    item.mapping?.status === 'BLOCKED' ||
    (item.production?.status === 'BLOCKED' && psdStatus === 'PRESENT')

  const relatedImages = useMemo(
    () =>
      Array.from(
        new Set([
          preview,
          customizationImage,
          ...(item.customization?.inputs ?? []).map((input) => input.assetDownloadUrl),
        ]),
      )
        .filter((image): image is string => Boolean(image))
        .slice(0, 5),
    [preview, customizationImage, item.customization?.inputs],
  )

  const customizationInputs = item.customization?.inputs ?? []
  const [showAllCustomizations, setShowAllCustomizations] = useState(false)
  const visibleCustomizationInputs = showAllCustomizations
    ? customizationInputs
    : customizationInputs.slice(0, 4)
  const hiddenCustomizationCount = customizationInputs.length - visibleCustomizationInputs.length

  const actionMenuItems: NonNullable<MenuProps['items']> = useMemo(
    () => [
      ...(canWrite
        ? [
            {
              key: 'replace',
              icon: <SwapOutlined />,
              label: t('orders.actions.replaceShort'),
              onClick: ({ domEvent }: MenuClickInfo) =>
                onConfirm(domEvent.target, 'replacement', item),
            },
          ]
        : []),
      ...(canOperate && !terminal
        ? [
            {
              key: 'recheck-mapping',
              icon: <ReloadOutlined />,
              label: t('orders.actions.recheckMappingShort'),
              onClick: () => onAction({ kind: 'recheck-mapping', itemId: item.item.id }),
            },
          ]
        : []),
      ...(canOperate && canRecheckProduction
        ? [
            {
              key: 'recheck-production',
              icon: <ReloadOutlined />,
              label: t('orders.actions.recheckProductionShort'),
              onClick: () => onAction({ kind: 'recheck-production', itemId: item.item.id }),
            },
          ]
        : []),
      ...(canOperate && !terminal
        ? [
            {
              key: 'ready',
              icon: <CheckCircleOutlined />,
              label: t('orders.actions.readyShort'),
              onClick: () => onAction({ kind: 'ready', itemId: item.item.id }),
            },
            {
              key: 'cancel',
              danger: true,
              icon: <DeleteOutlined />,
              label: t('orders.actions.cancelShort'),
              onClick: ({ domEvent }: MenuClickInfo) => onConfirm(domEvent.target, 'cancel', item),
            },
          ]
        : []),
    ],
    [canOperate, canRecheckProduction, canWrite, item, onAction, onConfirm, t, terminal],
  )

  const renderAsin = (asin?: string | null) => {
    const productUrl = getAmazonProductUrl(asin)

    return (
      <Space size={4} className={styles.asinWithLink}>
        <CopyableAsin value={asin} />
        {productUrl ? (
          <Tooltip title={t('orders.actions.openProduct', { defaultValue: 'Open product' })}>
            <Button
              type="text"
              size="small"
              className={styles.asinLink}
              icon={<ExportOutlined />}
              href={productUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t('orders.actions.openProduct', { defaultValue: 'Open product' })}
            />
          </Tooltip>
        ) : null}
      </Space>
    )
  }

  return (
    <article className={styles.itemPanel}>
      <section className={styles.assetColumn}>
        <Typography.Text strong>{t('orders.sections.imagePrint')}</Typography.Text>
        <AuthenticatedMediaImage
          width={112}
          height={112}
          downloadUrl={preview || customizationImage || undefined}
          alt={t('orders.fields.image')}
          style={{ cursor: 'zoom-in' }}
          onClick={(event) =>
            onOpenImageViewer(event, preview || customizationImage, relatedImages)
          }
          fallback="/favicon.svg"
        />
        <StatusTag status={orderStatusTone(psdStatus)}>
          PSD {formatPsdStatusLabel(psdStatus, t)}
        </StatusTag>
        {psdDownloadUrl ? (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => void downloadMediaAsset(psdDownloadUrl, 'template.psd')}
          >
            PSD
          </Button>
        ) : null}
      </section>
      <section className={styles.identifierSection}>
        <Typography.Text strong>{t('orders.sections.skuSeller')}</Typography.Text>
        <Descriptions
          size="small"
          column={1}
          colon={false}
          items={[
            { key: 'sku', label: 'SKU', children: <CopyableSku value={item.item.sku} /> },
            { key: 'asin', label: 'ASIN', children: renderAsin(item.item.asin) },
            {
              key: 'seller',
              label: t('orders.fields.seller'),
              children: displayValue(
                [item.seller?.employeeCode, item.seller?.name].filter(Boolean).join(' · '),
              ),
            },
          ]}
        />
        <div className={styles.identifierList}>
          <div>
            <Typography.Text type="secondary">SKU</Typography.Text>
            <CopyableSku value={item.item.sku} />
          </div>
          <div>
            <Typography.Text type="secondary">ASIN</Typography.Text>
            {renderAsin(item.item.asin)}
          </div>
          <div>
            <Typography.Text type="secondary">{t('orders.fields.seller')}</Typography.Text>
            <span className={styles.sellerChip}>
              {displayValue(
                [item.seller?.employeeCode, item.seller?.name].filter(Boolean).join(' · '),
              )}
            </span>
          </div>
          <div>
            <Typography.Text type="secondary">{t('orders.fields.scaleBy')}</Typography.Text>
            <span className={styles.sellerChip}>
              {displayValue(
                [item.production?.scaleBy?.employeeCode, item.production?.scaleBy?.name]
                  .filter(Boolean)
                  .join(' · '),
              )}
            </span>
          </div>
        </div>
      </section>
      <section>
        <Space className={styles.customizationHeader} size="small" wrap>
          <Typography.Text strong>{t('orders.sections.customization')}</Typography.Text>
          {canOperate && item.customization?.sourceCustomizationUrl ? (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              href={item.customization.sourceCustomizationUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('orders.actions.downloadAmazonCustomization')}
            </Button>
          ) : null}
          {canOperate && item.customization?.downloadedZip?.status === 'FAILED' ? (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={pending}
              onClick={() => onAction({ kind: 'retry-customization-assets', itemId: item.item.id })}
            >
              Retry Amazon data
            </Button>
          ) : null}
        </Space>
        <div className={styles.inputList}>
          {visibleCustomizationInputs.map((input, index) => (
            <div key={`${input.label}-${index}`}>
              <Typography.Text type="secondary">{input.label || input.type}: </Typography.Text>
              {input.assetDownloadUrl ? (
                <div className={styles.buyerImage}>
                  <AuthenticatedMediaImage
                    width={72}
                    height={72}
                    downloadUrl={input.assetDownloadUrl}
                    alt={input.label || t('orders.fields.image')}
                    fallback="/favicon.svg"
                    style={{ cursor: 'zoom-in' }}
                    onClick={(event) =>
                      onOpenImageViewer(event, input.assetDownloadUrl, relatedImages)
                    }
                  />
                  <Button
                    size="small"
                    type="link"
                    icon={<LinkOutlined />}
                    onClick={(event) =>
                      onOpenImageViewer(event, input.assetDownloadUrl, relatedImages)
                    }
                  >
                    {t('orders.fields.image')}
                  </Button>
                </div>
              ) : (
                <Typography.Text>{displayValue(input.value)}</Typography.Text>
              )}
            </div>
          ))}
          {!customizationInputs.length ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : null}
        </div>
        {customizationInputs.length > 4 ? (
          <Button
            size="small"
            type="link"
            onClick={() => setShowAllCustomizations((current) => !current)}
          >
            {showAllCustomizations
              ? t('orders.actions.showLessCustomization')
              : t('orders.actions.showMoreCustomization', { count: hiddenCustomizationCount })}
          </Button>
        ) : null}
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.quantityCost')}</Typography.Text>
        <Descriptions
          size="small"
          column={1}
          colon={false}
          items={[
            { key: 'qty', label: t('orders.fields.quantity'), children: item.item.quantity },
            {
              key: 'base',
              label: t('orders.fields.totalCost'),
              children: formatMinorMoney(
                item.pricing.totalCostAmount ?? item.pricing.baseCostAmount,
                item.pricing.currency ?? 'USD',
              ),
            },
          ]}
        />
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.fulfillment')}</Typography.Text>
        <FulfillmentInlineEditor item={item} canWrite={canOperate} />
      </section>
      <section>
        <Typography.Text strong>{t('orders.sections.trackingState')}</Typography.Text>
        <div className={styles.trackingRow}>
          <Space size={4}>
            <Typography.Text type="secondary">{t('orders.fields.tracking')}</Typography.Text>
            <Typography.Text type={item.tracking?.trackingNumber ? undefined : 'secondary'}>
              {item.tracking?.trackingNumber || t('orders.fields.notSet')}
            </Typography.Text>
            <Tooltip title={t('orders.actions.viewHistory')}>
              <Button
                type="text"
                size="small"
                aria-label={t('orders.actions.viewHistory')}
                icon={<HistoryOutlined />}
                onClick={(event) => onHistory(event, item.item.id)}
              />
            </Tooltip>
          </Space>
        </div>
        <OrderItemNoteEditor
          key={`${item.item.id}:${item.item.csNote ?? ''}`}
          canWrite={canOperate}
          initialNote={item.item.csNote ?? ''}
          pending={pending}
          onSave={(note) => onAction({ kind: 'note', itemId: item.item.id, note })}
        />
      </section>
      <section className={styles.itemActions}>
        {actionMenuItems.length ? (
          <Dropdown menu={{ items: actionMenuItems }} placement="bottomRight" trigger={['click']}>
            <Button type="text" aria-label={t('orders.actions.more')} icon={<EllipsisOutlined />} />
          </Dropdown>
        ) : null}
      </section>
    </article>
  )
})

export default OrderItemPanel
