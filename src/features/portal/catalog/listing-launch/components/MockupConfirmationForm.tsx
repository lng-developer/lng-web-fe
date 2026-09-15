import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Button, Card, Checkbox, Form, Input, Select } from 'antd'
import { FeedbackAlert, useFeedbackToast } from '@/shared/ui'
import { saveLaunchInputs } from '../api/listingLaunchApi'
import type { InputCommand, Launch } from '../api/listingLaunchTypes'
type Fields = {
  keyword: string
  brand: string
  productName: string
  material: string
  features: string
  personalization?: string
  careInstructions?: string
  colors: string[]
  factsConfirmed: boolean
  mockupConfirmed: boolean
  detectedText: string
  theme: string
  designDescription: string
}
export default function MockupConfirmationForm({
  launch,
  canWrite,
  onSaved,
  onDirty,
}: {
  launch: Launch
  canWrite: boolean
  onSaved: () => void
  onDirty: (dirty: boolean) => void
}) {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const [form] = Form.useForm<Fields>()
  const dirty = useRef(false)
  const version = useRef(launch.contentInputVersion)
  const [chosen, setChosen] = useState<{ id: string; revision: number } | null>(null)
  const ctx = launch.contentInputs?.designContext
  const source =
    chosen || (ctx ? { id: ctx.sourceAnalysisRunId, revision: ctx.mockupRevision } : null)
  useEffect(() => {
    if (dirty.current) return
    const inputs = launch.contentInputs
    version.current = launch.contentInputVersion
    form.setFieldsValue({
      keyword: inputs?.keyword || '',
      ...inputs?.productFacts,
      personalization: inputs?.productFacts.personalization || '',
      careInstructions: inputs?.productFacts.careInstructions || '',
      features: inputs?.productFacts.features.join('\n') || '',
      colors: inputs?.availableColors.map((x) => x.code) || [],
      factsConfirmed: Boolean(inputs?.factsConfirmed),
      detectedText: inputs?.designContext?.detectedText || '',
      theme: inputs?.designContext?.theme || '',
      designDescription: inputs?.designContext?.designDescription || '',
      mockupConfirmed: launch.mockupConfirmationUsable,
    })
  }, [launch, form])
  const mutation = useMutation({
    mutationFn: (values: Fields) => {
      const command: InputCommand = {
        expectedInputVersion: version.current,
        profileCode: 'AMAZON_US_APPAREL_CONTENT_V1',
        language: 'en-US',
        keyword: values.keyword,
        productFacts: {
          brand: values.brand,
          productName: values.productName,
          material: values.material,
          features: values.features
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean),
          ...(values.personalization?.trim()
            ? { personalization: values.personalization.trim() }
            : {}),
          ...(values.careInstructions?.trim()
            ? { careInstructions: values.careInstructions.trim() }
            : {}),
        },
        availableColors: values.colors.map((code) => ({
          code,
          label: launch.contentInputs?.availableColors.find((c) => c.code === code)?.label || code,
        })),
        factsConfirmed: true,
        ...(launch.mockup && source
          ? {
              mockupReview: {
                sourceAnalysisRunId: source.id,
                mockupConfirmed: true,
                detectedText: values.detectedText || '',
                theme: values.theme || '',
                designDescription: values.designDescription,
              },
            }
          : {}),
      }
      return saveLaunchInputs(launch.id, command)
    },
    onSuccess: () => {
      dirty.current = false
      onDirty(false)
      setChosen(null)
      toast('success', t('listingLaunch.saved'))
      onSaved()
    },
  })
  const markDirty = () => {
    dirty.current = true
    onDirty(true)
  }
  const useResult = () => {
    const run = launch.latestMockupAnalysis
    if (!run?.result || run.isStale) return
    form.setFieldsValue({
      ...run.result,
      keyword: run.result.suggestedKeyword,
      mockupConfirmed: false,
    })
    setChosen({ id: run.id, revision: run.mockupRevision })
    markDirty()
  }
  const validSource = source?.revision === launch.mockupRevision
  const required = [{ required: true, message: t('listingLaunch.required') }]
  return (
    <Card title={t('listingLaunch.confirmTitle')}>
      <Form
        form={form}
        layout="vertical"
        disabled={!canWrite || mutation.isPending}
        onValuesChange={markDirty}
        onFinish={(values) => mutation.mutate(values)}
      >
        {mutation.error ? (
          <FeedbackAlert
            type="error"
            title={t('listingLaunch.error')}
            description={mutation.error.message}
          />
        ) : null}
        {launch.mockup ? (
          <>
            <Button
              disabled={!launch.latestMockupAnalysis?.result || launch.latestMockupAnalysis.isStale}
              onClick={useResult}
            >
              {t('listingLaunch.useAnalysis')}
            </Button>
            {!validSource ? (
              <FeedbackAlert type="warning" title={t('listingLaunch.confirmRequired')} />
            ) : null}
            {(['detectedText', 'theme', 'designDescription'] as const).map((name) => (
              <Form.Item
                key={name}
                name={name}
                label={t(`listingLaunch.${name}`)}
                rules={name === 'designDescription' ? required : []}
              >
                <Input.TextArea rows={name === 'theme' ? 1 : 3} />
              </Form.Item>
            ))}
            <Form.Item
              name="mockupConfirmed"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value === true
                      ? Promise.resolve()
                      : Promise.reject(new Error(t('listingLaunch.confirmRequired'))),
                },
              ]}
            >
              <Checkbox>{t('listingLaunch.confirmImage')}</Checkbox>
            </Form.Item>
          </>
        ) : null}
        {(['keyword', 'brand', 'productName', 'material'] as const).map((name) => (
          <Form.Item name={name} key={name} label={t(`listingLaunch.${name}`)} rules={required}>
            <Input />
          </Form.Item>
        ))}
        <Form.Item name="features" label={t('listingLaunch.features')} rules={required}>
          <Input.TextArea rows={3} />
        </Form.Item>
        {(['personalization', 'careInstructions'] as const).map((name) => (
          <Form.Item key={name} name={name} label={t(`listingLaunch.${name}`)}>
            <Input.TextArea rows={2} />
          </Form.Item>
        ))}
        <Form.Item name="colors" label={t('listingLaunch.colors')} rules={required}>
          <Select mode="tags" tokenSeparators={[',']} />
        </Form.Item>
        <Form.Item
          name="factsConfirmed"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value === true
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('listingLaunch.required'))),
            },
          ]}
        >
          <Checkbox>{t('listingLaunch.confirmFacts')}</Checkbox>
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={mutation.isPending}
          disabled={Boolean(launch.mockup) && !validSource}
        >
          {t('listingLaunch.saveInputs')}
        </Button>
      </Form>
    </Card>
  )
}
