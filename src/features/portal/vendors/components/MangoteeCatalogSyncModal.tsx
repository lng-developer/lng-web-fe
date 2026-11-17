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
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { CloudDownloadOutlined, SearchOutlined } from '@ant-design/icons'

import { useFeedbackToast } from '@/shared/ui'

import {
  fetchMangoteeCatalog,
  importMangoteeCatalogProducts,
  type MangoteeCatalogProduct,
} from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

const { Text, Title } = Typography

export const MangoteeCatalogSyncModal = memo(function MangoteeCatalogSyncModal({
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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const limit = 20

  const catalogQuery = useQuery({
    queryKey: ['vendors', vendorId, 'mangotee-catalog', activeSearch, page],
    queryFn: () => fetchMangoteeCatalog(vendorId, { q: activeSearch, page, limit }),
    enabled: open && Boolean(vendorId),
    staleTime: 60 * 1000,
  })

  const importMutation = useMutation({
    mutationFn: (products: MangoteeCatalogProduct[]) =>
      importMangoteeCatalogProducts(vendorId, { products }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.all })
      showFeedbackToast(
        'success',
        t('portal.vendors.mangotee.importSuccess', {
          defaultValue: `Đã đồng bộ ${result.createdProducts} sản phẩm và ${result.createdCostCenters} biến thể MangoTee thành công!`,
          products: result.createdProducts,
          costCenters: result.createdCostCenters,
        }),
      )
      setSelectedProductIds([])
      onClose()
    },
    onError: (err: Error) => {
      showFeedbackToast(
        'error',
        t('portal.vendors.mangotee.importFailed', {
          defaultValue: 'Đồng bộ sản phẩm MangoTee thất bại',
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
    setSelectedProductIds([])
  }

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = items.map((p) => p.id || p.sku || '')
      setSelectedProductIds(Array.from(new Set(allIds)))
    } else {
      setSelectedProductIds([])
    }
  }

  const handleToggleProduct = (productId: string, checked: boolean) => {
    setSelectedProductIds((prev) =>
      checked ? [...prev, productId] : prev.filter((id) => id !== productId),
    )
  }

  const handleImport = () => {
    const selectedProducts = items.filter((p) => selectedProductIds.includes(p.id || p.sku || ''))
    if (!selectedProducts.length) return
    importMutation.mutate(selectedProducts)
  }

  const isAllCurrentPageSelected =
    items.length > 0 && items.every((p) => selectedProductIds.includes(p.id || p.sku || ''))

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={850}
      title={
        <Space direction="vertical" size={2}>
          <Title level={4} style={{ margin: 0 }}>
            {t('portal.vendors.mangotee.modalTitle', {
              defaultValue: 'Đồng bộ Catalog MangoTee (On-Demand)',
            })}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('portal.vendors.mangotee.modalSubtitle', {
              defaultValue:
                'Tìm kiếm và tích chọn các sản phẩm MangoTee để đồng bộ tự động vào hệ thống.',
            })}
          </Text>
        </Space>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text type="secondary">
              {t('portal.vendors.mangotee.selectedCount', {
                defaultValue: `Đã chọn: ${selectedProductIds.length} sản phẩm`,
                count: selectedProductIds.length,
              })}
            </Text>
          </Space>
          <Space>
            <Button onClick={onClose}>{t('common.cancel', { defaultValue: 'Hủy' })}</Button>
            <Button
              type="primary"
              icon={<CloudDownloadOutlined />}
              loading={importMutation.isPending}
              disabled={selectedProductIds.length === 0}
              onClick={handleImport}
            >
              {t('portal.vendors.mangotee.importAction', {
                defaultValue: `Đồng bộ ${selectedProductIds.length} sản phẩm đã chọn`,
                count: selectedProductIds.length,
              })}
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder={t('portal.vendors.mangotee.searchPlaceholder', {
              defaultValue: 'Nhập SKU hoặc Tên sản phẩm MangoTee (ví dụ: TSHIRT, HOODIE...)',
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

      {catalogQuery.isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">
              {t('portal.vendors.mangotee.loadingCatalog', {
                defaultValue: 'Đang kết nối API MangoTee...',
              })}
            </Text>
          </div>
        </div>
      ) : catalogQuery.isError ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Text type="danger">
            {catalogQuery.error instanceof Error
              ? catalogQuery.error.message
              : 'Lỗi kết nối MangoTee API'}
          </Text>
        </div>
      ) : items.length === 0 ? (
        <Empty
          description={
            activeSearch
              ? t('portal.vendors.mangotee.emptySearch', {
                  defaultValue: `Không tìm thấy sản phẩm nào khớp với từ khóa "${activeSearch}"`,
                })
              : t('portal.vendors.mangotee.emptyCatalog', {
                  defaultValue: 'Chưa có sản phẩm nào được tải về từ MangoTee.',
                })
          }
        />
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Checkbox
              checked={isAllCurrentPageSelected}
              onChange={(e) => handleToggleSelectAll(e.target.checked)}
            >
              <Text strong>
                {t('portal.vendors.mangotee.selectAll', {
                  defaultValue: 'Chọn tất cả sản phẩm trang này',
                })}
              </Text>
            </Checkbox>
            <Text type="secondary">
              {t('portal.vendors.mangotee.foundCount', {
                defaultValue: `Tìm thấy ${total} sản phẩm trên MangoTee`,
                total,
              })}
            </Text>
          </div>

          <div
            style={{
              maxHeight: 400,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              paddingRight: 4,
            }}
          >
            {items.map((product) => {
              const id = product.id || product.sku || ''
              const isChecked = selectedProductIds.includes(id)
              const samplePrice =
                product.base_price !== undefined &&
                product.base_price !== null &&
                product.base_price !== ''
                  ? `$${Number(product.base_price).toFixed(2)}`
                  : '—'

              return (
                <Card
                  key={id}
                  size="small"
                  hoverable
                  style={{
                    cursor: 'pointer',
                    borderColor: isChecked ? '#1677ff' : undefined,
                    backgroundColor: isChecked ? '#f0f5ff' : undefined,
                  }}
                  onClick={() => handleToggleProduct(id, !isChecked)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleToggleProduct(id, e.target.checked)
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {product.sku ? <Tag color="blue">{product.sku}</Tag> : null}
                        {product.catalog_name ? (
                          <Tag color="green">{product.catalog_name}</Tag>
                        ) : null}
                        <Text strong ellipsis style={{ fontSize: 14 }}>
                          {product.name || product.title}
                        </Text>
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t('portal.vendors.mangotee.baseCostFrom', {
                            defaultValue: `Giá cơ bản: ${samplePrice}`,
                            price: samplePrice,
                          })}
                        </Text>
                        {product.currency ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('portal.vendors.mangotee.currency', {
                              defaultValue: `Tiền tệ: ${product.currency}`,
                            })}
                          </Text>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {total > limit ? (
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <Pagination
                current={page}
                pageSize={limit}
                total={total}
                size="small"
                showSizeChanger={false}
                onChange={(p) => {
                  setPage(p)
                  setSelectedProductIds([])
                }}
              />
            </div>
          ) : null}
        </>
      )}
    </Modal>
  )
})
