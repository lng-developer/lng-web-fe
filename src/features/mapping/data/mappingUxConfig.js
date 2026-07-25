export const TAB_GUIDES = {
  resolve: {
    description:
      'Use this queue for blocked order items. Preview the mapping result, then auto resolve or select a vendor cost center.',
    primaryAction: 'Preview or resolve the selected order item.',
  },
  skuNormalize: {
    description:
      'Use this when raw marketplace SKUs need cleanup before the system reads the config code.',
    primaryAction: 'Create a rule that removes or replaces a SKU segment.',
  },
  skuConfig: {
    description:
      'Use this to connect a SKU config code to the internal product type and production template.',
    primaryAction: 'Map config code plus marketplace product type to internal catalog data.',
  },
  semanticRules: {
    description:
      'Use this when customer option labels need to be understood as Size, Color, Product Type, or another role.',
    primaryAction: 'Teach the system what a customer-facing option label means.',
  },
  valueAliases: {
    description:
      'Use this when customer option values need standard wording, for example XXL becomes 2XL.',
    primaryAction: 'Normalize customer values before vendor matching.',
  },
  vendorRouting: {
    description:
      'Use this to prefer a vendor for a product type, shop, channel, or marketplace when multiple vendors match.',
    primaryAction: 'Set vendor priority for a mapping scope.',
  },
}

export const STATIC_OPTIONS = {
  marketplaceCode: [
    { label: 'Amazon US', value: 'AMAZON_US' },
    { label: 'Etsy', value: 'ETSY' },
  ],
  matchType: [
    { label: 'Exact match', value: 'EXACT' },
    { label: 'Contains text', value: 'CONTAINS' },
  ],
  outputAction: [
    { label: 'Remove segment', value: 'REMOVE_SEGMENT' },
    { label: 'Replace segment', value: 'REPLACE_SEGMENT' },
  ],
  patternType: [{ label: 'SKU segment', value: 'SEGMENT' }],
  salesChannelCode: [
    { label: 'Amazon', value: 'AMAZON' },
    { label: 'Etsy', value: 'ETSY' },
  ],
  segmentRole: [
    { label: 'Employee', value: 'EMPLOYEE' },
    { label: 'Size', value: 'SIZE' },
    { label: 'Color', value: 'COLOR' },
    { label: 'Config', value: 'CONFIG' },
    { label: 'Country', value: 'COUNTRY' },
    { label: 'Other', value: 'OTHER' },
  ],
  semanticRole: [
    { label: 'Size', value: 'SIZE' },
    { label: 'Color', value: 'COLOR' },
    { label: 'Product type', value: 'PRODUCT_TYPE' },
    { label: 'Style', value: 'STYLE' },
    { label: 'Material', value: 'MATERIAL' },
    { label: 'Custom text', value: 'CUSTOM_TEXT' },
    { label: 'Customer image', value: 'CUSTOMER_IMAGE' },
    { label: 'Other', value: 'OTHER' },
  ],
  status: [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ],
}

const commonScopeFields = [
  {
    helperText: 'Choose a shop, or Global when the rule should apply to every shop.',
    label: 'Shop',
    optionSource: 'shops',
    payloadKey: 'shopId',
    required: false,
    type: 'select',
  },
  {
    advanced: true,
    defaultValue: 'AMAZON',
    helperText: 'Where this rule applies.',
    label: 'Sales channel',
    optionsKey: 'salesChannelCode',
    payloadKey: 'salesChannelCode',
    required: true,
    type: 'select',
  },
  {
    advanced: true,
    defaultValue: 'AMAZON_US',
    helperText: 'Marketplace scope for the rule.',
    label: 'Marketplace',
    optionsKey: 'marketplaceCode',
    payloadKey: 'marketplaceCode',
    required: true,
    type: 'select',
  },
]

const commonTailFields = [
  {
    advanced: true,
    defaultValue: '100',
    helperText: 'Higher priority wins when multiple rules match.',
    label: 'Priority',
    payloadKey: 'priority',
    required: true,
    type: 'number',
  },
  {
    advanced: true,
    defaultValue: 'ACTIVE',
    helperText: 'Disable a rule instead of deleting it.',
    label: 'Status',
    optionsKey: 'status',
    payloadKey: 'status',
    required: true,
    type: 'select',
  },
]

