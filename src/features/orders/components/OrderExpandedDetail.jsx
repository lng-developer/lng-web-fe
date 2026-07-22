import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReplayIcon from '@mui/icons-material/Replay'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import CopyableText from '@/components/common/CopyableText'
import ImagePreview from '@/components/common/ImagePreview'
import InlineDetailValue from '@/components/common/InlineDetailValue'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useMappingRecheckMutation,
  useMappingSelectMutation,
} from '@/features/mapping/api/mapping.mutations'
import { useUpdateOrderItemCsNoteMutation } from '@/features/orders/api/orders.mutations'
import DetailField from '@/features/orders/components/OrderDetailField'
import StatusBadge from '@/features/orders/components/OrderStatusChip'
import { orderWorkbenchDetailPaddingClass } from '@/features/orders/components/orderWorkbenchColumns'
import {
  useVendorCostCentersQuery,
  useVendorProductsQuery,
} from '@/features/vendors/api/vendors.queries'
import { useDebounce } from '@/hooks/useDebounce'

function cleanManualMatchValue(value) {
  const text = String(value || '').trim()
  const normalized = text.toLowerCase()

  return text && text !== '-' && normalized !== 'no data' ? text : undefined
}

function formatManualVendorProduct(product = {}) {
  const vendorName =
    product.vendorName || product.vendorCode || product.vendor?.name || product.vendor?.code
  const productName = product.name || product.code

  return [vendorName, productName].filter(Boolean).join(' - ') || product.id || '-'
}

function formatManualVendorProductMeta(product = {}) {
  const parts = [
    product.code,
    product.vendorName ? `Vendor: ${product.vendorName}` : '',
    product.costCenterCount ? `${product.costCenterCount} variants` : '',
  ].filter(Boolean)

  return parts.join(' Â· ')
}

function getMappingRecheckFeedback(result = {}) {
  if (['READY', 'CONFIRMED'].includes(result.status)) {
    return {
      message: result.blockingReasons?.length
        ? 'Vendor matched. Customization still needs review.'
        : 'Vendor match rechecked.',
      variant: SNACKBAR_VARIANTS.SUCCESS,
    }
  }

  const reason = result.blockingReasons?.[0]

  return {
    message: reason
      ? `Vendor not matched: ${reason}`
      : 'Vendor not matched. Check customization and mapping data.',
    variant: SNACKBAR_VARIANTS.WARNING,
  }
}

function RowActionButton({ color = 'default', disabled = false, icon, label, onClick }) {
  return (
    <IconButton
      aria-label={label}
      color={color}
      disabled={disabled}
      onClick={onClick}
      size="small"
      title={label}
      sx={(theme) => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        flexShrink: 0,
        height: 28,
        width: 28,
      })}
    >
      {icon}
    </IconButton>
  )
}

const ProductImages = memo(function ProductImages({ images }) {
  return (
    <Stack spacing={3} sx={{ width: '100%', alignItems: 'center' }}>
      {images.map((image, index) => (
        <ImagePreview
          key={`${image}-${index}`}
          src={image}
          alt="Product image"
          className={
            index === 0 ? 'h-[150px] w-[150px] rounded-md' : 'h-[142px] w-[142px] rounded-md'
          }
        >
          <Box
            component="img"
            src={image}
            alt="Product image"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        </ImagePreview>
      ))}
    </Stack>
  )
})

