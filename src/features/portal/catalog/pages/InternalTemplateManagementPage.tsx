import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeleteOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tabs,
  Typography,
  Upload,
} from 'antd'

import { DataTable, PageHeader, SectionCard, StatusTag, useFeedbackToast } from '@/shared/ui'

import {
  createInternalTemplate,
  getInternalTemplate,
  type InternalTemplate,
  type InternalTemplateInput,
  listInternalTemplates,
  listProductTypeGroups,
  updateInternalTemplate,
  uploadCatalogAsset,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'

const PAGE_SIZE = 20
const FIELD_TYPES = ['TEXT', 'IMAGE', 'OPTION', 'FILE', 'NUMBER', 'DATE', 'UNKNOWN']
const FIELD_SOURCES = ['CUSTOMER_INPUT', 'AMAZON_CUSTOMIZATION', 'MANUAL', 'SYSTEM']
const SLOT_TYPES = ['IMAGE', 'TEXT', 'VECTOR', 'PDF', 'MIXED']
const OUTPUT_ROLES = ['FRONT', 'BACK', 'LEFT_SLEEVE', 'RIGHT_SLEEVE', 'MOCKUP', 'PREVIEW', 'OTHER']
const ASSET_TYPES = [
  'PSD_TEMPLATE',
  'PREVIEW_IMAGE',
  'MASK_FILE',
  'SVG_TEMPLATE',
  'SAMPLE_OUTPUT',
  'OTHER',
]

export function InternalTemplateManagementPage({ canManage }: { readonly canManage: boolean }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [form] = Form.useForm<InternalTemplateInput & { code?: string }>()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<InternalTemplate | null>()
  const params = { page, limit: PAGE_SIZE, q: search || undefined }
  const templates = useQuery({
    queryKey: catalogKeys.templates(params),
    queryFn: () => listInternalTemplates(params),
    retry: false,
  })
  const groups = useQuery({
    queryKey: catalogKeys.productTypes({ all: true }),
    queryFn: () => listProductTypeGroups({ page: 1, limit: 100, status: 'ACTIVE' }),
    retry: false,
  })
  const fieldKeys = (Form.useWatch('requiredFields', form) ?? [])
    .map(({ key }) => key)
    .filter(Boolean)
  const save = useMutation({
    mutationFn: (input: InternalTemplateInput & { code?: string }) => {
      if (!editing) return createInternalTemplate(input as InternalTemplateInput & { code: string })
      const patch = { ...input }
      delete patch.code
      return updateInternalTemplate(editing.id, patch)
    },
    onSuccess: async () => {
      setEditing(undefined)
      form.resetFields()
      await queryClient.invalidateQueries({ queryKey: catalogKeys.all })
      toast('success', t('portal.catalog.master.templateSaved'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not save internal template'),
  })
  const open = async (item: InternalTemplate | null) => {
    setEditing(item)
    if (!item) {
      form.setFieldsValue({
        code: '',
        name: '',
        productTypeGroupId: '',
        description: '',
        requiresPsd: true,
        status: 'ACTIVE',
        requiredFields: [],
        artworkSlots: [],
        designAssets: [],
      })
      return
    }
    const detail = await getInternalTemplate(item.id)
    form.setFieldsValue({
      name: detail.name,
      code: detail.code,
      description: detail.description,
      productTypeGroupId: detail.productTypeGroup?.id ?? '',
      requiresPsd: detail.requiresPsd,
      status: detail.status,
      requiredFields: detail.requiredFields ?? [],
      artworkSlots: detail.artworkSlots ?? [],
      designAssets: detail.designAssets ?? [],
    })
  }
  const columns: TableColumnsType<InternalTemplate> = [
    {
      title: 'Template',
      render: (_, row) => (
        <>
          <Typography.Text strong>{row.code}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{row.name}</Typography.Text>
        </>
      ),
    },
    { title: 'Product type', render: (_, row) => row.productTypeGroup?.name ?? '-' },
    { title: 'Fields', dataIndex: 'requiredFieldsCount', width: 90 },
    { title: 'Slots', dataIndex: 'artworkSlotsCount', width: 90 },
    { title: 'Assets', dataIndex: 'designAssetsCount', width: 90 },
    { title: 'PSD', width: 100, render: (_, row) => (row.requiresPsd ? 'Required' : 'Optional') },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (value) => (
        <StatusTag status={value === 'ACTIVE' ? 'operational' : 'cancelled'}>{value}</StatusTag>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        title={t('portal.catalog.master.templates')}
        description={t('portal.catalog.master.templateDescription')}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void templates.refetch()}>
              {t('portal.catalog.refresh')}
            </Button>
            {canManage ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => void open(null)}>
                {t('portal.catalog.master.createTemplate')}
              </Button>
            ) : null}
          </Space>
        }
      />
      <SectionCard>
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={templates.data?.items ?? []}
          loading={templates.isLoading}
          onRow={(row) => ({ onClick: () => canManage && void open(row) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: templates.data?.pagination.total,
            onChange: setPage,
          }}
          toolbar={
            <Input.Search
              allowClear
              placeholder={t('portal.catalog.master.searchTemplates')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onSearch={() => setPage(1)}
            />
          }
        />
      </SectionCard>
      <Modal
        open={editing !== undefined}
        width={920}
        title={t(
          editing ? 'portal.catalog.master.editTemplate' : 'portal.catalog.master.createTemplate',
        )}
        okText={t('portal.catalog.master.saveTemplate')}
        confirmLoading={save.isPending}
        onCancel={() => setEditing(undefined)}
        onOk={() => form.submit()}
        destroyOnHidden
        styles={{ body: { maxHeight: 'calc(100dvh - 220px)', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
              <Input disabled={Boolean(editing)} />
            </Form.Item>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="productTypeGroupId" label="Product type" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={(groups.data?.items ?? []).map(({ id, name, code }) => ({
                  value: id,
                  label: `${name} (${code})`,
                }))}
              />
            </Form.Item>
            <Form.Item name="status" label="Status">
              <Select options={['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: value }))} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="requiresPsd" label="PSD template" valuePropName="checked">
            <Switch checkedChildren="Required" unCheckedChildren="Not required" />
          </Form.Item>
          <Tabs
            items={[
              {
                key: 'fields',
                label: `Required fields (${fieldKeys.length})`,
                children: (
                  <Form.List name="requiredFields">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {fields.map(({ key, name }) => (
                          <Space key={key} align="start" wrap>
                            <Form.Item name={[name, 'key']} rules={[{ required: true }]}>
                              <Input placeholder="Field key" />
                            </Form.Item>
                            <Form.Item name={[name, 'label']}>
                              <Input placeholder="User label" />
                            </Form.Item>
                            <Form.Item name={[name, 'type']} rules={[{ required: true }]}>
                              <Select
                                style={{ width: 130 }}
                                placeholder="Type"
                                options={FIELD_TYPES.map((value) => ({ value, label: value }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'source']}>
                              <Select
                                style={{ width: 190 }}
                                placeholder="Source"
                                options={FIELD_SOURCES.map((value) => ({ value, label: value }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'required']} valuePropName="checked">
                              <Checkbox>Required</Checkbox>
                            </Form.Item>
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                            />
                          </Space>
                        ))}
                        <Button
                          block
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() =>
                            add({
                              type: 'TEXT',
                              source: 'CUSTOMER_INPUT',
                              required: true,
                              validation: {},
                            })
                          }
                        >
                          Add field
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                ),
              },
              {
                key: 'slots',
                label: 'Artwork slots',
                children: (
                  <Form.List name="artworkSlots">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {fields.map(({ key, name }) => (
                          <Space key={key} align="start" wrap>
                            <Form.Item name={[name, 'key']} rules={[{ required: true }]}>
                              <Input placeholder="Slot key" />
                            </Form.Item>
                            <Form.Item name={[name, 'label']}>
                              <Input placeholder="User label" />
                            </Form.Item>
                            <Form.Item name={[name, 'type']}>
                              <Select
                                style={{ width: 130 }}
                                placeholder="Type"
                                options={SLOT_TYPES.map((value) => ({ value, label: value }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'outputRole']}>
                              <Select
                                style={{ width: 150 }}
                                placeholder="Output"
                                options={OUTPUT_ROLES.map((value) => ({ value, label: value }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'acceptedFieldKeys']}>
                              <Select
                                mode="multiple"
                                style={{ minWidth: 210 }}
                                placeholder="Accepted fields"
                                options={fieldKeys.map((value) => ({ value, label: value }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'required']} valuePropName="checked">
                              <Checkbox>Required</Checkbox>
                            </Form.Item>
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                            />
                          </Space>
                        ))}
                        <Button
                          block
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() =>
                            add({ type: 'MIXED', required: true, acceptedFieldKeys: [] })
                          }
                        >
                          Add artwork slot
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                ),
              },
              {
                key: 'assets',
                label: 'Design assets',
                children: (
                  <Form.List name="designAssets">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {fields.map(({ key, name }) => (
                          <Space key={key} align="start" wrap>
                            <Upload
                              showUploadList={false}
                              beforeUpload={async (file) => {
                                try {
                                  const asset = await uploadCatalogAsset(file)
                                  form.setFieldValue(
                                    ['designAssets', name, 'mediaAssetId'],
                                    asset.id,
                                  )
                                  toast('success', `${asset.originalFilename} uploaded`)
                                } catch (error) {
                                  toast(
                                    'error',
                                    error instanceof Error
                                      ? error.message
                                      : 'Could not upload asset',
                                  )
                                }
                                return Upload.LIST_IGNORE
                              }}
                            >
                              <Button icon={<UploadOutlined />}>Upload file</Button>
                            </Upload>
                            <Form.Item
                              name={[name, 'mediaAssetId']}
                              rules={[{ required: true, message: 'Upload a file' }]}
                            >
                              <Input readOnly placeholder="Asset ID is filled after upload" />
                            </Form.Item>
                            <Form.Item name={[name, 'type']} rules={[{ required: true }]}>
                              <Select
                                style={{ width: 170 }}
                                placeholder="Asset type"
                                options={ASSET_TYPES.map((value) => ({ value, label: value }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'label']}>
                              <Input placeholder="Label" />
                            </Form.Item>
                            <Form.Item name={[name, 'version']}>
                              <Input placeholder="Version" />
                            </Form.Item>
                            <Form.Item name={[name, 'status']}>
                              <Select
                                style={{ width: 110 }}
                                options={['ACTIVE', 'INACTIVE'].map((value) => ({
                                  value,
                                  label: value,
                                }))}
                              />
                            </Form.Item>
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                            />
                          </Space>
                        ))}
                        <Button
                          block
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() =>
                            add({ type: 'PSD_TEMPLATE', version: 'v1', status: 'ACTIVE' })
                          }
                        >
                          Add design asset
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </section>
  )
}
