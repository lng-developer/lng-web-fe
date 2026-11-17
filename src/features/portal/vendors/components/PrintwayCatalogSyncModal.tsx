import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { CloudDownloadOutlined, SearchOutlined } from '@ant-design/icons'

import { useFeedbackToast } from '@/shared/ui'

import {
  fetchPrintwayCatalog,
  importPrintwayCatalogProducts,
  type PrintwayCatalogProduct,
} from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

const { Text, Title } = Typography

export const PrintwayCatalogSyncModal = memo(function PrintwayCatalogSyncModal({
  open,
  vendorId,
  onClose,
}: {
  open: boolean
  vendorId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [page, setPage] = useState(1)
  const [tierName, setTierName] = useState('tier')
  const [preferredLocation, setPreferredLocation] = useState('US')
  const [fetchShipping, setFetchShipping] = useState(true)
  const [selectedProductCodes, setSelectedProductCodes] = useState<string[]>([])

  const limit = 20

  const catalogQuery = useQuery({
    queryKey: ['vendors', vendorId, 'printway-catalog', activeSearch, page],
    queryFn: () => fetchPrintwayCatalog(vendorId, { q: activeSearch, page, limit }),
    enabled: open && Boolean(vendorId),
    staleTime: 60 * 1000,
  })

  const importMutation = useMutation({
    mutationFn: (products: PrintwayCatalogProduct[]) =>
      importPrintwayCatalogProducts(vendorId, {
        products,
        tierName,
        preferredLocation,
        fetchShipping,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.all })
      showFeedbackToast(
        'success',
        t('portal.vendors.printway.importSuccess', {
          defaultValue: `Đã đồng bộ ${result.createdProducts} sản phẩm và ${result.createdCostCenters} biến thể Printway thành công!`,
          products: result.createdProducts,
          costCenters: result.createdCostCenters,
        }),
      )
      setSelectedProductCodes([])
      onClose()
    },
    onError: (err: Error) => {
      showFeedbackToast(
        'error',
        t('portal.vendors.printway.importFailed', {
          defaultValue: 'Đồng bộ sản phẩm Printway thất bại',
        }),
        err.message,
      )
    },
  })

  const items = catalogQuery.data?.items ?? []
  const total = catalogQuery.data?.pagination.total ?? 0

  const handleSearch = () => {
    setActiveSearch(searchQuery.trim())
    setPage(1)
    setSelectedProductCodes([])
  }

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCodes = items.map((p) => p.code)
      setSelectedProductCodes(Array.from(new Set(allCodes)))
    } else {
      setSelectedProductCodes([])
    }
  }

  const handleToggleProduct = (productCode: string, checked: boolean) => {
    setSelectedProductCodes((prev) =>
      checked ? [...prev, productCode] : prev.filter((code) => code !== productCode),
    )
  }

  const handleImport = () => {
    const selectedProducts = items.filter((p) => selectedProductCodes.includes(p.code))
    if (!selectedProducts.length) return
    importMutation.mutate(selectedProducts)
  }

  const isAllCurrentPageSelected =
    items.length > 0 && items.every((p) => selectedProductCodes.includes(p.code))

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={880}
      title={
        <Space direction="vertical" size={2}>
          <Title level={4} style={{ margin: 0 }}>
            {t('portal.vendors.printway.modalTitle', {
              defaultValue: 'Đồng bộ Catalog Printway (API v3)',
            })}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('portal.vendors.printway.modalSubtitle', {
              defaultValue:
                'Tìm kiếm và tích chọn các sản phẩm Printway để đồng bộ tự động sản phẩm, biến thể và biểu phí vận chuyển.',
            })}
          </Text>
        </Space>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text type="secondary">
              {t('portal.vendors.printway.selectedCount', {
                defaultValue: `Đã chọn: ${selectedProductCodes.length} sản phẩm`,
                count: selectedProductCodes.length,
              })}
            </Text>
          </Space>
          <Space>
            <Button onClick={onClose}>{t('common.cancel', { defaultValue: 'Hủy' })}</Button>
            <Button
              type="primary"
              icon={<CloudDownloadOutlined />}
              loading={importMutation.isPending}
              disabled={selectedProductCodes.length === 0}
              onClick={handleImport}
            >
              {t('portal.vendors.printway.importAction', {
                defaultValue: `Đồng bộ ${selectedProductCodes.length} sản phẩm đã chọn`,
                count: selectedProductCodes.length,
              })}
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder={t('portal.vendors.printway.searchPlaceholder', {
              defaultValue:
                'Nhập Mã sản phẩm hoặc Tên sản phẩm Printway (ví dụ: USJT, Jersey, Mug...)',
            })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={catalogQuery.isFetching}
          >
            {t('common.search', { defaultValue: 'Tìm kiếm' })}
          </Button>
        </Space.Compact>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space size={16} wrap>
          <Space align="center" size={8}>
            <Text style={{ fontSize: 13 }}>
              {t('portal.vendors.printway.pricingTier', { defaultValue: 'Bảng giá vốn:' })}
            </Text>
            <Select
              size="small"
              value={tierName}
              onChange={setTierName}
              style={{ width: 140 }}
              options={[
                { label: 'Tier Price (Ưu đãi)', value: 'tier' },
                { label: 'Base Price (Tiêu chuẩn)', value: 'base' },
              ]}
            />
          </Space>

          <Space align="center" size={8}>
            <Text style={{ fontSize: 13 }}>
              {t('portal.vendors.printway.location', { defaultValue: 'Xưởng ưu tiên:' })}
            </Text>
            <Select
              size="small"
              value={preferredLocation}
              onChange={setPreferredLocation}
              style={{ width: 140 }}
              options={[
                { label: 'Made in US', value: 'US' },
                { label: 'Made in VN', value: 'VN' },
              ]}
            />
          </Space>

          <Checkbox checked={fetchShipping} onChange={(e) => setFetchShipping(e.target.checked)}>
            <Text style={{ fontSize: 13 }}>
              {t('portal.vendors.printway.fetchShipping', {
                defaultValue: 'Lấy phí vận chuyển từ Printway',
              })}
            </Text>
          </Checkbox>
        </Space>

        <Checkbox
          checked={isAllCurrentPageSelected}
          indeterminate={selectedProductCodes.length > 0 && !isAllCurrentPageSelected}
          onChange={(e) => handleToggleSelectAll(e.target.checked)}
          disabled={items.length === 0}
        >
          {t('common.selectAllCurrentPage', { defaultValue: 'Chọn tất cả trang này' })}
        </Checkbox>
      </div>

      {catalogQuery.isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">
              {t('portal.vendors.printway.loadingCatalog', {
                defaultValue: 'Đang kết nối API Printway...',
              })}
            </Text>
          </div>
        </div>
      ) : catalogQuery.isError ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Text type="danger">
            {(catalogQuery.error as Error)?.message ||
              t('portal.vendors.printway.loadFailed', {
                defaultValue:
                  'Không thể tải danh mục từ Printway. Vui lòng kiểm tra lại cấu hình kết nối API Printway trong Cài đặt.',
              })}
          </Text>
        </div>
      ) : items.length === 0 ? (
        <Empty
          description={t('portal.vendors.printway.noProductsFound', {
            defaultValue: 'Không tìm thấy sản phẩm nào từ Printway',
          })}
          style={{ margin: '40px 0' }}
        />
      ) : (
        <div
          style={{
            maxHeight: 450,
            overflowY: 'auto',
            paddingRight: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {items.map((product) => {
            const isSelected = selectedProductCodes.includes(product.code)
            const variantsCount = product.variants?.length ?? 0
            const firstVariant = product.variants?.[0]
            const firstLoc = firstVariant?.locations?.[0]
            const samplePrice =
              tierName === 'base'
                ? (firstLoc?.base_cost ?? firstLoc?.tier_cost)
                : (firstLoc?.tier_cost ?? firstLoc?.base_cost)

            return (
              <Card
                key={product.code}
                size="small"
                hoverable
                style={{
                  borderColor: isSelected ? '#1677ff' : '#f0f0f0',
                  background: isSelected ? '#f0f7ff' : '#fff',
                  transition: 'all 0.2s',
                }}
                bodyStyle={{ padding: '10px 14px' }}
                onClick={() => handleToggleProduct(product.code, !isSelected)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleToggleProduct(product.code, e.target.checked)
                    }}
                  />

                  {product.mockup_url ? (
                    <img
                      src={product.mockup_url}
                      alt={product.product_name}
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid #eee',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        background: '#fafafa',
                        border: '1px solid #eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#bbb',
                        fontSize: 10,
                        flexShrink: 0,
                      }}
                    >
                      No img
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                    >
                      <Text strong style={{ fontSize: 14 }}>
                        {product.product_name}
                      </Text>
                      <Tag color="blue">{product.code}</Tag>
                      {product.categories?.map((cat) => (
                        <Tag key={cat.name} color="default" style={{ fontSize: 11 }}>
                          {cat.name}
                        </Tag>
                      ))}
                    </div>

                    <div style={{ marginTop: 4, display: 'flex', gap: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {variantsCount} biến thể
                      </Text>
                      {samplePrice !== undefined && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Giá từ:{' '}
                          <Text strong style={{ color: '#52c41a' }}>
                            ${Number(samplePrice).toFixed(2)}
                          </Text>
                        </Text>
                      )}
                      {firstLoc?.made_in_location && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Xưởng: {firstLoc.made_in_location}
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {total > limit ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Pagination
            size="small"
            current={page}
            pageSize={limit}
            total={total}
            showSizeChanger={false}
            onChange={(newPage) => {
              setPage(newPage)
              setSelectedProductCodes([])
            }}
          />
        </div>
      ) : null}
    </Modal>
  )
})
