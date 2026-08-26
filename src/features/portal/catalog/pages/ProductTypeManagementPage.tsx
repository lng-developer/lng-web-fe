import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Form, Input, InputNumber, Modal, Select, Space, Tooltip } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { printMethodSelectOptions } from '@/shared/constants/printMethods'
import { PageHeader, SectionCard, StatusTag, useFeedbackToast } from '@/shared/ui'

import {
  createProductTypeGroup,
  listProductTypeGroups,
  type ProductTypeGroup,
  type ProductTypeGroupInput,
  updateProductTypeGroup,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'

const PAGE_SIZE = 20

export function ProductTypeManagementPage({ canManage }: { readonly canManage: boolean }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [form] = Form.useForm<ProductTypeGroupInput>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ProductTypeGroup | null>()
  const params = { page, limit: pageSize, search: search || undefined }
  const groups = useQuery({
    queryKey: catalogKeys.productTypes(params),
    queryFn: () => listProductTypeGroups(params),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const save = useMutation({
    mutationFn: (input: ProductTypeGroupInput) => {
      if (!editing) return createProductTypeGroup(input)
      const patch: Partial<ProductTypeGroupInput> = { ...input }
      delete patch.code
      return updateProductTypeGroup(editing.id, patch)
    },
    onSuccess: async () => {
      setEditing(undefined)
      form.resetFields()
      await queryClient.invalidateQueries({ queryKey: catalogKeys.all })
      toast('success', t('portal.catalog.master.saved'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not save product type'),
  })
  const open = (item: ProductTypeGroup | null) => {
    setEditing(item)
    form.setFieldsValue(
      item
        ? {
            code: item.code ?? '',
            name: item.name,
            sortOrder: item.sortOrder,
            printMethod: item.printMethod ?? null,
            status: item.status,
          }
        : { code: '', name: '', sortOrder: 0, printMethod: null, status: 'ACTIVE' },
    )
  }
  const columns: TableColumnsType<ProductTypeGroup> = [
    { title: t('portal.catalog.master.code'), dataIndex: 'code', width: 180 },
    { title: t('portal.catalog.master.name'), dataIndex: 'name' },
    {
      title: t('portal.catalog.master.printMethod', { defaultValue: 'Print method' }),
      dataIndex: 'printMethod',
      width: 130,
      render: (value) => value || '-',
    },
    { title: t('portal.catalog.master.order'), dataIndex: 'sortOrder', width: 100 },
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
            render: (_: unknown, row: ProductTypeGroup) => (
              <Tooltip title={t('portal.catalog.master.editProductType')}>
                <Button
                  type="text"
                  aria-label={t('portal.catalog.master.editProductType')}
                  icon={<EditOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    open(row)
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
      <PageHeader
        title={t('portal.catalog.master.productTypes')}
        description={t('portal.catalog.master.productTypeDescription')}
      />
      <SectionCard>
        <CoreDataTable
          rowKey="id"
          columns={columns}
          dataSource={groups.data?.items ?? []}
          loading={groups.isLoading}
          onRow={(row) => ({ onClick: () => canManage && open(row) })}
          pagination={{
            current: page,
            pageSize,
            total: groups.data?.pagination.total ?? groups.data?.items.length ?? 0,
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
                placeholder={t('portal.catalog.master.searchProductTypes')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={() => setPage(1)}
              />
              {canManage ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>
                  {t('portal.catalog.master.createProductType')}
                </Button>
              ) : null}
            </Space>
          }
        />
      </SectionCard>
      <Modal
        open={editing !== undefined}
        title={t(
          editing
            ? 'portal.catalog.master.editProductType'
            : 'portal.catalog.master.createProductType',
        )}
        okText={t('portal.catalog.master.save')}
        confirmLoading={save.isPending}
        onCancel={() => setEditing(undefined)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
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
          <Form.Item name="sortOrder" label={t('portal.catalog.master.order')}>
            <InputNumber precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="printMethod"
            label={t('portal.catalog.master.printMethod', { defaultValue: 'Print method' })}
          >
            <Select allowClear options={printMethodSelectOptions} />
          </Form.Item>
          <Form.Item name="status" label={t('portal.catalog.master.status')}>
            <Select
              options={['ACTIVE', 'INACTIVE'].map((value) => ({
                value,
                label: t(`portal.catalog.master.statuses.${value}`, { defaultValue: value }),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
