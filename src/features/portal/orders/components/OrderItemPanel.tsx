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
  RightOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { Button, Descriptions, Dropdown, type MenuProps, Space, Tooltip, Typography } from 'antd'

import { AuthenticatedMediaImage, downloadMediaAsset } from '@/shared/media'
import { StatusTag } from '@/shared/ui'

import type { OrderWorkbenchItem } from '../api/orderApi'
import { FulfillmentInlineEditor } from '../pages/FulfillmentInlineEditor'
import { formatMinorMoney, orderStatusTone } from '../pages/orderPresentation'
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
  readonly mappingRecheckPending: boolean
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
  mappingRecheckPending,
  onAction,
  onConfirm,
  onHistory,
  onOpenImageViewer,
}: OrderItemPanelProps) {
  const { t } = useTranslation()
  const customizationInputs = useMemo(
    () => item.customization?.inputs ?? [],
    [item.customization?.inputs],
  )
  const buyerImageInputs = useMemo(
    () => customizationInputs.filter((input) => input.assetDownloadUrl),
    [customizationInputs],
  )
  const customizationImage = buyerImageInputs[0]?.assetDownloadUrl
  const customizationPreview = item.customization?.previewImageUrl
  const buyerImageUrls = useMemo(
    () => new Set(buyerImageInputs.map((input) => input.assetDownloadUrl)),
    [buyerImageInputs],
  )
  const extractedArtworkImages = useMemo(
    () =>
      (item.customization?.extractedImages ?? []).filter(
        (image) => image.assetDownloadUrl && !buyerImageUrls.has(image.assetDownloadUrl),
      ),
    [item.customization?.extractedImages, buyerImageUrls],
  )
  const artworkImages = useMemo(
    () =>
      extractedArtworkImages.length > 0
        ? extractedArtworkImages
        : customizationPreview && !buyerImageUrls.has(customizationPreview)
          ? [{ assetDownloadUrl: customizationPreview, filename: null }]
          : [],
    [extractedArtworkImages, customizationPreview, buyerImageUrls],
  )
  const mainListingImage = item.listing?.productImageUrl
  const psdSource =
    item.psd?.listingVariant ||
    item.psd?.listingPsd ||
    item.mapping?.listingVariant ||
    item.mapping?.listingPsd
  const psdStatus = psdSource?.psdReadiness?.status
  const psdDownloadUrl = psdSource?.psdTemplate?.downloadUrl
  const terminal = ['CANCELLED', 'FAILED', 'REFUNDED', 'SHIPPED'].includes(item.item.status ?? '')
  const canRecheckProduction =
    item.workflow.nextActions.some(
      (action) => action === 'CREATE_PRODUCTION_TASK' || action.startsWith('RECHECK_'),
    ) ||
    item.mapping?.status === 'BLOCKED' ||
    (item.production?.status === 'BLOCKED' && psdStatus === 'PRESENT')
  const productionRecheckBlocked = mappingRecheckPending || item.mapping?.status !== 'READY'
  const productionRecheckLabel = mappingRecheckPending
    ? t('orders.actions.recheckProductionWaitingMapping')
    : item.mapping?.status !== 'READY'
      ? t('orders.actions.recheckProductionNeedsMapping')
      : t('orders.actions.recheckProductionShort')

  const relatedImages = useMemo(
    () =>
      Array.from(
        new Set([
          customizationPreview,
          customizationImage,
          ...artworkImages.map((image) => image.assetDownloadUrl),
          ...customizationInputs.map((input) => input.assetDownloadUrl),
        ]),
      )
        .filter((image): image is string => Boolean(image))
        .slice(0, 5),
    [artworkImages, customizationPreview, customizationImage, customizationInputs],
  )

  const customizationValueInputs = customizationInputs.filter((input) => !input.assetDownloadUrl)
  const [showAllCustomizations, setShowAllCustomizations] = useState(false)
  const [isArtworkExpanded, setIsArtworkExpanded] = useState(false)
  const visibleCustomizationInputs = showAllCustomizations
    ? customizationInputs
    : [...customizationValueInputs.slice(0, 4), ...buyerImageInputs]
  const hiddenCustomizationCount =
    customizationValueInputs.length - Math.min(customizationValueInputs.length, 4)

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
              label: productionRecheckLabel,
              disabled: productionRecheckBlocked,
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
    [
      canOperate,
      canRecheckProduction,
      canWrite,
      item,
      onAction,
      onConfirm,
      productionRecheckBlocked,
      productionRecheckLabel,
      t,
      terminal,
    ],
  )

  const renderAsin = (asin?: string | null) => {
    const productUrl = getAmazonProductUrl(asin)

    return (
      <Space size={4} className={styles.asinWithLink}>
        <span className={styles.asinChip}>{displayValue(asin)}</span>
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
        {mainListingImage ? (
          <>
            <Typography.Text type="secondary">
              {t('orders.fields.mainListingImage')}
            </Typography.Text>
            <AuthenticatedMediaImage
              width={112}
              height={112}
              downloadUrl={mainListingImage}
              alt={t('orders.fields.mainListingImage')}
              style={{ cursor: 'zoom-in' }}
              onClick={(event) => onOpenImageViewer(event, mainListingImage, [mainListingImage])}
              fallback="/assets/images/favicon.svg"
            />
          </>
        ) : null}
        {artworkImages.length > 0 ? (
          <div className={styles.artworkCollapsible}>
            <button
              type="button"
              className={styles.artworkToggle}
              onClick={() => setIsArtworkExpanded((current) => !current)}
              aria-expanded={isArtworkExpanded}
            >
              <RightOutlined
                className={styles.artworkToggleIcon}
                style={{
                  transform: isArtworkExpanded ? 'rotate(90deg)' : 'none',
                  transition: 'transform 150ms ease',
                }}
              />
              <span className={styles.artworkToggleLabel}>
                {t('orders.fields.customizationArtwork')} ({artworkImages.length})
              </span>
            </button>
            {isArtworkExpanded ? (
              <div className={styles.artworkImages}>
                {artworkImages.map((image) => (
                  <AuthenticatedMediaImage
                    key={image.assetDownloadUrl}
                    width={112}
                    height={112}
                    downloadUrl={image.assetDownloadUrl}
                    alt={image.filename || t('orders.fields.image')}
                    style={{ cursor: 'zoom-in' }}
                    onClick={(event) =>
                      onOpenImageViewer(event, image.assetDownloadUrl, relatedImages)
                    }
                    fallback="/assets/images/favicon.svg"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <StatusTag status={orderStatusTone(psdStatus)}>PSD {displayValue(psdStatus)}</StatusTag>
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
            {
              key: 'sku',
              label: 'SKU',
              children: <span className={styles.skuChip}>{displayValue(item.item.sku)}</span>,
            },
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
            <span className={styles.skuChip}>{displayValue(item.item.sku)}</span>
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
          {item.production?.scaleBy ? (
            <div>
              <Typography.Text type="secondary">{t('orders.fields.scaleBy')}</Typography.Text>
              <span className={styles.sellerChip}>
                {displayValue(
                  [item.production.scaleBy.employeeCode, item.production.scaleBy.name]
                    .filter(Boolean)
                    .join(' · '),
                )}
              </span>
            </div>
          ) : null}
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
                    fallback="/assets/images/favicon.svg"
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
        {hiddenCustomizationCount > 0 ? (
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
