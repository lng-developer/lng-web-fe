import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  List,
  Pagination,
  Space,
  Typography,
} from 'antd'

import { FilterBar, SearchInput, StatusTag } from '@/shared/ui'

import { VendorCostCenter, VendorProduct } from '../api/vendorApi'
import styles from './VendorWorkspacePage.module.scss'

interface VendorWorkspaceCostCenterDrawerProps {
  readonly open: boolean
  readonly product?: VendorProduct
  readonly canWrite: boolean
  readonly searchCostCenters: string
  readonly costCentersPage: number
  readonly costCenters: VendorCostCenter[] | undefined
  readonly costCentersLoading: boolean
  readonly costCentersTotal: number | undefined
  readonly costCentersError: unknown
  readonly onSearchCostCentersChange: (value: string) => void
  readonly onCostCentersPageChange: (page: number) => void
  readonly onClose: () => void
  readonly onAddCostCenter: (product: VendorProduct) => void
  readonly onOpenCostCenterImport: (product: VendorProduct) => void
  readonly onEditCostCenter: (product: VendorProduct, costCenter: VendorCostCenter) => void
}

const formatMoney = (value?: number | null, currency = 'USD') =>
  value == null
    ? '—'
    : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100)

const withUnit = (value?: number | null, unit?: string | null) =>
  value == null ? '—' : `${value}${unit ? ` ${unit}` : ''}`