const ProductInfo = memo(function ProductInfo({ product }) {
  const { t } = useTranslation()

  return (
    <Stack className="min-w-0 w-full gap-4">
      <Typography
        variant="caption"
        className="min-w-0 tracking-[0.8px] !font-extrabold !text-ink-muted"
      >
        {t('orders.detail.productInfo')}
      </Typography>
      <DetailField
        label={t('orders.fields.psd')}
        value={<StatusBadge label={t(product.psdKey)} color={product.psdColor || 'danger'} />}
        valueAlign="left"
      />
      <DetailField
        label={t('orders.fields.pngStatus')}
        value={<StatusBadge label={t(product.pngStatusKey)} color="warning" />}
        valueAlign="left"
      />
      <DetailField
        label={t('orders.fields.scaleBy')}
        value={product.scaleBy || t(product.scaleByKey)}
        valueAlign="left"
      />
      <DetailField label={t('orders.fields.qcBy')} value={product.qcBy} valueAlign="left" />
      <DetailField
        label={t('orders.fields.sku')}
        value={<CopyableText value={product.sku} />}
        valueAlign="left"
      />
      <DetailField
        label={t('orders.fields.asinType')}
        value={t(product.asinTypeKey)}
        valueAlign="left"
      />
      <DetailField
        label={t('orders.fields.asin')}
        value={<CopyableText value={product.asin} />}
        valueAlign="left"
      />
      <DetailField label={t('orders.fields.seller')} value={product.seller} valueAlign="left" />
      <DetailField label={t('orders.fields.team')} value={product.team} valueAlign="left" />
    </Stack>
  )
})

const CustomizationInfo = memo(function CustomizationInfo({ customization }) {
  const { t } = useTranslation()
  const hasDynamicCustomization =
    Array.isArray(customization.fields) || Array.isArray(customization.images)
  const dynamicFields = customization.fields || []
  const dynamicImages = customization.images || []
  const customizationUrl = customization.customizationUrl
  const hasCustomizationUrl = customizationUrl && customizationUrl !== '-'
  const customizationUrlValue = hasCustomizationUrl ? (
    <Typography
      component="a"
      href={customizationUrl}
      rel="noreferrer"
      target="_blank"
      variant="body2"
      sx={(theme) => ({
        color: theme.palette.primary.main,
        fontWeight: 700,
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline',
        },
      })}
    >
      Link
    </Typography>
  ) : (
    '-'
  )
  const topFields = [
    ['orders.fields.productType', customization.productType],
    ['orders.fields.shirtColor', customization.shirtColor],
    ['orders.fields.selectSize', customization.size],
  ]
  const bottomFields = [
    ['orders.fields.customerName', customization.customerName],
    ['orders.fields.year', customization.year],
    ['orders.fields.customSleeve', customization.customSleeve],
    ['orders.fields.rightSleeve', customization.rightSleeve],
    ['orders.fields.leftSleeve', customization.leftSleeve],
    ['orders.fields.priority', t(customization.priorityKey)],
    ['orders.fields.customizationUrl', customization.customizationUrl],
  ]

  return (
    <Stack className="min-w-0 w-full gap-[17px]">
      <Typography
        variant="caption"
        className="min-w-0 tracking-[0.8px] !font-extrabold !text-ink-muted"
      >
        {t('orders.detail.customization')}
      </Typography>
      {hasDynamicCustomization ? (
        <>
          {dynamicFields.length === 0 && dynamicImages.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              {t('orders.values.common.noData')}
            </Typography>
          ) : null}
          {dynamicFields.map((field, index) => (
            <InlineDetailValue
              key={`${field.label}-${field.value}-${index}`}
              label={field.label}
              value={field.value}
            />
          ))}
          <InlineDetailValue label={t('orders.fields.customizationUrl')}>
            {customizationUrlValue}
          </InlineDetailValue>
          {dynamicImages.map((image, index) => (
            <Box key={`${image.url}-${index}`}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
                {image.label || t('orders.fields.customerPhoto')}
              </Typography>
              <ImagePreview
                src={image.url}
                alt={image.label || t('orders.fields.customerPhoto')}
                className="h-[58px] w-[58px] rounded"
              >
                <Box
                  component="img"
                  src={image.url}
                  alt={image.label || t('orders.fields.customerPhoto')}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </ImagePreview>
            </Box>
          ))}
        </>
      ) : (
        <>
          {topFields.map(([labelKey, value]) => (
            <InlineDetailValue key={labelKey} label={t(labelKey)} value={value} />
          ))}
          <Typography variant="body2" color="text.disabled">
            {t('orders.fields.customerPhoto')}
          </Typography>
          <Stack direction="row" spacing={2.5}>
            {customization.customerPhoto.map((image, index) => (
              <ImagePreview
                key={`${image}-photo-${index}`}
                src={image}
                alt={t('orders.fields.customerPhoto')}
                className="h-[58px] w-[58px] rounded"
              >
                <Box
                  component="img"
                  src={image}
                  alt={t('orders.fields.customerPhoto')}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </ImagePreview>
            ))}
          </Stack>
          {bottomFields.map(([labelKey, value]) => (
            <InlineDetailValue key={labelKey} label={t(labelKey)} value={value} />
          ))}
        </>
      )}
    </Stack>
  )
})

