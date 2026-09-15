import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Button, Form, Input, Select } from 'antd'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { FeedbackAlert } from '@/shared/ui'
import { createLaunch, selectLaunchProduct } from '../api/listingLaunchApi'
import type { Launch } from '../api/listingLaunchTypes'
import { canWriteLaunch } from '../guards/listingLaunchAccess'
import { useLaunchOptions } from '../hooks/useListingLaunchQueries'
export default function LaunchDraftForm({
  launch,
  account,
  onSaved,
}: {
  launch?: Launch
  account?: CurrentAccount
  onSaved: (launch: Launch) => void
}) {
  const { t } = useTranslation()
  const options = useLaunchOptions()
  const [group, setGroup] = useState<string>()
  const [form] = Form.useForm()
  const mutation = useMutation({
    mutationFn: async (values: {
      shopId: string
      brief: string
      productTypeGroupId: string
      internalTemplateId: string
    }) =>
      launch
        ? selectLaunchProduct(launch.id, {
            productTypeGroupId: values.productTypeGroupId,
            internalTemplateId: values.internalTemplateId,
          })
        : createLaunch({
            shopId: values.shopId,
            brief: values.brief,
            marketplaceCode: 'AMAZON_US',
          }),
    onSuccess: onSaved,
  })
  const shops = options.data?.shops.filter((s) => canWriteLaunch(account, s.id)) || []
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(values) => mutation.mutate(values)}
      disabled={mutation.isPending || (Boolean(launch) && !canWriteLaunch(account, launch!.shopId))}
    >
      {mutation.isError || options.isError ? (
        <FeedbackAlert
          type="error"
          title={t('listingLaunch.error')}
          description={(mutation.error || options.error)?.message}
        />
      ) : null}
      {!launch ? (
        <>
          <Form.Item name="shopId" label={t('listingLaunch.shop')} rules={[{ required: true }]}>
            <Select options={shops.map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item
            name="brief"
            label={t('listingLaunch.brief')}
            rules={[{ required: true, whitespace: true, max: 5000 }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </>
      ) : (
        <>
          <Form.Item
            name="productTypeGroupId"
            label={t('listingLaunch.productGroup')}
            rules={[{ required: true }]}
          >
            <Select
              onChange={(id) => {
                setGroup(id)
                form.setFieldValue('internalTemplateId', undefined)
              }}
              options={options.data?.productTypeGroups
                .filter((x) => x.status !== 'INACTIVE')
                .map((x) => ({ value: x.id, label: x.name }))}
            />
          </Form.Item>
          <Form.Item
            name="internalTemplateId"
            label={t('listingLaunch.template')}
            rules={[{ required: true }]}
          >
            <Select
              options={options.data?.internalTemplates
                .filter((x) => x.status !== 'INACTIVE' && x.productTypeGroup?.id === group)
                .map((x) => ({ value: x.id, label: x.name }))}
            />
          </Form.Item>
        </>
      )}
      <Button
        type="primary"
        htmlType="submit"
        loading={mutation.isPending}
        disabled={!launch && !shops.length}
      >
        {t(launch ? 'listingLaunch.selectProduct' : 'listingLaunch.create')}
      </Button>
    </Form>
  )
}