export const MAPPING_RULE_FORM_CONFIG = {
  semanticRules: {
    description: TAB_GUIDES.semanticRules.description,
    fields: [
      ...commonScopeFields,
      {
        helperText: 'What this customer-facing option represents.',
        label: 'Option meaning',
        optionsKey: 'semanticRole',
        payloadKey: 'semanticRole',
        required: true,
        type: 'select',
      },
      {
        helperText: 'Example: Select Your Choose Size.',
        label: 'Customer option label',
        payloadKey: 'matchValue',
        required: true,
      },
      {
        advanced: true,
        defaultValue: 'CONTAINS',
        helperText: 'How the label should be matched.',
        label: 'Matching method',
        optionsKey: 'matchType',
        payloadKey: 'matchType',
        type: 'select',
      },
      {
        advanced: true,
        helperText: 'Optional: limit this rule to one internal product type.',
        label: 'Product type limit',
        optionSource: 'productTypes',
        payloadKey: 'productTypeGroupId',
        type: 'select',
      },
      ...commonTailFields,
    ],
    howToFill: [
      'Pick what the customer option means.',
      'Enter the option label exactly as the marketplace sends it.',
      'Leave Advanced unchanged unless this rule should apply to a narrower scope.',
    ],
    title: 'Semantic rule',
  },
  skuConfig: {
    description: TAB_GUIDES.skuConfig.description,
    fields: [
      ...commonScopeFields,
      {
        helperText: 'The config segment parsed from SKU, for example TS1S.',
        label: 'SKU config code',
        payloadKey: 'configCode',
        required: true,
      },
      {
        advanced: true,
        helperText: 'Marketplace product type text.',
        label: 'Marketplace product type',
        payloadKey: 'platformProductType',
      },
      {
        advanced: true,
        helperText: 'Comma separated aliases, for example UNISEX T-SHIRT, UNISEX TSHIRT.',
        label: 'Product type aliases',
        payloadKey: 'productTypeAliases',
        type: 'csv',
      },
      {
        advanced: true,
        helperText: 'Optional country code such as US.',
        label: 'Country',
        payloadKey: 'countryCode',
      },
      {
        helperText: 'Internal product type used by catalog and vendor matching.',
        label: 'Internal product type',
        optionSource: 'productTypes',
        payloadKey: 'productTypeGroupId',
        required: true,
        type: 'select',
      },
      {
        advanced: true,
        helperText: 'Internal production template for this product type.',
        label: 'Internal template',
        optionSource: 'templates',
        payloadKey: 'internalTemplateId',
        type: 'select',
      },
      ...commonTailFields,
    ],
    howToFill: [
      'Enter the SKU config code parsed from the marketplace SKU.',
      'Choose the internal product type the order should use.',
      'Use Advanced only for aliases, country, template, or scope overrides.',
    ],
    title: 'SKU config rule',
  },
  skuNormalize: {
    description: TAB_GUIDES.skuNormalize.description,
    fields: [
      ...commonScopeFields,
      {
        advanced: true,
        helperText: 'Optional config code this SKU cleanup applies to.',
        label: 'SKU config code',
        payloadKey: 'configCode',
      },
      {
        advanced: true,
        defaultValue: 'SEGMENT',
        helperText: 'How the SKU should be read.',
        label: 'SKU pattern',
        optionsKey: 'patternType',
        payloadKey: 'patternType',
        required: true,
        type: 'select',
      },
      {
        helperText: 'Zero-based segment position in the SKU.',
        label: 'SKU segment position',
        payloadKey: 'segmentIndex',
        required: true,
        type: 'number',
      },
      {
        helperText: 'Meaning of this SKU segment.',
        label: 'Segment meaning',
        optionsKey: 'segmentRole',
        payloadKey: 'segmentRole',
        required: true,
        type: 'select',
      },
      {
        advanced: true,
        helperText: 'Comma separated values that activate this rule.',
        label: 'Apply only when value is',
        payloadKey: 'appliesWhenValues',
        required: true,
        type: 'csv',
      },
      {
        defaultValue: 'REMOVE_SEGMENT',
        helperText: 'What to do with the matched segment.',
        label: 'Cleanup action',
        optionsKey: 'outputAction',
        payloadKey: 'outputAction',
        required: true,
        type: 'select',
      },
      {
        advanced: true,
        helperText: 'Only needed for replace action.',
        label: 'Replacement value',
        payloadKey: 'replacementValue',
      },
      ...commonTailFields,
    ],
    howToFill: [
      'Enter which SKU segment position should be cleaned.',
      'Choose what that segment means and what cleanup action to apply.',
      'Use Advanced only when this cleanup applies to a specific config code or value.',
    ],
    title: 'SKU normalize rule',
  },
  valueAliases: {
    description: TAB_GUIDES.valueAliases.description,
    fields: [
      ...commonScopeFields,
      {
        helperText: 'The kind of customer value being normalized.',
        label: 'Value group',
        optionsKey: 'semanticRole',
        payloadKey: 'semanticRole',
        required: true,
        type: 'select',
      },
      {
        helperText: 'Value as the customer or marketplace sends it.',
        label: 'Customer value',
        payloadKey: 'matchValue',
        required: true,
      },
      {
        helperText: 'Standard value used for vendor matching.',
        label: 'Standard value',
        payloadKey: 'normalizedValue',
        required: true,
      },
      {
        advanced: true,
        defaultValue: 'EXACT',
        helperText: 'How the value should be matched.',
        label: 'Matching method',
        optionsKey: 'matchType',
        payloadKey: 'matchType',
        type: 'select',
      },
      ...commonTailFields,
    ],
    howToFill: [
      'Choose the value group such as Size or Color.',
      'Enter the customer value and the standard value the system should use.',
      'Leave Advanced unchanged unless the rule needs a narrower scope.',
    ],
    title: 'Value alias',
  },
  vendorRouting: {
    description: TAB_GUIDES.vendorRouting.description,
    fields: [
      ...commonScopeFields,
      {
        advanced: true,
        helperText: 'Leave empty to apply to every shop.',
        label: 'Shop',
        optionSource: 'shops',
        payloadKey: 'shopId',
        type: 'select',
      },
      {
        helperText: 'Internal product type this vendor priority applies to.',
        label: 'Internal product type',
        optionSource: 'productTypes',
        payloadKey: 'productTypeGroupId',
        required: true,
        type: 'select',
      },
      {
        helperText: 'Vendor to prefer for this scope.',
        label: 'Preferred vendor',
        optionSource: 'vendors',
        payloadKey: 'vendorId',
        required: true,
        type: 'select',
      },
      ...commonTailFields,
    ],
    howToFill: [
      'Choose the internal product type.',
      'Choose the vendor that should be preferred for matching orders.',
      'Use Advanced only when the rule should apply to one shop, channel, or marketplace.',
    ],
    title: 'Vendor routing rule',
  },
}

