import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  buildMappingRuleInitialValues,
  buildMappingRulePayload,
  MAPPING_RULE_FORM_CONFIG,
} from '../data/mappingUxConfig.js'

const maxSamples = 10
const maxSampleLength = 200

const fieldMaxLengths = {
  appliesWhenValues: 40,
  configCode: 40,
  countryCode: 10,
  marketplaceCode: 40,
  matchValue: 200,
  normalizedValue: 200,
  platformProductType: 200,
  productTypeAliases: 200,
  replacementValue: 80,
  salesChannelCode: 40,
}

export function parseRuleSamples(value) {
  return String(value || '')
    .split('\n')
    .map((sample) => sample.trim())
    .filter(Boolean)
    .slice(0, maxSamples)
}

function createFieldSchema(field) {
  let schema = z.string()

  if (field.required) {
    schema = schema.trim().min(1, 'mapping.validation.requiredField')
  }

  if (field.type === 'number') {
    schema = schema.refine(
      (value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0),
      'mapping.validation.nonNegativeInteger',
    )
  }

  const maxLength = fieldMaxLengths[field.payloadKey]
  if (maxLength && field.type !== 'csv') {
    schema = schema.max(maxLength, 'mapping.validation.tooLong')
  }
  if (maxLength && field.type === 'csv') {
    schema = schema.refine(
      (value) =>
        value
          .split(',')
          .map((item) => item.trim())
          .every((item) => item.length <= maxLength),
      'mapping.validation.tooLong',
    )
  }

  return field.required ? schema : schema.default('')
}

export function createMappingRuleSchema(type) {
  const fields = MAPPING_RULE_FORM_CONFIG[type]?.fields || []
  const schema = z.object({
    ...Object.fromEntries(fields.map((field) => [field.payloadKey, createFieldSchema(field)])),
    samples: z
      .string()
      .default('')
      .refine(
        (value) =>
          String(value || '')
            .split('\n')
            .filter((sample) => sample.trim()).length <= maxSamples,
        'mapping.validation.tooManySamples',
      )
      .refine(
        (value) =>
          String(value || '')
            .split('\n')
            .every((sample) => sample.trim().length <= maxSampleLength),
        'mapping.validation.sampleTooLong',
      ),
  })

  return schema.superRefine((values, context) => {
    if (type === 'skuNormalize' && values.outputAction === 'REPLACE_SEGMENT') {
      if (!String(values.replacementValue || '').trim()) {
        context.addIssue({
          code: 'custom',
          message: 'mapping.validation.replacementRequired',
          path: ['replacementValue'],
        })
      }
    }
  })
}

export function buildRuleEvaluationPayload(type, values) {
  return {
    ruleType: type,
    rule: buildMappingRulePayload(type, values),
    samples: parseRuleSamples(values.samples),
  }
}

export function getServerFieldErrors(error) {
  const details = error?.data?.error?.details || error?.response?.data?.error?.details || []

  return details.flatMap((detail) => {
    const path = Array.isArray(detail?.path) ? detail.path : []
    const field = path[0] === 'rule' ? path[1] : path[0]
    return field ? [{ field, message: detail.message }] : []
  })
}

export function useMappingRuleForm({ rule, type }) {
  const form = useForm({
    defaultValues: {
      ...buildMappingRuleInitialValues(type, rule?.raw || rule || {}),
      samples: '',
    },
    resolver: zodResolver(createMappingRuleSchema(type)),
  })

  useEffect(() => {
    form.reset({
      ...buildMappingRuleInitialValues(type, rule?.raw || rule || {}),
      samples: '',
    })
  }, [form, rule, type])

  const applyServerErrors = (error) => {
    const fieldErrors = getServerFieldErrors(error)
    for (const { field, message } of fieldErrors) {
      form.setError(field, { message })
    }
    return fieldErrors.length > 0
  }

  return { ...form, applyServerErrors }
}

export function useMappingRulePreviewChange({ control, onPreviewChange, type }) {
  const values = useWatch({ control })

  useEffect(() => {
    onPreviewChange?.(buildRuleEvaluationPayload(type, values))
  }, [onPreviewChange, type, values])
}
