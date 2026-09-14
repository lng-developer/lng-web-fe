import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Flex, Form, Input, Modal, Select, Switch, Tabs, Tooltip } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { SectionCard, StatusTag, TableTextCell, useFeedbackToast } from '@/shared/ui'

import {
  getInternalTemplate,
  type InternalTemplate,
  type InternalTemplateInput,
} from '../api/catalogApi'
import {
  TemplateAssetListEditor,
  TemplateFieldListEditor,
  TemplateSlotListEditor,
} from '../components'
import { useInternalTemplatesQuery } from '../hooks'

export function InternalTemplateManagementPage({ canManage }: { readonly canManage: boolean }) {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const [form] = Form.useForm<InternalTemplateInput & { code?: string }>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<InternalTemplate | null>()
  const [templateDetailLoading, setTemplateDetailLoading] = useState(false)

  const {
    templates,
    productTypeGroups: groups,
    save,
  } = useInternalTemplatesQuery({
    page,
    pageSize,
    search,
    onSaveSuccess: () => {
      setEditing(undefined)
      form.resetFields()
    },
  })

  const fieldKeys = (Form.useWatch('requiredFields', form) ?? [])
    .map(({ key }) => key)
    .filter(Boolean)

  const open = useCallback(
    async (item: InternalTemplate | null) => {
      setEditing(item)
      if (!item) {
        setTemplateDetailLoading(false)
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
      setTemplateDetailLoading(true)
      try {
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
      } catch {
        toast('error', t('portal.catalog.master.templateEditor.saveFailed'))
        setEditing(undefined)
      } finally {
        setTemplateDetailLoading(false)
      }
    },
    [form, t, toast],
  )
  const columns: TableColumnsType<InternalTemplate> = useMemo(
    () => [
      {
        title: t('portal.catalog.master.templateEditor.columns.template'),
        width: 240,
        render: (_, row) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}
          >
            <TableTextCell code strong value={row.code} />
            <TableTextCell secondary value={row.name} />
          </div>
        ),
      },
      {
        title: t('portal.catalog.master.templateEditor.columns.productType'),
        width: 200,
        render: (_, row) => <TableTextCell value={row.productTypeGroup?.name} fallback="-" />,
      },
      {
        title: t('portal.catalog.master.templateEditor.columns.fields'),
        dataIndex: 'requiredFieldsCount',
        width: 90,
        align: 'right',
      },
      {
        title: t('portal.catalog.master.templateEditor.columns.slots'),
        dataIndex: 'artworkSlotsCount',
        width: 90,
        align: 'right',
      },
      {
        title: t('portal.catalog.master.templateEditor.columns.assets'),
        dataIndex: 'designAssetsCount',
        width: 90,
        align: 'right',
      },
      {
        title: t('portal.catalog.master.templateEditor.columns.psd'),
        width: 110,
        align: 'center',
        render: (_, row) =>
          t(
            row.requiresPsd
              ? 'portal.catalog.master.templateEditor.required'
              : 'portal.catalog.master.templateEditor.optional',
          ),
      },
      {
        title: t('portal.catalog.master.status'),
        dataIndex: 'status',
        width: 120,
        align: 'center',
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
              width: 80,
              align: 'center' as const,
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
    ],
    [canManage, open, t],
  )

  return (
    <section>
      <Flex
        align="center"
        justify="space-between"
        gap={12}
        wrap
        style={{ marginBottom: 16, width: '100%' }}
      >
        <Input.Search
          allowClear
          placeholder={t('portal.catalog.master.searchTemplates')}
          style={{ maxWidth: '100%', width: 320 }}
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
      </Flex>
      <SectionCard>
        <CoreDataTable
          fillViewport
          rowKey="id"
          tableLayout="fixed"
          scroll={{ x: 1_020 }}
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
        />
      </SectionCard>
      <Modal
        open={editing !== undefined}
        width={920}
        title={t(
          editing ? 'portal.catalog.master.editTemplate' : 'portal.catalog.master.createTemplate',
        )}
        okText={t('portal.catalog.master.saveTemplate')}
        okButtonProps={{ disabled: templateDetailLoading }}
        confirmLoading={save.isPending}
        onCancel={() => {
          setEditing(undefined)
          setTemplateDetailLoading(false)
        }}
        onOk={() => !templateDetailLoading && form.submit()}
        destroyOnHidden
        styles={{ body: { maxHeight: 'calc(100dvh - 220px)', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          disabled={templateDetailLoading}
          layout="vertical"
          onFinish={(values) => save.mutate({ input: values, editing })}
        >
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
                children: <TemplateFieldListEditor />,
              },
              {
                key: 'slots',
                label: t('portal.catalog.master.templateEditor.artworkSlots'),
                children: <TemplateSlotListEditor fieldKeys={fieldKeys} />,
              },
              {
                key: 'assets',
                label: t('portal.catalog.master.templateEditor.designAssets'),
                children: <TemplateAssetListEditor />,
              },
            ]}
          />
        </Form>
      </Modal>
    </section>
  )
}