function getRuleFields(type) {
  return MAPPING_RULE_FORM_CONFIG[type]?.fields || []
}

function normalizeValue(value) {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined) return ''
  return String(value)
}

export function isMappingRuleFieldDisabled(field, editing) {
  return Boolean(editing && field.payloadKey === 'shopId')
}

export function buildMappingRuleInitialValues(type, rawRule = {}) {
  return Object.fromEntries(
    getRuleFields(type).map((field) => [
      field.payloadKey,
      normalizeValue(rawRule[field.payloadKey] ?? field.defaultValue ?? ''),
    ]),
  )
}

function parseValue(field, value) {
  if (field.type === 'csv') {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (field.type === 'number') {
    const nextValue = Number(value)
    return Number.isFinite(nextValue) ? nextValue : ''
  }
  return typeof value === 'string' ? value.trim() : value
}

export function buildMappingRulePayload(type, values = {}) {
  return getRuleFields(type).reduce((payload, field) => {
    const value = parseValue(field, values[field.payloadKey])

    if (Array.isArray(value)) {
      return value.length > 0 ? { ...payload, [field.payloadKey]: value } : payload
    }
    if (value === '' || value === null || value === undefined) {
      return payload
    }

    return { ...payload, [field.payloadKey]: value }
  }, {})
}

function labelFor(optionLabels, key, value, fallback) {
  const stringValue = normalizeValue(value).trim()
  if (!stringValue) return fallback
  return optionLabels?.[key]?.[stringValue] || stringValue
}

function firstCsvValue(value) {
  return (
    normalizeValue(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)[0] || ''
  )
}

function buildSkuSegmentChange(values = {}) {
  const segmentIndex = Number(values.segmentIndex)
  const safeIndex = Number.isFinite(segmentIndex) && segmentIndex >= 0 ? segmentIndex : 0
  const beforeSegment = firstCsvValue(values.appliesWhenValues) || 'Any value'
  const replacement = normalizeValue(values.replacementValue).trim()
  const action = normalizeValue(values.outputAction).trim()

  return {
    after: action === 'REMOVE_SEGMENT' ? 'Removed from SKU' : replacement || 'Replacement value',
    before: beforeSegment,
    label: `SKU segment ${safeIndex + 1}`,
  }
}

export function buildMappingRulePreview(type, values = {}, optionLabels = {}) {
  const channel = labelFor(
    optionLabels,
    'salesChannelCode',
    values.salesChannelCode,
    'selected channel',
  )
  const marketplace = labelFor(
    optionLabels,
    'marketplaceCode',
    values.marketplaceCode,
    'selected marketplace',
  )
  const scope = `${channel} / ${marketplace}`

  if (type === 'valueAliases') {
    const role = labelFor(optionLabels, 'semanticRole', values.semanticRole, 'selected value group')
    const match = normalizeValue(values.matchValue).trim() || 'customer value'
    const normalized = normalizeValue(values.normalizedValue).trim() || 'standard value'
    return {
      changes: [{ after: normalized, before: match, label: role }],
      description: `When customer value "${match}" for ${role} is found, mapping will use "${normalized}".`,
      scope,
      title: 'Preview',
    }
  }

  if (type === 'semanticRules') {
    const role = labelFor(optionLabels, 'semanticRole', values.semanticRole, 'selected meaning')
    const match = normalizeValue(values.matchValue).trim() || 'customer option label'
    const method = labelFor(optionLabels, 'matchType', values.matchType, 'selected matching method')
    return {
      changes: [{ after: role, before: match, label: 'Customer option label' }],
      description: `When the option label ${method.toLowerCase()} "${match}", mapping treats it as ${role}.`,
      scope,
      title: 'Preview',
    }
  }

  if (type === 'skuNormalize') {
    const action = labelFor(
      optionLabels,
      'outputAction',
      values.outputAction,
      'cleanup action',
    ).toLowerCase()
    const segment = normalizeValue(values.segmentIndex).trim() || 'selected'
    const value = normalizeValue(values.appliesWhenValues).trim()
    const segmentChange = buildSkuSegmentChange(values)
    return {
      changes: [segmentChange],
      description: `For ${marketplace} SKU, ${action} at segment ${segment}${value ? ` when value is "${value}"` : ''}.`,
      scope,
      title: 'Preview',
    }
  }

  if (type === 'skuConfig') {
    const configCode = normalizeValue(values.configCode).trim() || 'config code'
    const platformType =
      normalizeValue(values.platformProductType).trim() || 'marketplace product type'
    const productType = labelFor(
      optionLabels,
      'productTypeGroupId',
      values.productTypeGroupId,
      'internal product type',
    )
    const template = labelFor(
      optionLabels,
      'internalTemplateId',
      values.internalTemplateId,
      'selected template',
    )
    return {
      changes: [
        { after: productType, before: `${configCode} / ${platformType}`, label: 'Config match' },
        {
          after: values.internalTemplateId ? template : 'No template override',
          before: platformType,
          label: 'Template',
        },
      ],
      description: `Config code "${configCode}" maps "${platformType}" to ${productType}${values.internalTemplateId ? ` and ${template}` : ''}.`,
      scope,
      title: 'Preview',
    }
  }

  if (type === 'vendorRouting') {
    const productType = labelFor(
      optionLabels,
      'productTypeGroupId',
      values.productTypeGroupId,
      'selected product type',
    )
    const vendor = labelFor(optionLabels, 'vendorId', values.vendorId, 'selected vendor')
    return {
      changes: [
        { after: vendor, before: `${marketplace} / ${productType}`, label: 'Vendor choice' },
      ],
      description: `For ${marketplace} ${productType} orders, prefer ${vendor}.`,
      scope,
      title: 'Preview',
    }
  }

  return {
    changes: [],
    description: 'Complete the fields to preview how this rule will behave.',
    scope,
    title: 'Preview',
  }
}
