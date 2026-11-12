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
import {
  CopyableAsin,
  CopyableListingId,
  CopyableSku,
  EmployeeIdentity,
  StatusTag,
} from '@/shared/ui'

import type { OrderWorkbenchItem } from '../api/orderApi'
import { FulfillmentInlineEditor } from '../pages/FulfillmentInlineEditor'
import { formatMinorMoney, orderStatusTone } from '../pages/orderPresentation'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import EtsyPurchasedDetails from './EtsyPurchasedDetails'
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
    () => customizationInputs.filter((input) => input?.assetDownloadUrl),
    [customizationInputs],
  )
  const customizationImage = buyerImageInputs[0]?.assetDownloadUrl
  const customizationPreview = item.customization?.previewImageUrl
  const buyerImageUrls = useMemo(
    () => new Set(buyerImageInputs.map((input) => input?.assetDownloadUrl).filter(Boolean)),
    [buyerImageInputs],
  )
  const extractedArtworkImages = useMemo(
    () =>
      (item.customization?.extractedImages ?? []).filter(
        (image) => image?.assetDownloadUrl && !buyerImageUrls.has(image.assetDownloadUrl),
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
  const savedListingImage = item.item?.listingImageAssetId
    ? `/api/media/assets/${encodeURIComponent(item.item.listingImageAssetId)}/download`
    : null
  const mainListingImage =
    item.listing?.productImageUrl || savedListingImage || item.item?.listingImageUrl
  const listingImageFallback =
    item.item?.listingImageThumbnailUrl ||
    item.item?.listingImageUrl ||
    '/assets/images/favicon.svg'
  const isEtsy = item.item?.salesChannelCode === 'ETSY'
  const etsyListingId = item.item?.externalListingId
  const platformIdentity = isEtsy ? (
    etsyListingId && /^\d+$/.test(etsyListingId) ? (
      <Space size={4} className={styles.asinWithLink}>
        <CopyableListingId value={etsyListingId} className={styles.asinChip} fallback="—" />
        <Tooltip title={t('orders.actions.openProduct', { defaultValue: 'Open product' })}>
          <Button
            type="text"
            size="small"
            className={styles.asinLink}
            icon={<ExportOutlined />}
            href={`https://www.etsy.com/listing/${etsyListingId}`}
            target="_blank"
            rel="noreferrer"
            aria-label={t('orders.actions.openProduct', { defaultValue: 'Open product' })}
          />
        </Tooltip>
      </Space>
    ) : (
      <CopyableListingId value={etsyListingId} className={styles.asinChip} fallback="—" />
    )
  ) : null
  const productionPsd = item.production?.scaleContext?.use?.psdTemplate
  const listingPsdAssetId = (item.listing as { defaultPsdTemplateAssetId?: string | null })
    ?.defaultPsdTemplateAssetId
  const variantSource = item.psd?.listingVariant || item.mapping?.listingVariant
  const listingSource = item.psd?.listingPsd || item.mapping?.listingPsd
  const psdSource =
    variantSource?.psdReadiness?.status || variantSource?.psdTemplate?.downloadUrl
      ? variantSource
      : listingSource?.psdReadiness?.status || listingSource?.psdTemplate?.downloadUrl
        ? listingSource
        : variantSource || listingSource
  const psdStatus =
    psdSource?.psdReadiness?.status ||
    (listingPsdAssetId || productionPsd?.status === 'READY' ? 'PRESENT' : productionPsd?.status)
  const psdDownloadUrl =
    psdSource?.psdTemplate?.downloadUrl ||
    productionPsd?.assetDownloadUrl ||
    (listingPsdAssetId
      ? `/api/media/assets/${encodeURIComponent(listingPsdAssetId)}/download`
      : null)
  const terminal = ['CANCELLED', 'FAILED', 'REFUNDED', 'SHIPPED'].includes(item.item?.status ?? '')
  const canRecheckProduction = Boolean(
    item.workflow?.nextActions?.some(
      (action) => action === 'CREATE_PRODUCTION_TASK' || action.startsWith('RECHECK_'),
    ) ||
    item.mapping?.status === 'BLOCKED' ||
    (item.production?.status === 'BLOCKED' && psdStatus === 'PRESENT'),
  )
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
          ...artworkImages.map((image) => image?.assetDownloadUrl),
          ...customizationInputs.map((input) => input?.assetDownloadUrl),
        ]),
      )
        .filter((image): image is string => Boolean(image))
        .slice(0, 5),
    [artworkImages, customizationPreview, customizationImage, customizationInputs],
  )

  const customizationValueInputs = customizationInputs.filter((input) => !input?.assetDownloadUrl)
  const [showAllCustomizations, setShowAllCustomizations] = useState(false)
  const [isArtworkExpanded, setIsArtworkExpanded] = useState(false)
  const CUSTOMIZATION_PREVIEW_LIMIT = 8
  const shouldCollapseCustomizations = customizationValueInputs.length > CUSTOMIZATION_PREVIEW_LIMIT
  const visibleCustomizationInputs =
    showAllCustomizations || !shouldCollapseCustomizations
      ? customizationInputs
      : [...customizationValueInputs.slice(0, CUSTOMIZATION_PREVIEW_LIMIT), ...buyerImageInputs]
  const hiddenCustomizationCount = shouldCollapseCustomizations
    ? customizationValueInputs.length - CUSTOMIZATION_PREVIEW_LIMIT
    : 0

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
            ...(item.production?.status === 'SENT_TO_VENDOR' && !item.tracking?.trackingNumber
              ? [
                  {
                    key: 'vendor-rematch',
                    danger: true,
                    label: 'Reset vendor matching',
                    onClick: ({ domEvent }: MenuClickInfo) =>
                      onConfirm(domEvent.target, 'vendor-rematch-recovery', item),
                  },
                ]
              : []),
            {
              key: 'recheck-mapping',
              icon: <ReloadOutlined />,
              label: t('orders.actions.recheckMappingShort'),
              onClick: () => onAction({ kind: 'recheck-mapping', itemId: item.item?.id ?? '' }),
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
              onClick: () => onAction({ kind: 'recheck-production', itemId: item.item?.id ?? '' }),
            },
          ]
        : []),
      ...(canOperate && !terminal
        ? [
            {
              key: 'ready',
              icon: <CheckCircleOutlined />,
              label: t('orders.actions.readyShort'),
              onClick: () => onAction({ kind: 'ready', itemId: item.item?.id ?? '' }),
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
        <CopyableAsin value={asin} className={styles.asinChip} fallback="—" />
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
    <article className={`${styles.itemPanel} ${isEtsy ? styles.etsyItemPanel : ''}`}>
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
              fallback={listingImageFallback}
              onError={(event) => {
                if (event.currentTarget.getAttribute('src') !== listingImageFallback)
                  event.currentTarget.src = listingImageFallback
              }}
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
              children: (
                <CopyableSku value={item.item?.sku} className={styles.skuChip} fallback="—" />
              ),
            },
            {
              key: 'platform-id',
              label: isEtsy ? t('orders.fields.etsyListingId') : 'ASIN',
              children: isEtsy ? platformIdentity : renderAsin(item.item?.asin),
            },
            {
              key: 'seller',
              label: t('orders.fields.seller'),
              children:
                item.seller?.name || item.seller?.employeeCode ? (
                  <EmployeeIdentity
                    size="small"
                    mode="inline"
                    name={item.seller.name}
                    employeeCode={item.seller.employeeCode}
                  />
                ) : (
                  '—'
                ),
            },
          ]}
        />
        <div className={styles.identifierList}>
          <div>
            <Typography.Text type="secondary">SKU</Typography.Text>
            <CopyableSku value={item.item?.sku} className={styles.skuChip} fallback="—" />
          </div>
          <div>
            <Typography.Text type="secondary">
              {isEtsy ? t('orders.fields.etsyListingId') : 'ASIN'}
            </Typography.Text>
            {isEtsy ? platformIdentity : renderAsin(item.item?.asin)}
          </div>
          <div>
            <Typography.Text type="secondary">{t('orders.fields.seller')}</Typography.Text>
            {item.seller?.name || item.seller?.employeeCode ? (
              <div style={{ marginTop: 2 }}>
                <EmployeeIdentity
                  size="small"
                  mode="inline"
                  name={item.seller.name}
                  employeeCode={item.seller.employeeCode}
                />
              </div>
            ) : (
              <span className={styles.sellerChip}>—</span>
            )}
          </div>
          {item.production?.scaleBy ? (
            <div>
              <Typography.Text type="secondary">{t('orders.fields.scaleBy')}</Typography.Text>
              <div style={{ marginTop: 2 }}>
                <EmployeeIdentity
                  size="small"
                  mode="inline"
                  name={
                    typeof item.production.scaleBy === 'object'
                      ? item.production.scaleBy?.name
                      : null
                  }
                  employeeCode={
                    typeof item.production.scaleBy === 'object'
                      ? item.production.scaleBy?.employeeCode
                      : null
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <section aria-label={isEtsy ? t('orders.sections.customization') : undefined}>
        <Space className={styles.customizationHeader} size="small" wrap>
          <Typography.Text strong>{t('orders.sections.customization')}</Typography.Text>
          {!isEtsy && canOperate && item.customization?.sourceCustomizationUrl ? (
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
          {!isEtsy && canOperate && item.customization?.downloadedZip?.status === 'FAILED' ? (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={pending}
              onClick={() =>
                onAction({ kind: 'retry-customization-assets', itemId: item.item?.id ?? '' })
              }
            >
              Retry Amazon data
            </Button>
          ) : null}
        </Space>
        {isEtsy ? <EtsyPurchasedDetails item={item} /> : null}
        <div className={styles.inputList}>
          {(isEtsy ? buyerImageInputs : visibleCustomizationInputs).map((input, index) => (
            <div key={`${input?.label ?? ''}-${index}`}>
              <Typography.Text type="secondary">
                {input?.label || input?.type || '—'}:{' '}
              </Typography.Text>
              {input?.assetDownloadUrl ? (
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
                <Typography.Text>{displayValue(input?.value)}</Typography.Text>
              )}
            </div>
          ))}
          {!isEtsy && !customizationInputs.length ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : null}
        </div>
        {!isEtsy && hiddenCustomizationCount > 0 ? (
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
            { key: 'qty', label: t('orders.fields.quantity'), children: item.item?.quantity ?? 1 },
            {
              key: 'base',
              label: t('orders.fields.totalCost'),
              children: formatMinorMoney(
                item.pricing?.totalCostAmount ?? item.pricing?.baseCostAmount,
                item.pricing?.currency ?? 'USD',
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
                onClick={(event) => onHistory(event, item.item?.id ?? '')}
              />
            </Tooltip>
          </Space>
        </div>
        <OrderItemNoteEditor
          key={`${item.item?.id ?? ''}:${item.item?.csNote ?? ''}`}
          canWrite={canOperate}
          initialNote={item.item?.csNote ?? ''}
          pending={pending}
          onSave={(note) => onAction({ kind: 'note', itemId: item.item?.id ?? '', note })}
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
