import { z } from 'zod'

const optionalText = z.string().trim().optional()
const requiredText = (message) => z.string().trim().min(1, message)
const optionalNumber = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z.number().nonnegative('vendors.validation.nonNegative').optional(),
)

export const vendorSchema = z.object({
  code: requiredText('vendors.validation.codeRequired'),
  name: requiredText('vendors.validation.nameRequired'),
  providerKey: optionalText,
  fulfillmentType: requiredText('vendors.validation.fulfillmentTypeRequired'),
  status: requiredText('vendors.validation.statusRequired'),
})

export const vendorDefaultValues = {
  code: '',
  name: '',
  providerKey: '',
  fulfillmentType: 'POD',
  status: 'ACTIVE',
}

export const vendorProductSchema = z.object({
  vendorId: requiredText('vendors.validation.vendorRequired'),
  productTypeGroupId: requiredText('vendors.validation.productTypeRequired'),
  code: requiredText('vendors.validation.codeRequired'),
  name: requiredText('vendors.validation.nameRequired'),
  externalProductId: optionalText,
  imageUrl: optionalText,
  productUrl: optionalText,
  designTemplateUrl: optionalText,
  minProductionDays: optionalNumber,
  maxProductionDays: optionalNumber,
  baseCostAmount: optionalNumber,
  currency: optionalText,
  status: requiredText('vendors.validation.statusRequired'),
})

export const vendorProductDefaultValues = {
  vendorId: '',
  productTypeGroupId: '',
  code: '',
  name: '',
  externalProductId: '',
  imageUrl: '',
  productUrl: '',
  designTemplateUrl: '',
  minProductionDays: '',
  maxProductionDays: '',
  baseCostAmount: '',
  currency: 'USD',
  status: 'ACTIVE',
}

export const vendorCostCenterSchema = z.object({
  code: requiredText('vendors.validation.codeRequired'),
  name: requiredText('vendors.validation.nameRequired'),
  sku: optionalText,
  lngCode: optionalText,
  vendorSize: optionalText,
  vendorColor: optionalText,
  standardSize: optionalText,
  standardColor: optionalText,
  baseCostAmount: optionalNumber,
  currency: optionalText,
  domesticEconomyAmount: optionalNumber,
  domesticAdditionalAmount: optionalNumber,
  internationalEconomyAmount: optionalNumber,
  internationalAdditionalAmount: optionalNumber,
  priorityEconomyAmount: optionalNumber,
  priorityAdditionalAmount: optionalNumber,
  importTaxAmount: optionalNumber,
  status: requiredText('vendors.validation.statusRequired'),
})

export const vendorCostCenterDefaultValues = {
  code: '',
  name: '',
  sku: '',
  lngCode: '',
  vendorSize: '',
  vendorColor: '',
  standardSize: '',
  standardColor: '',
  baseCostAmount: '',
  currency: 'USD',
  domesticEconomyAmount: '',
  domesticAdditionalAmount: '',
  internationalEconomyAmount: '',
  internationalAdditionalAmount: '',
  priorityEconomyAmount: '',
  priorityAdditionalAmount: '',
  importTaxAmount: '',
  status: 'ACTIVE',
}
