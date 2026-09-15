import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Form, Input, Modal, Pagination, Select, Space, Tag } from 'antd'
import { ApiError } from '@/shared/api'
import { FeedbackAlert, useFeedbackToast } from '@/shared/ui'
import {
  approveContentVersion,
  createContentRevision,
  requestContentGeneration,
} from '../api/listingLaunchApi'
import { listingLaunchKeys } from '../api/listingLaunchKeys'
import type { Content, Launch, Version } from '../api/listingLaunchTypes'
import { useGenerationIntent } from '../hooks/useGenerationIntent'
import { activeRun } from '../hooks/useLaunchRunPolling'
import { useLaunchVersions } from '../hooks/useListingLaunchQueries'
import styles from '../pages/ListingLaunchDetailPage.module.scss'
type Fields = Omit<Content, 'searchTerms'> & { terms: string }
export default function ContentReviewPanel({
  launch,
  canWrite,
  onSaved,
  dirty,
  onDirty,
}: {
  launch: Launch
  canWrite: boolean
  onSaved: () => void
  dirty: boolean
  onDirty?: (dirty: boolean) => void
}) {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Version | null>(null)
  const [edited, setEdited] = useState(false)
  const [codes, setCodes] = useState<string[]>([])
  const [form] = Form.useForm<Fields>()
  const versions = useLaunchVersions(launch.id, page)
  const intent = useGenerationIntent(launch.id, 'content')
  useEffect(() => {
    if (launch.latestRun?.status === 'SUCCEEDED')
      void client.invalidateQueries({
        queryKey: [...listingLaunchKeys.detail(launch.id), 'versions'],
      })
  }, [launch.id, launch.latestRun?.id, launch.latestRun?.status, client])
  const choose = (version: Version) => {
    const apply = () => {
      setSelected(version)
      form.setFieldsValue({ ...version.content, terms: version.content.searchTerms.join('\n') })
      setCodes(version.content.recommendedColors.map((c) => c.code))
      setEdited(false)
      onDirty?.(false)
    }
    if (edited)
      Modal.confirm({
        title: t('listingLaunch.unsaved'),
        onOk: apply,
        okText: t('listingLaunch.discard'),
        cancelText: t('listingLaunch.cancel'),
      })
    else apply()
  }
  const generated = useMutation({
    mutationFn: () =>
      requestContentGeneration(launch.id, {
        ...intent.getOrCreate({ expectedInputVersion: launch.contentInputVersion }),
        expectedInputVersion: launch.contentInputVersion,
      }),
    onSuccess: (result) => {
      intent.clear()
      if (result.dispatchWarning) toast('warning', t('listingLaunch.dispatchPending'))
    },
    onError: (error) => {
      if (error instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(error.status || 0))
        intent.clear()
    },
    onSettled: onSaved,
  })
  const revised = useMutation({
    mutationFn: (values: Fields) => {
      const searchTerms = values.terms
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
      if (new TextEncoder().encode(searchTerms.join(' ')).length > 249)
        throw new Error(t('listingLaunch.termLimit'))
      return createContentRevision(launch.id, selected!.id, {
        title: values.title,
        bullets: values.bullets,
        searchTerms,
        recommendedColors: values.recommendedColors,
      })
    },
    onSuccess: (version) => {
      setSelected(version)
      setEdited(false)
      onDirty?.(false)
      toast('success', t('listingLaunch.saved'))
      onSaved()
    },
  })
  const approved = useMutation({
    mutationFn: () =>
      approveContentVersion(launch.id, selected!.id, {
        expectedInputVersion: launch.contentInputVersion,
        selectedColorCodes: codes,
      }),
    onSuccess: () => {
      toast('success', t('listingLaunch.approved'))
      onSaved()
    },
  })
  const liveVersion = versions.data?.items.find((v) => v.id === selected?.id)
  const stale = Boolean(
    selected &&
    (selected.inputVersion !== launch.contentInputVersion || (liveVersion || selected).isStale),
  )
  const limit = (max: number) => ({
    validator: (_: unknown, value: string) =>
      value?.trim() && [...value].length <= max
        ? Promise.resolve()
        : Promise.reject(new Error(t('listingLaunch.textLimit', { max }))),
  })
  return (
    <Card title={t('listingLaunch.content')}>
      <div className={styles.stack}>
        <Space wrap>
          <Button
            type="primary"
            onClick={() => generated.mutate()}
            loading={generated.isPending}
            disabled={
              !canWrite ||
              !launch.contentInputs ||
              (Boolean(launch.mockup) && !launch.mockupConfirmationUsable) ||
              dirty ||
              edited ||
              activeRun(launch.latestRun?.status)
            }
          >
            {t('listingLaunch.generate')}
          </Button>
          {launch.latestRun ? <Tag>{t(`listingLaunch.${launch.latestRun.status}`)}</Tag> : null}
          {launch.approvedContentUsable ? (
            <Tag color="success">{t('listingLaunch.approved')}</Tag>
          ) : null}
        </Space>
        {generated.error || revised.error || approved.error || versions.error ? (
          <FeedbackAlert
            type="error"
            title={t('listingLaunch.error')}
            description={
              (generated.error || revised.error || approved.error || versions.error)?.message
            }
          />
        ) : null}
        {launch.latestRun?.errorCode ? (
          <FeedbackAlert
            type="warning"
            title={launch.latestRun.errorCode}
            description={launch.latestRun.errorMessage || undefined}
          />
        ) : null}
        {launch.latestRun?.validationErrors.map((e, i) => (
          <Tag key={i}>
            {e.field}: {e.code}
          </Tag>
        ))}
        <Select
          aria-label={t('listingLaunch.versions')}
          placeholder={t('listingLaunch.versions')}
          value={selected?.id}
          onChange={(id) => {
            const version = versions.data?.items.find((v) => v.id === id)
            if (version) choose(version)
          }}
          options={versions.data?.items.map((v) => ({
            value: v.id,
            label: `v${v.version} · ${v.source}${v.isStale ? ` · ${t('listingLaunch.stale')}` : ''}`,
          }))}
        />
        <Pagination
          current={page}
          pageSize={10}
          total={versions.data?.total || 0}
          onChange={setPage}
          showSizeChanger={false}
        />
        {selected ? (
          <>
            {stale ? <FeedbackAlert type="warning" title={t('listingLaunch.stale')} /> : null}
            <Form
              form={form}
              layout="vertical"
              disabled={!canWrite || revised.isPending || approved.isPending}
              onValuesChange={() => {
                setEdited(true)
                onDirty?.(true)
              }}
              onFinish={(values) => revised.mutate(values)}
            >
              <Form.Item name="title" label={t('listingLaunch.contentTitle')} rules={[limit(200)]}>
                <Input showCount count={{ strategy: (value) => [...value].length }} />
              </Form.Item>
              {[0, 1, 2, 3, 4].map((i) => (
                <Form.Item
                  key={i}
                  name={['bullets', i]}
                  label={t('listingLaunch.bullet', { number: i + 1 })}
                  rules={[limit(500)]}
                >
                  <Input.TextArea
                    rows={2}
                    showCount
                    count={{ strategy: (value) => [...value].length }}
                  />
                </Form.Item>
              ))}
              <Form.Item name="terms" label={t('listingLaunch.terms')} rules={[{ required: true }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.List name="recommendedColors">
                {(fields) =>
                  fields.map((field) => (
                    <Space key={field.key} align="start">
                      <Form.Item
                        name={[field.name, 'code']}
                        label={t('listingLaunch.color')}
                        rules={[{ required: true }]}
                      >
                        <Select
                          options={launch.contentInputs?.availableColors.map((c) => ({
                            value: c.code,
                            label: c.label,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'reason']}
                        label={t('listingLaunch.reason')}
                        rules={[limit(300)]}
                      >
                        <Input />
                      </Form.Item>
                    </Space>
                  ))
                }
              </Form.List>
              <Button htmlType="submit" loading={revised.isPending} disabled={!edited}>
                {t('listingLaunch.saveRevision')}
              </Button>
            </Form>
            <Select
              mode="multiple"
              aria-label={t('listingLaunch.approvalColors')}
              placeholder={t('listingLaunch.approvalColors')}
              value={codes}
              onChange={setCodes}
              disabled={!canWrite}
              options={launch.contentInputs?.availableColors.map((c) => ({
                value: c.code,
                label: c.label,
              }))}
            />
            <Button
              onClick={() => approved.mutate()}
              loading={approved.isPending}
              disabled={
                !canWrite ||
                dirty ||
                edited ||
                stale ||
                codes.length < 1 ||
                codes.length > 30 ||
                codes.some(
                  (code) => !launch.contentInputs?.availableColors.some((c) => c.code === code),
                )
              }
            >
              {t('listingLaunch.approve')}
            </Button>
          </>
        ) : null}
      </div>
    </Card>
  )
}
