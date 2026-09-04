import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  Tooltip,
  Typography,
  Upload,
} from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { SectionCard, StatusTag, useFeedbackToast } from '@/shared/ui'

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<InternalTemplate | null>()
  const params = { page, limit: pageSize, q: search || undefined }
  const templates = useQuery({
    queryKey: catalogKeys.templates(params),
    queryFn: () => listInternalTemplates(params),
    placeholderData: keepPreviousData,
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
      toast(
        'error',
        error instanceof Error
          ? error.message
          : t('portal.catalog.master.templateEditor.saveFailed'),
      ),
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
      title: t('portal.catalog.master.templateEditor.columns.template'),
      render: (_, row) => (
        <>
          <Typography.Text strong>{row.code}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{row.name}</Typography.Text>
        </>
      ),
    },
    {
      title: t('portal.catalog.master.templateEditor.columns.productType'),
      render: (_, row) => row.productTypeGroup?.name ?? '-',
    },
    {
      title: t('portal.catalog.master.templateEditor.columns.fields'),
      dataIndex: 'requiredFieldsCount',
      width: 90,
    },
    {
      title: t('portal.catalog.master.templateEditor.columns.slots'),
      dataIndex: 'artworkSlotsCount',
      width: 90,
    },
    {
      title: t('portal.catalog.master.templateEditor.columns.assets'),
      dataIndex: 'designAssetsCount',
      width: 90,
    },
    {
      title: t('portal.catalog.master.templateEditor.columns.psd'),
      width: 100,
      render: (_, row) =>
        row.requiresPsd
          ? t('portal.catalog.master.templateEditor.required')
          : t('portal.catalog.master.templateEditor.optional'),
    },
    {
      title: t('portal.catalog.master.status'),
      dataIndex: 'status',
      width: 150,
      render: (value) => (
        <StatusTag status={value === 'ACTIVE' ? 'operational' : 'cancelled'}>
          {t(`portal.catalog.master.statuses.${value}`, { defaultValue: value })}
        </StatusTag>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            title: t('portal.catalog.actions'),
            width: 76,
            fixed: 'right' as const,
            render: (_: unknown, row: InternalTemplate) => (
              <Tooltip title={t('portal.catalog.master.editTemplate')}>
                <Button
                  type="text"
                  aria-label={t('portal.catalog.master.editTemplate')}
                  icon={<EditOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    void open(row)
                  }}
                />
              </Tooltip>
            ),
          },
        ]
      : []),
  ]

  return (
    <section>
      <SectionCard>
        <CoreDataTable
          rowKey="id"
          columns={columns}
          dataSource={templates.data?.items ?? []}
          loading={templates.isLoading}
          onRow={(row) => ({ onClick: () => canManage && void open(row) })}
          pagination={{
            current: page,
            pageSize,
            total: templates.data?.pagination.total ?? templates.data?.items.length ?? 0,
            hideOnSinglePage: false,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1)
              setPageSize(nextPageSize)
            },
          }}
          toolbar={
            <Space wrap>
              <Input.Search
                allowClear
                placeholder={t('portal.catalog.master.searchTemplates')}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                onSearch={() => setPage(1)}
              />
              {canManage ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => void open(null)}>
                  {t('portal.catalog.master.createTemplate')}
                </Button>
              ) : null}
            </Space>
          }
        />
      </SectionCard>
      <Modal
        open={editing !== undefined}
        width={920}
        title={
          editing
            ? t('portal.catalog.master.editTemplate')
            : t('portal.catalog.master.createTemplate')
        }
        okText={t('portal.catalog.master.saveTemplate')}
        confirmLoading={save.isPending}
        onCancel={() => setEditing(undefined)}
        onOk={() => form.submit()}
        destroyOnHidden
        styles={{ body: { maxHeight: 'calc(100dvh - 220px)', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="code"
              label={t('portal.catalog.master.code')}
              rules={[{ required: true }]}
            >
              <Input disabled={Boolean(editing)} />
            </Form.Item>
            <Form.Item
              name="name"
              label={t('portal.catalog.master.name')}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="productTypeGroupId"
              label={t('portal.catalog.master.templateEditor.productType')}
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={(groups.data?.items ?? []).map(({ id, name, code }) => ({
                  value: id,
                  label: `${name} (${code})`,
                }))}
              />
            </Form.Item>
            <Form.Item name="status" label={t('portal.catalog.master.status')}>
              <Select
                options={['ACTIVE', 'INACTIVE'].map((value) => ({
                  value,
                  label: t(`portal.catalog.master.statuses.${value}`),
                }))}
              />
            </Form.Item>
          </div>
          <Form.Item
            name="description"
            label={t('portal.catalog.master.templateEditor.description')}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="requiresPsd"
            label={t('portal.catalog.master.templateEditor.psdTemplate')}
            valuePropName="checked"
          >
            <Switch
              checkedChildren={t('portal.catalog.master.templateEditor.required')}
              unCheckedChildren={t('portal.catalog.master.templateEditor.notRequired')}
            />
          </Form.Item>
          <Tabs
            items={[
              {
                key: 'fields',
                label: t('portal.catalog.master.templateEditor.requiredFieldsCount', {
                  count: fieldKeys.length,
                }),
                children: (
                  <Form.List name="requiredFields">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {fields.map(({ key, name }) => (
                          <Space key={key} align="start" wrap>
                            <Form.Item name={[name, 'key']} rules={[{ required: true }]}>
                              <Input
                                placeholder={t('portal.catalog.master.templateEditor.fieldKey')}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'label']}>
                              <Input
                                placeholder={t('portal.catalog.master.templateEditor.userLabel')}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'type']} rules={[{ required: true }]}>
                              <Select
                                style={{ width: 130 }}
                                placeholder={t('portal.catalog.master.templateEditor.type')}
                                options={FIELD_TYPES.map((value) => ({
                                  value,
                                  label: t(
                                    `portal.catalog.master.templateEditor.fieldTypes.${value}`,
                                  ),
                                }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'source']}>
                              <Select
                                style={{ width: 190 }}
                                placeholder={t('portal.catalog.master.templateEditor.source')}
                                options={FIELD_SOURCES.map((value) => ({
                                  value,
                                  label: t(
                                    `portal.catalog.master.templateEditor.fieldSources.${value}`,
                                  ),
                                }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'required']} valuePropName="checked">
                              <Checkbox>
                                {t('portal.catalog.master.templateEditor.required')}
                              </Checkbox>
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
                          {t('portal.catalog.master.templateEditor.addField')}
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                ),
              },
              {
                key: 'slots',
                label: t('portal.catalog.master.templateEditor.artworkSlots'),
                children: (
                  <Form.List name="artworkSlots">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {fields.map(({ key, name }) => (
                          <Space key={key} align="start" wrap>
                            <Form.Item name={[name, 'key']} rules={[{ required: true }]}>
                              <Input
                                placeholder={t('portal.catalog.master.templateEditor.slotKey')}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'label']}>
                              <Input
                                placeholder={t('portal.catalog.master.templateEditor.userLabel')}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'type']}>
                              <Select
                                style={{ width: 130 }}
                                placeholder={t('portal.catalog.master.templateEditor.type')}
                                options={SLOT_TYPES.map((value) => ({
                                  value,
                                  label: t(
                                    `portal.catalog.master.templateEditor.slotTypes.${value}`,
                                  ),
                                }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'outputRole']}>
                              <Select
                                style={{ width: 150 }}
                                placeholder={t('portal.catalog.master.templateEditor.output')}
                                options={OUTPUT_ROLES.map((value) => ({
                                  value,
                                  label: t(
                                    `portal.catalog.master.templateEditor.outputRoles.${value}`,
                                  ),
                                }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'acceptedFieldKeys']}>
                              <Select
                                mode="multiple"
                                style={{ minWidth: 210 }}
                                placeholder={t(
                                  'portal.catalog.master.templateEditor.acceptedFields',
                                )}
                                options={fieldKeys.map((value) => ({ value, label: value }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'required']} valuePropName="checked">
                              <Checkbox>
                                {t('portal.catalog.master.templateEditor.required')}
                              </Checkbox>
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
                          {t('portal.catalog.master.templateEditor.addArtworkSlot')}
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                ),
              },
              {
                key: 'assets',
                label: t('portal.catalog.master.templateEditor.designAssets'),
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
                                  toast(
                                    'success',
                                    t('portal.catalog.master.templateEditor.uploaded', {
                                      filename: asset.originalFilename,
                                    }),
                                  )
                                } catch (error) {
                                  toast(
                                    'error',
                                    error instanceof Error
                                      ? error.message
                                      : t('portal.catalog.master.templateEditor.uploadFailed'),
                                  )
                                }
                                return Upload.LIST_IGNORE
                              }}
                            >
                              <Button icon={<UploadOutlined />}>
                                {t('portal.catalog.master.templateEditor.uploadFile')}
                              </Button>
                            </Upload>
                            <Form.Item
                              name={[name, 'mediaAssetId']}
                              rules={[
                                {
                                  required: true,
                                  message: t(
                                    'portal.catalog.master.templateEditor.uploadFileRequired',
                                  ),
                                },
                              ]}
                            >
                              <Input
                                readOnly
                                placeholder={t(
                                  'portal.catalog.master.templateEditor.assetIdPlaceholder',
                                )}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'type']} rules={[{ required: true }]}>
                              <Select
                                style={{ width: 170 }}
                                placeholder={t('portal.catalog.master.templateEditor.assetType')}
                                options={ASSET_TYPES.map((value) => ({
                                  value,
                                  label: t(
                                    `portal.catalog.master.templateEditor.assetTypes.${value}`,
                                  ),
                                }))}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'label']}>
                              <Input
                                placeholder={t('portal.catalog.master.templateEditor.label')}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'version']}>
                              <Input
                                placeholder={t('portal.catalog.master.templateEditor.version')}
                              />
                            </Form.Item>
                            <Form.Item name={[name, 'status']}>
                              <Select
                                style={{ width: 110 }}
                                options={['ACTIVE', 'INACTIVE'].map((value) => ({
                                  value,
                                  label: t(`portal.catalog.master.statuses.${value}`),
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
                          {t('portal.catalog.master.templateEditor.addDesignAsset')}
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
