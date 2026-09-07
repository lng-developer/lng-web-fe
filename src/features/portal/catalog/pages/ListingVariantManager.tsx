import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CopyOutlined,
  EditOutlined,
  FileImageOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd'

import { printMethodSelectOptions } from '@/shared/constants/printMethods'
import { StatusTag, useFeedbackToast } from '@/shared/ui'

import {
  applyListingVariantPsdToCompatible,
  createListingVariant,
  type InternalTemplate,
  type Listing,
  type ListingVariant,
  type ListingVariantInput,
  listListingVariants,
  type ProductTypeGroup,
  requestListingVariantPsd,
  updateListingVariant,
  uploadCatalogAsset,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'

function previewColor(previewAssetId: string | null) {
  return previewAssetId ? 'green' : 'volcano'
}

function psdSourceKey(source?: string | null) {
  if (source === 'LISTING_VARIANT') return 'variant'
  if (source === 'LISTING_DEFAULT') return 'default'
  if (source === 'TEMPLATE') return 'template'
  return 'noSource'
}

function scaleColor(level?: string) {
  if (level === 'HARD') return 'orange'
  if (level === 'SPECIAL') return 'red'
  return 'green'
}

export function ListingVariantManager({
  listing,
  productTypes,
  templates,
  canWrite,
}: {
  readonly listing: Listing
  readonly productTypes: ProductTypeGroup[]
  readonly templates: InternalTemplate[]
  readonly canWrite: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [editing, setEditing] = useState<ListingVariant | 'create'>()
  const [form] = Form.useForm<ListingVariantInput>()
  const variants = useQuery({
    queryKey: catalogKeys.variants(listing.id),
    queryFn: () => listListingVariants(listing.id),
  })
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: catalogKeys.variants(listing.id) }),
      queryClient.invalidateQueries({ queryKey: catalogKeys.detail(listing.id) }),
    ])
  }
  const save = useMutation({
    mutationFn: (input: ListingVariantInput) =>
      editing === 'create'
        ? createListingVariant(listing.id, input)
        : updateListingVariant(listing.id, editing!.id, input),
    onSuccess: async () => {
      setEditing(undefined)
      form.resetFields()
      await refresh()
    },
  })
  const requestPsd = useMutation({
    mutationFn: (variantId: string) => requestListingVariantPsd(listing.id, variantId),
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.catalog.variants.psdTaskRequested'))
    },
    onError: (error) =>
      toast(
        'error',
        error instanceof Error ? error.message : t('portal.catalog.variants.requestPsdFailed'),
      ),
  })
  const applyPsd = useMutation({
    mutationFn: (variantId: string) => applyListingVariantPsdToCompatible(listing.id, variantId),
    onSuccess: async (result) => {
      await refresh()
      toast('success', t('portal.catalog.variants.psdApplied', { count: result.matchedCount }))
    },
    onError: (error) =>
      toast(
        'error',
        error instanceof Error ? error.message : t('portal.catalog.variants.applyPsdFailed'),
      ),
  })
  const uploadPreview = useMutation({
    mutationFn: async ({ variantId, file }: { variantId: string; file: File }) => {
      const asset = await uploadCatalogAsset(file)
      return updateListingVariant(listing.id, variantId, { previewAssetId: asset.id })
    },
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.catalog.variants.previewUploaded'))
    },
    onError: (error) =>
      toast(
        'error',
        error instanceof Error ? error.message : t('portal.catalog.variants.uploadPreviewFailed'),
      ),
  })
  const open = useCallback(
    (variant: ListingVariant | 'create') => {
      setEditing(variant)
      form.setFieldsValue(
        variant === 'create'
          ? { scaleDifficulty: { level: 'NORMAL', reason: null }, status: 'ACTIVE' }
          : {
              productTypeGroupId: variant.productTypeGroup.id,
              internalTemplateId: variant.internalTemplate?.id ?? null,
              printMethod: variant.printMethod ?? null,
              scaleDifficulty: variant.scaleDifficulty ?? { level: 'NORMAL', reason: null },
              status: variant.status,
            },
      )
    },
    [form],
  )
  const selectedProductType = Form.useWatch('productTypeGroupId', form)
  const templateOptions = templates
    .filter(
      (template) => !selectedProductType || template.productTypeGroup?.id === selectedProductType,
    )
    .map((template) => ({ label: template.name, value: template.id }))

  const columns: TableColumnsType<ListingVariant> = useMemo(
    () => [
      {
        title: t('portal.catalog.fields.productType'),
        width: 140,
        ellipsis: true,
        render: (_, row) => row.productTypeGroup.name,
      },
      {
        title: t('portal.catalog.variants.method'),
        width: 100,
        ellipsis: true,
        render: (_, row) => row.printMethod || row.productTypeGroup.printMethod || '-',
      },
      {
        title: t('portal.catalog.variants.template'),
        width: 140,
        ellipsis: true,
        render: (_, row) => row.internalTemplate?.name ?? '-',
      },
      {
        title: 'PSD',
        width: 180,
        render: (_, row) => (
          <Space size="small" wrap>
            <StatusTag status={row.psdReadiness.status === 'PRESENT' ? 'operational' : 'warning'}>
              {row.psdReadiness.status}
            </StatusTag>
            <Tag color={row.psdReadiness.source === 'LISTING_DEFAULT' ? 'blue' : 'default'}>
              {t(`portal.catalog.psd.${psdSourceKey(row.psdReadiness.source)}`)}
            </Tag>
            {canWrite && row.psdReadiness.status === 'MISSING' ? (
              <Tooltip title={t('portal.catalog.variants.requestPsd')}>
                <Button
                  aria-label={t('portal.catalog.variants.requestPsd')}
                  type="text"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => requestPsd.mutate(row.id)}
                  loading={requestPsd.isPending && requestPsd.variables === row.id}
                  disabled={requestPsd.isPending}
                />
              </Tooltip>
            ) : null}
            {canWrite && row.psdReadiness.status === 'PRESENT' ? (
              <Tooltip title={t('portal.catalog.variants.applyPsd')}>
                <Button
                  aria-label={t('portal.catalog.variants.applyPsd')}
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  loading={applyPsd.isPending && applyPsd.variables === row.id}
                  disabled={applyPsd.isPending}
                  onClick={() =>
                    Modal.confirm({
                      title: t('portal.catalog.variants.applyPsdTitle'),
                      content: t('portal.catalog.variants.applyPsdContent'),
                      okText: t('portal.catalog.variants.apply'),
                      onOk: () => applyPsd.mutate(row.id),
                    })
                  }
                />
              </Tooltip>
            ) : null}
          </Space>
        ),
      },
      {
        title: t('portal.catalog.columns.preview'),
        width: 130,
        render: (_, row) => (
          <Space size="small">
            <Tag color={previewColor(row.previewAssetId)}>
              {row.previewAssetId ? 'UPLOADED' : 'MISSING'}
            </Tag>
            {canWrite ? (
              <Upload
                accept="image/*"
                showUploadList={false}
                disabled={uploadPreview.isPending}
                beforeUpload={(file) => {
                  uploadPreview.mutate({ variantId: row.id, file })
                  return false
                }}
              >
                <Tooltip title={t('portal.catalog.variants.uploadPreview')}>
                  <Button
                    type="text"
                    size="small"
                    icon={<FileImageOutlined />}
                    loading={
                      uploadPreview.isPending && uploadPreview.variables?.variantId === row.id
                    }
                    disabled={uploadPreview.isPending}
                  />
                </Tooltip>
              </Upload>
            ) : null}
          </Space>
        ),
      },
      {
        title: t('portal.catalog.variants.scale'),
        width: 150,
        render: (_, row) => (
          <Space size="small">
            <Tag color={scaleColor(row.scaleDifficulty?.level)}>
              {row.scaleDifficulty?.level ?? 'NORMAL'}
            </Tag>
            {row.scaleDifficulty?.reason ? (
              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 160 }}>
                {row.scaleDifficulty.reason}
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: t('portal.catalog.master.status'),
        dataIndex: 'status',
        width: 100,
        align: 'center',
        render: (_, row) => (
          <StatusTag status={row.status === 'ACTIVE' ? 'operational' : 'draft'}>
            {t(`portal.catalog.master.statuses.${row.status}`, {
              defaultValue: row.status,
            })}
          </StatusTag>
        ),
      },
      ...(canWrite
        ? [
            {
              title: '',
              key: 'actions',
              width: 50,
              fixed: 'right' as const,
              render: (_: unknown, row: ListingVariant) => (
                <Tooltip title={t('portal.catalog.variants.edit')}>
                  <Button
                    aria-label={t('portal.catalog.variants.edit')}
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => open(row)}
                  />
                </Tooltip>
              ),
            },
          ]
        : []),
    ],
    [applyPsd, canWrite, open, requestPsd, t, uploadPreview],
  )

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t('portal.catalog.variants.title', { count: variants.data?.length ?? 0 })}
        </Typography.Title>
        {canWrite ? (
          <Button size="small" icon={<PlusOutlined />} onClick={() => open('create')}>
            {t('portal.catalog.variants.add')}
          </Button>
        ) : null}
      </Space>
      <Table<ListingVariant>
        rowKey="id"
        size="small"
        tableLayout="fixed"
        scroll={{ x: 890 }}
        loading={variants.isLoading}
        dataSource={variants.data ?? []}
        pagination={false}
        columns={columns}
      />
      <Modal
        open={Boolean(editing)}
        title={
          editing === 'create'
            ? t('portal.catalog.variants.addTitle')
            : t('portal.catalog.variants.editTitle')
        }
        okText={t('portal.catalog.save')}
        confirmLoading={save.isPending}
        onCancel={() => setEditing(undefined)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(input) => save.mutate(input)}>
          <Form.Item
            name="productTypeGroupId"
            label={t('portal.catalog.fields.productType')}
            rules={[{ required: true }]}
          >
            <Select options={productTypes.map(({ id, name }) => ({ label: name, value: id }))} />
          </Form.Item>
          <Form.Item name="internalTemplateId" label={t('portal.catalog.fields.internalTemplate')}>
            <Select allowClear options={templateOptions} />
          </Form.Item>
          <Form.Item name="printMethod" label={t('portal.catalog.master.printMethod')}>
            <Select
              allowClear
              options={printMethodSelectOptions}
              placeholder={t('portal.catalog.variants.inheritProductType')}
            />
          </Form.Item>
          <Form.Item
            name={['scaleDifficulty', 'level']}
            label={t('portal.catalog.variants.scaleDifficulty')}
          >
            <Select
              options={['NORMAL', 'HARD', 'SPECIAL'].map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item
            name={['scaleDifficulty', 'reason']}
            label={t('portal.catalog.variants.scaleNote')}
          >
            <Input.TextArea
              rows={3}
              placeholder={t('portal.catalog.variants.scaleNotePlaceholder')}
            />
          </Form.Item>
          <Form.Item name="status" label={t('portal.catalog.master.status')}>
            <Select options={['ACTIVE', 'INACTIVE'].map((value) => ({ label: value, value }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
