import { useState } from 'react'
import {
  EditOutlined,
  FileImageOutlined,
  PlusOutlined,
  SendOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Modal, Select, Space, Table, Tag, Tooltip, Typography, Upload } from 'antd'

import { useFeedbackToast } from '@/shared/ui'

import {
  createListingVariant,
  type InternalTemplate,
  type Listing,
  type ListingVariant,
  type ListingVariantInput,
  listListingVariants,
  type ProductTypeGroup,
  requestListingVariantPsd,
  setDefaultListingVariant,
  updateListingVariant,
  uploadCatalogAsset,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'

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
  const makeDefault = useMutation({
    mutationFn: (variantId: string) => setDefaultListingVariant(listing.id, variantId),
    onSuccess: refresh,
  })
  const requestPsd = useMutation({
    mutationFn: (variantId: string) => requestListingVariantPsd(listing.id, variantId),
    onSuccess: async () => {
      await refresh()
      toast('success', 'PSD task requested')
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not request PSD'),
  })
  const uploadPreview = useMutation({
    mutationFn: async ({ variantId, file }: { variantId: string; file: File }) => {
      const asset = await uploadCatalogAsset(file)
      return updateListingVariant(listing.id, variantId, { previewAssetId: asset.id })
    },
    onSuccess: async () => {
      await refresh()
      toast('success', 'Preview uploaded')
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not upload preview'),
  })
  const open = (variant: ListingVariant | 'create') => {
    setEditing(variant)
    form.setFieldsValue(
      variant === 'create'
        ? { status: 'ACTIVE' }
        : {
            productTypeGroupId: variant.productTypeGroup.id,
            internalTemplateId: variant.internalTemplate?.id ?? null,
            status: variant.status,
          },
    )
  }
  const selectedProductType = Form.useWatch('productTypeGroupId', form)
  const templateOptions = templates
    .filter(
      (template) => !selectedProductType || template.productTypeGroup?.id === selectedProductType,
    )
    .map((template) => ({ label: template.name, value: template.id }))

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Product variants
        </Typography.Title>
        {canWrite ? (
          <Button size="small" icon={<PlusOutlined />} onClick={() => open('create')}>
            Add variant
          </Button>
        ) : null}
      </Space>
      <Table<ListingVariant>
        rowKey="id"
        size="small"
        loading={variants.isLoading}
        dataSource={variants.data ?? []}
        pagination={false}
        columns={[
          { title: 'Product type', render: (_, row) => row.productTypeGroup.name },
          { title: 'Template', render: (_, row) => row.internalTemplate?.name ?? '-' },
          {
            title: 'PSD',
            render: (_, row) => (
              <Space size="small">
                <Tag color={row.psdReadiness.status === 'PRESENT' ? 'green' : 'orange'}>
                  {row.psdReadiness.status}
                </Tag>
                {canWrite && row.psdReadiness.status === 'MISSING' ? (
                  <Tooltip title="Request PSD">
                    <Button
                      aria-label="Request PSD"
                      type="text"
                      size="small"
                      icon={<SendOutlined />}
                      onClick={() => requestPsd.mutate(row.id)}
                      loading={requestPsd.isPending && requestPsd.variables === row.id}
                    />
                  </Tooltip>
                ) : null}
              </Space>
            ),
          },
          {
            title: 'Preview',
            render: (_, row) => (
              <Space size="small">
                <Tag color={row.previewAssetId ? 'green' : 'default'}>
                  {row.previewAssetId ? 'UPLOADED' : 'MISSING'}
                </Tag>
                {canWrite ? (
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      uploadPreview.mutate({ variantId: row.id, file })
                      return false
                    }}
                  >
                    <Tooltip title="Upload preview image">
                      <Button type="text" size="small" icon={<FileImageOutlined />} />
                    </Tooltip>
                  </Upload>
                ) : null}
              </Space>
            ),
          },
          { title: 'Status', render: (_, row) => <Tag>{row.status}</Tag> },
          {
            title: 'Default',
            render: (_, row) =>
              row.id === listing.defaultVariantId ? (
                <Tag color="blue">Default</Tag>
              ) : (
                canWrite && (
                  <Tooltip title="Set as default variant">
                    <Button
                      aria-label="Set as default variant"
                      type="text"
                      size="small"
                      icon={<StarOutlined />}
                      onClick={() => makeDefault.mutate(row.id)}
                    />
                  </Tooltip>
                )
              ),
          },
          canWrite
            ? {
                title: '',
                width: 40,
                render: (_, row) => (
                  <Tooltip title="Edit variant">
                    <Button
                      aria-label="Edit"
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => open(row)}
                    />
                  </Tooltip>
                ),
              }
            : {},
        ]}
      />
      <Modal
        open={Boolean(editing)}
        title={editing === 'create' ? 'Add listing variant' : 'Edit listing variant'}
        okText="Save"
        confirmLoading={save.isPending}
        onCancel={() => setEditing(undefined)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(input) => save.mutate(input)}>
          <Form.Item name="productTypeGroupId" label="Product type" rules={[{ required: true }]}>
            <Select options={productTypes.map(({ id, name }) => ({ label: name, value: id }))} />
          </Form.Item>
          <Form.Item name="internalTemplateId" label="Internal template">
            <Select allowClear options={templateOptions} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={['ACTIVE', 'INACTIVE'].map((value) => ({ label: value, value }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