export function VendorWorkspaceCostCenterDrawer({
  open,
  product,
  canWrite,
  searchCostCenters,
  costCentersPage,
  costCenters,
  costCentersLoading,
  costCentersTotal,
  costCentersError,
  onSearchCostCentersChange,
  onCostCentersPageChange,
  onClose,
  onAddCostCenter,
  onOpenCostCenterImport,
  onEditCostCenter,
}: VendorWorkspaceCostCenterDrawerProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [selectedId, setSelectedId] = useState<string>()
  const items = costCenters ?? []
  const selected = items.find((item) => item.id === selectedId) ?? items[0]

  const detailItems = selected
    ? [
        { key: 'code', label: t('vendors.code'), children: selected.code },
        { key: 'sku', label: t('vendors.sku'), children: selected.sku || '—' },
        { key: 'lngCode', label: t('vendors.lngCode'), children: selected.lngCode || '—' },
        {
          key: 'printMethod',
          label: t('vendors.printMethod'),
          children: selected.printMethod || '—',
        },
        {
          key: 'standardSize',
          label: t('vendors.standardSize'),
          children: selected.standardSize || '—',
        },
        {
          key: 'standardColor',
          label: t('vendors.standardColor'),
          children: selected.standardColor || '—',
        },
        { key: 'vendorSize', label: t('vendors.vendorSize'), children: selected.vendorSize || '—' },
        {
          key: 'vendorColor',
          label: t('vendors.vendorColor'),
          children: selected.vendorColor || '—',
        },
      ]
    : []

  return (
    <Drawer
      title={
        product ? t('vendors.productCostCenters', { name: product.name }) : t('vendors.costCenters')
      }
      destroyOnClose
      width="min(1440px, calc(100vw - 32px))"
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 0 } }}
    >
      {product ? (
        <div className={styles.costCenterDrawer}>
          <FilterBar
            label={t('vendors.filters.label')}
            contentClassName={styles.filters}
            actions={
              canWrite ? (
                <Space size={8} align="center">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => onAddCostCenter(product)}
                  >
                    {t('vendors.addCostCenter')}
                  </Button>
                  <Button icon={<UploadOutlined />} onClick={() => onOpenCostCenterImport(product)}>
                    {t('vendors.importCostCenters')}
                  </Button>
                </Space>
              ) : null
            }
          >
            <SearchInput
              value={searchCostCenters}
              onSearchChange={onSearchCostCentersChange}
              placeholder={t('vendors.searchCostCenters')}
            />
          </FilterBar>

          {costCentersError ? (
            <Typography.Text type="danger">
              {costCentersError instanceof Error
                ? costCentersError.message
                : t('vendors.branchUnavailable')}
            </Typography.Text>
          ) : (
            <div className={styles.costCenterWorkbench}>
              <aside className={styles.costCenterList} aria-label={t('vendors.costCenters')}>
                <List
                  dataSource={items}
                  loading={costCentersLoading}
                  locale={{ emptyText: t('vendors.noCostCenters') }}
                  renderItem={(item) => (
                    <List.Item className={styles.costCenterListItem}>
                      <button
                        type="button"
                        className={
                          item.id === selected?.id
                            ? styles.costCenterListButtonActive
                            : styles.costCenterListButton
                        }
                        aria-pressed={item.id === selected?.id}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <Typography.Text strong ellipsis>
                          {item.name}
                        </Typography.Text>
                        <Typography.Text type="secondary" ellipsis>
                          {item.sku || item.code}
                        </Typography.Text>
                        <StatusTag status={item.status === 'ACTIVE' ? 'operational' : 'draft'}>
                          {t(`vendors.status.${item.status}`)}
                        </StatusTag>
                      </button>
                    </List.Item>
                  )}
                />
                <Pagination
                  current={costCentersPage}
                  pageSize={20}
                  total={costCentersTotal}
                  size="small"
                  showSizeChanger={false}
                  onChange={onCostCentersPageChange}
                />
              </aside>

              <section className={styles.costCenterDetail} aria-live="polite">
                {selected ? (
                  <>
                    <div className={styles.costCenterDetailHeader}>
                      <div>
                        <Typography.Title level={4}>{selected.name}</Typography.Title>
                        <Typography.Text type="secondary">{selected.code}</Typography.Text>
                      </div>
                      <Space>
                        <StatusTag status={selected.status === 'ACTIVE' ? 'operational' : 'draft'}>
                          {t(`vendors.status.${selected.status}`)}
                        </StatusTag>
                        {canWrite ? (
                          <Button
                            icon={<EditOutlined />}
                            onClick={() => onEditCostCenter(product, selected)}
                          >
                            {t('vendors.editCostCenter', { name: selected.name })}
                          </Button>
                        ) : null}
                      </Space>
                    </div>

                    <Card size="small" title={t('vendors.overview')}>
                      <Descriptions size="small" column={2} items={detailItems} />
                    </Card>
                    <Card size="small" title={t('vendors.shipping')}>
                      <Descriptions
                        size="small"
                        column={3}
                        items={[
                          {
                            key: 'domestic',
                            label: t('vendors.domesticShipping'),
                            children: formatMoney(
                              selected.domesticShipping.economyAmount,
                              selected.currency,
                            ),
                          },
                          {
                            key: 'international',
                            label: t('vendors.internationalShipping'),
                            children: formatMoney(
                              selected.internationalShipping.economyAmount,
                              selected.currency,
                            ),
                          },
                          {
                            key: 'priority',
                            label: t('vendors.priorityShipping'),
                            children: formatMoney(
                              selected.priorityShipping.economyAmount,
                              selected.currency,
                            ),
                          },
                          {
                            key: 'domesticAdditional',
                            label: `${t('vendors.domesticShipping')} · ${t('vendors.additionalAmount')}`,
                            children: formatMoney(
                              selected.domesticShipping.additionalAmount,
                              selected.currency,
                            ),
                          },
                          {
                            key: 'internationalAdditional',
                            label: `${t('vendors.internationalShipping')} · ${t('vendors.additionalAmount')}`,
                            children: formatMoney(
                              selected.internationalShipping.additionalAmount,
                              selected.currency,
                            ),
                          },
                          {
                            key: 'priorityAdditional',
                            label: `${t('vendors.priorityShipping')} · ${t('vendors.additionalAmount')}`,
                            children: formatMoney(
                              selected.priorityShipping.additionalAmount,
                              selected.currency,
                            ),
                          },
                        ]}
                      />
                    </Card>
                    <Card size="small" title={t('vendors.measurements')}>
                      <Descriptions
                        size="small"
                        column={2}
                        items={[
                          {
                            key: 'weight',
                            label: t('vendors.weight'),
                            children: withUnit(selected.weight, selected.weightUnit),
                          },
                          {
                            key: 'dimensions',
                            label: t('vendors.dimensions'),
                            children:
                              selected.width == null &&
                              selected.length == null &&
                              selected.height == null
                                ? '—'
                                : `${selected.width ?? '—'} × ${selected.length ?? '—'} × ${selected.height ?? '—'}${selected.dimensionUnit ? ` ${selected.dimensionUnit}` : ''}`,
                          },
                        ]}
                      />
                    </Card>
                    <Card size="small" title={t('vendors.pricing')}>
                      <Descriptions
                        size="small"
                        column={2}
                        items={[
                          {
                            key: 'base',
                            label: t('vendors.baseCostAmount'),
                            children: formatMoney(selected.baseCostAmount, selected.currency),
                          },
                          {
                            key: 'tax',
                            label: t('vendors.importTaxAmount'),
                            children: formatMoney(selected.importTaxAmount, selected.currency),
                          },
                          {
                            key: 'embroidery',
                            label: t('vendors.embroideryAmount'),
                            children: formatMoney(
                              selected.additionalCosts.embroideryAmount,
                              selected.currency,
                            ),
                          },
                          {
                            key: 'twoSided',
                            label: t('vendors.twoSidedPrintAmount'),
                            children: formatMoney(
                              selected.additionalCosts.twoSidedPrintAmount,
                              selected.currency,
                            ),
                          },
                          {
                            key: 'twoPosition',
                            label: t('vendors.twoPositionPrintAmount'),
                            children: formatMoney(
                              selected.additionalCosts.twoPositionPrintAmount,
                              selected.currency,
                            ),
                          },
                        ]}
                      />
                    </Card>
                  </>
                ) : (
                  <Empty description={t('vendors.noCostCenters')} />
                )}
              </section>
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  )
}