function ReadOnlyValue({ maxWidth = 220, multiline = false, rows = 1, value }) {
  return (
    <Box
      sx={(theme) => ({
        alignItems: multiline ? 'flex-start' : 'center',
        bgcolor: theme.palette.action.hover,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        display: 'flex',
        maxWidth,
        minHeight: multiline ? rows * 24 + 12 : 34,
        px: 1.25,
        py: multiline ? 0.75 : 0.5,
        width: '100%',
      })}
    >
      <Typography variant="body2" className="!font-medium" sx={{ overflowWrap: 'anywhere' }}>
        {value || '-'}
      </Typography>
    </Box>
  )
}

const InlineVendorMatch = memo(function InlineVendorMatch({ fulfillment, orderItemId }) {
  const { enqueueSnackbar } = useSnackbar()
  const { t } = useTranslation()
  const selectMutation = useMappingSelectMutation()
  const initialVendorProductLabel = cleanManualMatchValue(fulfillment.vendorProduct) || ''
  const [search, setSearch] = useState(initialVendorProductLabel)
  const [vendorProductId, setVendorProductId] = useState(() => fulfillment.vendorProductId || '')
  const [size, setSize] = useState(() =>
    fulfillment.vendorProductId ? cleanManualMatchValue(fulfillment.size) || '' : '',
  )
  const [color, setColor] = useState(() =>
    fulfillment.vendorProductId ? cleanManualMatchValue(fulfillment.color) || '' : '',
  )
  const [savedVendorProductId, setSavedVendorProductId] = useState(
    () => fulfillment.vendorProductId || '',
  )
  const [savedVendorCostCenterId, setSavedVendorCostCenterId] = useState(
    () => fulfillment.vendorCostCenterId || '',
  )
  const [vendorLookupActive, setVendorLookupActive] = useState(false)
  const [vendorOptionsOpen, setVendorOptionsOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 300)
  const hasProductTypeGroup = Boolean(fulfillment.productTypeGroupId)
  const productQuery = useVendorProductsQuery(
    {
      limit: 50,
      productTypeGroupId: fulfillment.productTypeGroupId,
      search: vendorProductId ? '' : debouncedSearch,
      status: 'active',
    },
    { enabled: Boolean(fulfillment.productTypeGroupId && vendorLookupActive) },
  )
  const refetchVendorProducts = productQuery.refetch
  const activateVendorLookup = useCallback(() => {
    setVendorLookupActive(true)
    setVendorOptionsOpen(true)
  }, [])
  const refreshVendorLookup = useCallback(() => {
    setVendorLookupActive(true)
    setVendorOptionsOpen(true)
    if (vendorLookupActive) {
      refetchVendorProducts()
    }
  }, [refetchVendorProducts, vendorLookupActive])
  const costCenterQuery = useVendorCostCentersQuery(
    vendorProductId,
    { limit: 100, status: 'active' },
    { enabled: Boolean(vendorProductId) },
  )
  const vendorProducts = useMemo(
    () =>
      (productQuery.data?.items || []).map((product) => ({
        ...product,
        label: formatManualVendorProduct(product),
      })),
    [productQuery.data?.items],
  )
  const costCenters = useMemo(
    () => costCenterQuery.data?.items || [],
    [costCenterQuery.data?.items],
  )
  const sizeOptions = useMemo(
    () => [...new Set(costCenters.map((costCenter) => costCenter.standardSize).filter(Boolean))],
    [costCenters],
  )
  const selectedSize = sizeOptions.includes(size) ? size : ''
  const colorOptions = useMemo(
    () => [
      ...new Set(
        costCenters
          .filter((costCenter) => !selectedSize || costCenter.standardSize === selectedSize)
          .map((costCenter) => costCenter.standardColor)
          .filter(Boolean),
      ),
    ],
    [costCenters, selectedSize],
  )
  const selectedColor = colorOptions.includes(color) ? color : ''
  const canSelectCandidate =
    Boolean(vendorProductId) &&
    (sizeOptions.length === 0 || Boolean(selectedSize)) &&
    (colorOptions.length === 0 || Boolean(selectedColor))
  const selectedCostCenter = canSelectCandidate
    ? costCenters.find(
        (costCenter) =>
          (!selectedSize || costCenter.standardSize === selectedSize) &&
          (!selectedColor || costCenter.standardColor === selectedColor),
      )
    : null
  const selectedProduct =
    vendorProducts.find((product) => product.id === vendorProductId) ||
    (vendorProductId ? { id: vendorProductId, label: search || fulfillment.vendorProduct } : null)
  const selectedCandidate = selectedCostCenter
    ? { vendorProduct: selectedProduct, vendorCostCenter: selectedCostCenter }
    : null
  const hasUnsavedCandidate =
    Boolean(selectedCandidate) &&
    (selectedCandidate.vendorProduct.id !== savedVendorProductId ||
      selectedCandidate.vendorCostCenter.id !== savedVendorCostCenterId)

  const handleApply = () => {
    if (!hasUnsavedCandidate) return
    selectMutation.mutate(
      {
        orderItemId,
        body: {
          vendorProductId: selectedCandidate.vendorProduct.id,
          vendorCostCenterId: selectedCandidate.vendorCostCenter.id,
        },
      },
      {
        onSuccess: () => {
          enqueueSnackbar(t('orders.manualVendorMatch.success'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
          setSavedVendorProductId(selectedCandidate.vendorProduct.id)
          setSavedVendorCostCenterId(selectedCandidate.vendorCostCenter.id)
        },
        onError: (error) => {
          enqueueSnackbar(t(error?.message || 'errors.api.network'), {
            variant: SNACKBAR_VARIANTS.ERROR,
          })
        },
      },
    )
  }

  const errorMessage =
    productQuery.error?.message || costCenterQuery.error?.message || selectMutation.error?.message
  const showMissingProductTypeHelp = vendorLookupActive && !hasProductTypeGroup

  return (
    <Stack spacing={1.1} sx={{ maxWidth: 220, width: '100%' }}>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.vendorProduct')}
        </Typography>
        <Autocomplete
          fullWidth
          open={vendorOptionsOpen}
          openOnFocus
          autoHighlight
          size="small"
          freeSolo
          loading={productQuery.isFetching}
          options={vendorProducts}
          value={selectedProduct}
          inputValue={search}
          filterOptions={(options) => options}
          getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
          noOptionsText={
            hasProductTypeGroup
              ? t('orders.manualVendorMatch.noProducts')
              : t('orders.manualVendorMatch.noProductType')
          }
          onOpen={activateVendorLookup}
          onClose={() => setVendorOptionsOpen(false)}
          onInputChange={(_event, value, reason) => {
            setSearch(value)
            if (reason === 'input') {
              setVendorLookupActive(true)
              setVendorOptionsOpen(true)
              setVendorProductId('')
              setSize('')
              setColor('')
            }
          }}
          onChange={(_event, option) => {
            setVendorLookupActive(true)
            setVendorProductId(option?.id || '')
            setSearch(typeof option === 'string' ? option : option?.label || '')
            setSize('')
            setColor('')
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={t('orders.manualVendorMatch.searchPlaceholder')}
              error={Boolean(errorMessage || showMissingProductTypeHelp)}
              helperText={
                errorMessage
                  ? t(errorMessage)
                  : showMissingProductTypeHelp
                    ? t('orders.manualVendorMatch.missingProductTypeHelp')
                    : ''
              }
              onFocus={refreshVendorLookup}
              onClick={refreshVendorLookup}
            />
          )}
          renderOption={(props, option) => (
            <Box
              component="li"
              {...props}
              sx={{ alignItems: 'flex-start', flexDirection: 'column' }}
            >
              <Typography variant="body2" className="!font-semibold">
                {option.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatManualVendorProductMeta(option)}
              </Typography>
            </Box>
          )}
        />
      </Stack>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.size')}
        </Typography>
        <FormControl size="small" fullWidth>
          <Select
            value={selectedSize}
            displayEmpty
            disabled={!vendorProductId || costCenterQuery.isFetching || sizeOptions.length === 0}
            onOpen={() => setVendorLookupActive(true)}
            onChange={(event) => {
              setSize(event.target.value)
              setColor('')
            }}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.disabled">
                {sizeOptions.length
                  ? t('orders.manualVendorMatch.selectSize')
                  : t('orders.manualVendorMatch.noSize')}
              </Typography>
            </MenuItem>
            {sizeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.color')}
        </Typography>
        <FormControl size="small" fullWidth>
          <Select
            value={selectedColor}
            displayEmpty
            disabled={
              !vendorProductId ||
              costCenterQuery.isFetching ||
              (sizeOptions.length > 0 && !selectedSize) ||
              colorOptions.length === 0
            }
            onOpen={() => setVendorLookupActive(true)}
            onChange={(event) => setColor(event.target.value)}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.disabled">
                {colorOptions.length
                  ? t('orders.manualVendorMatch.selectColor')
                  : t('orders.manualVendorMatch.noColor')}
              </Typography>
            </MenuItem>
            {colorOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {hasUnsavedCandidate ? (
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1.5, p: 1.5 }}>
          <Typography variant="body2" className="!font-bold" sx={{ mb: 0.75 }}>
            {t('orders.manualVendorMatch.variantDetails')}
          </Typography>
          <Typography variant="body2">
            {t('orders.manualVendorMatch.sku', {
              value:
                selectedCandidate.vendorCostCenter.sku ||
                selectedCandidate.vendorCostCenter.lngCode ||
                '-',
            })}
          </Typography>
          <Typography variant="body2">
            {t('orders.manualVendorMatch.baseCost', {
              value:
                selectedCandidate.vendorCostCenter.baseCostAmount === null ||
                selectedCandidate.vendorCostCenter.baseCostAmount === undefined
                  ? '-'
                  : `${selectedCandidate.vendorCostCenter.currency || '$'}${
                      selectedCandidate.vendorCostCenter.baseCostAmount
                    }`,
            })}
          </Typography>
          <Typography variant="body2">
            {t('orders.manualVendorMatch.standardSize', {
              value: selectedCandidate.vendorCostCenter.standardSize || '-',
            })}
          </Typography>
          <Typography variant="body2">
            {t('orders.manualVendorMatch.standardColor', {
              value: selectedCandidate.vendorCostCenter.standardColor || '-',
            })}
          </Typography>
        </Box>
      ) : null}
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.fulfillName')}
        </Typography>
        <ReadOnlyValue value={fulfillment.fulfillName} multiline rows={2} />
      </Stack>
      {hasUnsavedCandidate ? (
        <Button
          variant="contained"
          size="small"
          onClick={handleApply}
          disabled={!hasUnsavedCandidate || selectMutation.isPending}
          sx={{ alignSelf: 'flex-start', minWidth: 78 }}
        >
          {t('orders.manualVendorMatch.apply')}
        </Button>
      ) : null}
    </Stack>
  )
})

const VendorMatchSummary = memo(function VendorMatchSummary({ fulfillment, onEdit }) {
  const { t } = useTranslation()
  const vendorProduct = cleanManualMatchValue(fulfillment.vendorProduct)
  const size = cleanManualMatchValue(fulfillment.size)
  const color = cleanManualMatchValue(fulfillment.color)

  return (
    <Stack spacing={1.1} sx={{ maxWidth: 220, width: '100%' }}>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.vendorProduct')}
        </Typography>
        <Button
          variant="outlined"
          onClick={onEdit}
          sx={(theme) => ({
            bgcolor: theme.palette.action.hover,
            borderColor: theme.palette.divider,
            borderRadius: 1.5,
            color: 'text.primary',
            justifyContent: 'flex-start',
            minHeight: 34,
            px: 1.25,
            py: 0.5,
            textAlign: 'left',
            textTransform: 'none',
            width: '100%',
            '&:hover': {
              bgcolor: theme.palette.action.selected,
              borderColor: theme.palette.primary.main,
            },
          })}
        >
          <Typography variant="body2" className="!font-medium" noWrap>
            {vendorProduct || t('orders.values.common.noData')}
          </Typography>
        </Button>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Stack spacing={0.45} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" className="!font-semibold">
            {t('orders.fields.size')}
          </Typography>
          <ReadOnlyValue value={size || t('orders.values.common.noData')} maxWidth={96} />
        </Stack>
        <Stack spacing={0.45} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" className="!font-semibold">
            {t('orders.fields.color')}
          </Typography>
          <ReadOnlyValue value={color || t('orders.values.common.noData')} maxWidth={96} />
        </Stack>
      </Stack>
      <Stack spacing={0.45}>
        <Typography variant="body2" className="!font-semibold">
          {t('orders.fields.fulfillName')}
        </Typography>
        <ReadOnlyValue value={fulfillment.fulfillName} multiline rows={2} />
      </Stack>
    </Stack>
  )
})

const FulfillmentInfo = memo(function FulfillmentInfo({ fulfillment, onRefresh, orderItemId }) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [editingVendorMatch, setEditingVendorMatch] = useState(false)
  const recheckMutation = useMappingRecheckMutation()

  const recheckVendorMatch = async () => {
    if (!orderItemId) return

    try {
      const result = await recheckMutation.mutateAsync(orderItemId)
      const feedback = getMappingRecheckFeedback(result)
      enqueueSnackbar(feedback.message, { variant: feedback.variant })
      onRefresh?.()
    } catch (error) {
      enqueueSnackbar(error?.message || 'Action failed', { variant: SNACKBAR_VARIANTS.ERROR })
    }
  }

  return (
    <Box
      sx={{
        columnGap: 3,
        display: 'grid',
        gridTemplateColumns: '120px minmax(220px, 1fr)',
        width: '100%',
      }}
    >
      <Stack spacing={1.1}>
        <Typography variant="caption" className="tracking-[0.8px] !font-extrabold !text-ink-muted">
          QTY
        </Typography>
        <Stack spacing={0.45}>
          <Typography variant="body2" className="!font-semibold">
            {t('orders.fields.quantity')}
          </Typography>
          <ReadOnlyValue value={fulfillment.quantity} maxWidth={76} />
        </Stack>
        <Stack spacing={0.45}>
          <Typography variant="body2" className="!font-semibold">
            {t('orders.fields.fulfillQty')}
          </Typography>
          <ReadOnlyValue value={fulfillment.fulfillQty} maxWidth={76} />
        </Stack>
      </Stack>
      <Stack spacing={1.1}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant="caption"
            className="tracking-[0.8px] !font-extrabold !text-ink-muted"
          >
            Cost Center
          </Typography>
          <RowActionButton
            color="primary"
            disabled={!orderItemId || recheckMutation.isPending}
            icon={<ReplayIcon fontSize="small" />}
            label="Recheck vendor"
            onClick={recheckVendorMatch}
          />
        </Stack>
        {editingVendorMatch ? (
          <InlineVendorMatch
            key={`${orderItemId}-${fulfillment.vendorProductId || ''}-${fulfillment.vendorCostCenterId || ''}`}
            fulfillment={fulfillment}
            orderItemId={orderItemId}
          />
        ) : (
          <VendorMatchSummary
            fulfillment={fulfillment}
            onEdit={() => setEditingVendorMatch(true)}
          />
        )}
      </Stack>
    </Box>
  )
})

const NotePanel = memo(function NotePanel({ fulfillment, orderItemId }) {
  const { t } = useTranslation()
  const updateOrderItemCsNoteMutation = useUpdateOrderItemCsNoteMutation()
  const [csNote, setCsNote] = useState(fulfillment.csNote || '')

  const saveCsNote = () => {
    if (!orderItemId) return
    updateOrderItemCsNoteMutation.mutate({ orderItemId, csNote })
  }

  return (
    <Stack spacing={1.2} sx={{ width: '100%' }}>
      <Typography variant="body2" className="!text-ink-muted">
        {t('orders.fields.status')}
      </Typography>
      <ReadOnlyValue value={t(fulfillment.statusKey)} />
      <Typography variant="body2" className="!text-ink-muted">
        {t('orders.fields.tracking')}
      </Typography>
      <ReadOnlyValue value={t(fulfillment.trackingKey)} />
      <Typography variant="body2" className="!text-ink-muted">
        {t('orders.fields.carrier')}
      </Typography>
      <ReadOnlyValue value={t(fulfillment.carrierKey)} />
      <Typography variant="body2" className="!text-ink-muted">
        {t('orders.fields.note')}
      </Typography>
      <TextField
        aria-label={t('orders.fields.note')}
        disabled={updateOrderItemCsNoteMutation.isPending}
        error={updateOrderItemCsNoteMutation.isError}
        fullWidth
        minRows={2}
        multiline
        onChange={(event) => setCsNote(event.target.value)}
        placeholder={t('orders.fields.note')}
        value={csNote}
        size="small"
      />
      <Button
        disabled={!orderItemId || updateOrderItemCsNoteMutation.isPending}
        onClick={saveCsNote}
        size="small"
        startIcon={<SaveOutlinedIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-start' }}
        variant="outlined"
      >
        {t('common.save')}
      </Button>
    </Stack>
  )
})

const OrderExpandedDetail = memo(function OrderExpandedDetail({ onRefresh, order }) {
  const itemDetails = order.itemDetails?.length
    ? order.itemDetails
    : [
        {
          id: order.apiId || order.id,
          productImages: order.productImages,
          product: order.product,
          customization: order.customization,
          fulfillment: order.fulfillment,
        },
      ]

  return (
    <Stack
      className={orderWorkbenchDetailPaddingClass}
      sx={{
        width: '100%',
        minWidth: 1460,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {itemDetails.map((displayOrder, index) => (
        <Box
          key={displayOrder.id || `${order.apiId || order.id}-${index}`}
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns:
              'minmax(150px, 0.65fr) minmax(220px, 1fr) minmax(320px, 1.35fr) minmax(360px, 1.45fr) minmax(245px, 1fr)',
            gap: 3.5,
            alignItems: 'flex-start',
            py: 2.5,
            borderTop: index === 0 ? 'none' : '1px solid',
            borderColor: 'divider',
          }}
        >
          <ProductImages images={displayOrder.productImages} />
          <ProductInfo product={displayOrder.product} />
          <CustomizationInfo customization={displayOrder.customization} />
          <FulfillmentInfo
            fulfillment={displayOrder.fulfillment}
            onRefresh={onRefresh}
            orderItemId={displayOrder.id}
          />
          <NotePanel
            key={`${displayOrder.id}-${displayOrder.fulfillment.csNote || ''}`}
            fulfillment={displayOrder.fulfillment}
            orderItemId={displayOrder.id}
          />
        </Box>
      ))}
    </Stack>
  )
})

export default OrderExpandedDetail
